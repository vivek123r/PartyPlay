import type { InputDevice } from '@services/input/types';
import { decodeRemoteSignal, encodeRemoteSignal, waitForIceGatheringComplete } from './SignalCodec';
import {
  REMOTE_PROTOCOL_VERSION,
  type RemoteAnswerSignal,
  type RemoteConnectionStatus,
  type RemoteCompanionPacket,
  type RemoteCompanionMetric,
  type RemoteCompanionView,
  type RemoteControllerProfile,
  type RemoteControllerSnapshot,
  type RemoteInputPacket,
  type RemoteOfferSignal,
  type RemoteSlotSnapshot,
} from './types';

const INPUT_CHANNEL = 'partyplay-input-v1';
const INPUT_STALE_MS = 750;
const PLAYER_LIMIT = 4;
const COMPANION_PACKET_LIMIT = 8192;
const MAX_COMPANION_METRICS = 8;
const MAX_COMPANION_DETAILS = 8;

interface HostSlot {
  playerId: number;
  status: RemoteConnectionStatus;
  profile?: RemoteControllerProfile;
  connection?: RTCPeerConnection;
  channel?: RTCDataChannel;
  buttons: Set<string>;
  allowedActions: Set<string>;
  lastInputAt: number;
  lastSequence: number;
  generation: number;
  companionView: RemoteCompanionView | null;
  error?: string;
}

const isNewerSequence = (next: number, previous: number): boolean => {
  if (previous < 0) return true;
  const difference = (next - previous + 65_536) % 65_536;
  return difference > 0 && difference < 32_768;
};

const parseInputPacket = (value: unknown): RemoteInputPacket | null => {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const parsed = JSON.parse(value) as Partial<RemoteInputPacket>;
    if (parsed.version !== REMOTE_PROTOCOL_VERSION || !Number.isInteger(parsed.sequence) || !Array.isArray(parsed.buttons)) return null;
    if (parsed.sequence! < 0 || parsed.sequence! > 65_535 || parsed.buttons.length > 64) return null;
    if (!parsed.buttons.every(button => typeof button === 'string' && button.length <= 64)) return null;
    return parsed as RemoteInputPacket;
  } catch {
    return null;
  }
};

const isShortText = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.length <= maximum;

const normalizeCompanionView = (value: unknown): RemoteCompanionView | null | undefined => {
  if (value === null) return null;
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<RemoteCompanionView>;
  if (!isShortText(candidate.title, 96)) return undefined;
  if (candidate.subtitle !== undefined && !isShortText(candidate.subtitle, 180)) return undefined;
  if (candidate.metrics !== undefined && (!Array.isArray(candidate.metrics) || candidate.metrics.length > MAX_COMPANION_METRICS)) return undefined;
  if (candidate.details !== undefined && (!Array.isArray(candidate.details) || candidate.details.length > MAX_COMPANION_DETAILS)) return undefined;

  const metrics = candidate.metrics?.map((metric) => {
    if (!metric || typeof metric !== 'object') return undefined;
    const item = metric as { label?: unknown; value?: unknown; tone?: unknown };
    if (!isShortText(item.label, 40) || !isShortText(item.value, 72)) return undefined;
    if (item.tone !== undefined && !['neutral', 'positive', 'warning', 'danger'].includes(String(item.tone))) return undefined;
    return { label: item.label, value: item.value, ...(item.tone ? { tone: item.tone as RemoteCompanionMetric['tone'] } : {}) };
  });
  if (metrics?.some((metric) => !metric)) return undefined;
  if (candidate.details?.some((detail) => !isShortText(detail, 180))) return undefined;
  return {
    title: candidate.title,
    ...(candidate.subtitle ? { subtitle: candidate.subtitle } : {}),
    ...(metrics?.length ? { metrics: metrics as NonNullable<RemoteCompanionView['metrics']> } : {}),
    ...(candidate.details?.length ? { details: [...candidate.details] } : {}),
  };
};

const parseCompanionPacket = (value: unknown): RemoteCompanionView | null | undefined => {
  if (typeof value !== 'string' || value.length > COMPANION_PACKET_LIMIT) return undefined;
  try {
    const packet = JSON.parse(value) as Partial<RemoteCompanionPacket>;
    if (packet.version !== REMOTE_PROTOCOL_VERSION || packet.kind !== 'companion') return undefined;
    return normalizeCompanionView(packet.view);
  } catch {
    return undefined;
  }
};

export class RemoteControllerService {
  private readonly slots = new Map<number, HostSlot>();
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private snapshot: RemoteControllerSnapshot = { revision: 0, slots: {} };
  private heartbeatTimer: number | null = null;

  public constructor() {
    for (let playerId = 1; playerId <= PLAYER_LIMIT; playerId++) {
      this.slots.set(playerId, {
        playerId,
        status: 'idle',
        buttons: new Set(),
        allowedActions: new Set(),
        lastInputAt: 0,
        lastSequence: -1,
        generation: 0,
        companionView: null,
      });
    }
    if (typeof window !== 'undefined') {
      this.heartbeatTimer = window.setInterval(() => this.checkHeartbeats(), 250);
    }
    this.publish();
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): RemoteControllerSnapshot => this.snapshot;

  public getSlot(playerId: number): RemoteSlotSnapshot {
    return this.snapshot.slots[playerId] ?? {
      playerId,
      status: 'idle',
      lastInputAt: 0,
    };
  }

  public createInputDevice(playerId: number): InputDevice {
    return new RemoteInputDevice(playerId, this);
  }

  public poll(playerId: number): Map<string, boolean> {
    const slot = this.slots.get(playerId);
    const output = new Map<string, boolean>();
    if (!slot || slot.status !== 'connected') return output;
    slot.buttons.forEach(button => output.set(button, true));
    return output;
  }

  /** Sends a private, display-only view to one already-paired phone. The latest view is retained
   * and re-sent whenever that channel opens, so games may safely publish before connection. */
  public publishCompanionView(playerId: number, view: RemoteCompanionView | null): void {
    const slot = this.requireSlot(playerId);
    const normalized = normalizeCompanionView(view);
    if (normalized === undefined) throw new Error('Companion views must contain short, serializable title, metrics, and details fields.');
    slot.companionView = normalized;
    this.sendCompanionView(slot);
  }

  public async createOffer(profile: RemoteControllerProfile): Promise<string> {
    const slot = this.requireSlot(profile.playerId);
    this.closeTransport(slot);
    const generation = ++slot.generation;
    slot.profile = profile;
    slot.companionView = null;
    slot.allowedActions = new Set(profile.actions);
    slot.status = 'creating-offer';
    slot.error = undefined;
    this.publish();
    try {
      const connection = new RTCPeerConnection({ iceServers: [] });
      const channel = connection.createDataChannel(INPUT_CHANNEL, { ordered: false, maxRetransmits: 0 });
      slot.connection = connection;
      slot.channel = channel;
      this.bindHostTransport(slot, connection, channel);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await waitForIceGatheringComplete(connection);
      if (slot.generation !== generation) throw new DOMException('Pairing was replaced.', 'AbortError');
      if (!connection.localDescription) throw new Error('The browser did not create an offer.');
      const signal: RemoteOfferSignal = {
        version: REMOTE_PROTOCOL_VERSION,
        kind: 'offer',
        profile,
        description: connection.localDescription.toJSON(),
      };
      slot.status = 'awaiting-answer';
      this.publish();
      return encodeRemoteSignal(signal);
    } catch (error) {
      if (slot.generation !== generation) throw error;
      slot.status = 'error';
      slot.error = error instanceof Error ? error.message : String(error);
      this.publish();
      throw error;
    }
  }

  public async acceptAnswer(playerId: number, encodedAnswer: string): Promise<void> {
    const slot = this.requireSlot(playerId);
    if (!slot.connection) throw new Error('Create a phone offer before scanning its answer.');
    const signal = await decodeRemoteSignal(encodedAnswer);
    if (signal.kind !== 'answer') throw new Error('The scanned QR contains an offer, not a phone answer.');
    if (signal.playerId !== playerId) throw new Error(`This answer belongs to Player ${signal.playerId}.`);
    slot.status = 'connecting';
    slot.error = undefined;
    this.publish();
    await slot.connection.setRemoteDescription(signal.description);
  }

  public disconnect(playerId: number): void {
    const slot = this.requireSlot(playerId);
    slot.generation++;
    this.closeTransport(slot);
    slot.status = 'idle';
    slot.profile = undefined;
    slot.companionView = null;
    slot.allowedActions.clear();
    slot.error = undefined;
    this.publish();
  }

  public destroy(): void {
    for (const slot of this.slots.values()) {
      slot.generation++;
      this.closeTransport(slot);
      slot.status = 'idle';
      slot.companionView = null;
    }
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.listeners.clear();
    this.publish();
  }

  private requireSlot(playerId: number): HostSlot {
    const slot = this.slots.get(playerId);
    if (!slot) throw new Error(`Player ${playerId} is outside the supported controller range.`);
    return slot;
  }

  private bindHostTransport(slot: HostSlot, connection: RTCPeerConnection, channel: RTCDataChannel): void {
    channel.addEventListener('open', () => {
      slot.status = 'connected';
      slot.lastInputAt = performance.now();
      slot.lastSequence = -1;
      slot.buttons.clear();
      this.sendCompanionView(slot);
      this.publish();
    });
    channel.addEventListener('message', (event) => {
      const packet = parseInputPacket(event.data);
      if (!packet || !isNewerSequence(packet.sequence, slot.lastSequence)) return;
      slot.lastSequence = packet.sequence;
      slot.lastInputAt = performance.now();
      slot.buttons = new Set(packet.buttons.filter(button => slot.allowedActions.has(button)));
      if (slot.status !== 'connected') {
        slot.status = 'connected';
        this.publish();
      }
    });
    channel.addEventListener('close', () => {
      slot.buttons.clear();
      if (slot.status !== 'idle') slot.status = 'reconnecting';
      this.publish();
    });
    channel.addEventListener('error', () => {
      slot.buttons.clear();
      slot.status = 'error';
      slot.error = 'The phone input channel failed.';
      this.publish();
    });
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState === 'connected') {
        slot.status = 'connected';
        slot.error = undefined;
      } else if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        slot.buttons.clear();
        slot.status = 'reconnecting';
      } else if (connection.connectionState === 'closed' && slot.status !== 'idle') {
        slot.buttons.clear();
        slot.status = 'reconnecting';
      }
      this.publish();
    });
  }

  private checkHeartbeats(): void {
    const now = performance.now();
    let changed = false;
    for (const slot of this.slots.values()) {
      if (slot.status !== 'connected' || now - slot.lastInputAt <= INPUT_STALE_MS) continue;
      slot.buttons.clear();
      slot.status = 'reconnecting';
      changed = true;
    }
    if (changed) this.publish();
  }

  private sendCompanionView(slot: HostSlot): void {
    if (!slot.channel || slot.channel.readyState !== 'open') return;
    const packet: RemoteCompanionPacket = {
      version: REMOTE_PROTOCOL_VERSION,
      kind: 'companion',
      view: slot.companionView,
    };
    const encoded = JSON.stringify(packet);
    if (encoded.length <= COMPANION_PACKET_LIMIT) slot.channel.send(encoded);
  }

  private closeTransport(slot: HostSlot): void {
    slot.buttons.clear();
    slot.channel?.close();
    slot.connection?.close();
    slot.channel = undefined;
    slot.connection = undefined;
    slot.lastSequence = -1;
    slot.lastInputAt = 0;
  }

  private publish(): void {
    this.revision++;
    const slots: Record<number, RemoteSlotSnapshot> = {};
    for (const slot of this.slots.values()) {
      slots[slot.playerId] = {
        playerId: slot.playerId,
        status: slot.status,
        profile: slot.profile,
        lastInputAt: slot.lastInputAt,
        error: slot.error,
      };
    }
    this.snapshot = { revision: this.revision, slots };
    this.listeners.forEach(listener => listener());
  }
}

class RemoteInputDevice implements InputDevice {
  public readonly id: string;
  public readonly type = 'remote' as const;
  private readonly playerId: number;
  private readonly service: RemoteControllerService;

  public constructor(playerId: number, service: RemoteControllerService) {
    this.id = `remote-player-${playerId}`;
    this.playerId = playerId;
    this.service = service;
  }

  public poll(): Map<string, boolean> {
    return this.service.poll(this.playerId);
  }

  public enable(): void {}
  public disable(): void {}
}

export class RemotePhoneClient {
  public readonly profile: RemoteControllerProfile;
  private readonly connection: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private buttons = new Set<string>();
  private companionView: RemoteCompanionView | null = null;
  private sequence = 0;
  private sendTimer: number | null = null;
  private state: RemoteConnectionStatus = 'connecting';
  private readonly stateListeners = new Set<(state: RemoteConnectionStatus) => void>();
  private readonly companionListeners = new Set<(view: RemoteCompanionView | null) => void>();

  private constructor(profile: RemoteControllerProfile, connection: RTCPeerConnection) {
    this.profile = profile;
    this.connection = connection;
  }

  public static async answerOffer(encodedOffer: string): Promise<{ client: RemotePhoneClient; answer: string }> {
    const signal = await decodeRemoteSignal(encodedOffer);
    if (signal.kind !== 'offer') throw new Error('The invitation does not contain a host offer.');
    const connection = new RTCPeerConnection({ iceServers: [] });
    const client = new RemotePhoneClient(signal.profile, connection);
    connection.addEventListener('datachannel', (event) => {
      if (event.channel.label !== INPUT_CHANNEL) return;
      client.bindChannel(event.channel);
    });
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState === 'connected') client.setState('connected');
      else if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') client.setState('reconnecting');
      else if (connection.connectionState === 'closed') client.setState('idle');
    });
    await connection.setRemoteDescription(signal.description);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await waitForIceGatheringComplete(connection);
    if (!connection.localDescription) throw new Error('The phone could not create an answer.');
    const answerSignal: RemoteAnswerSignal = {
      version: REMOTE_PROTOCOL_VERSION,
      kind: 'answer',
      playerId: signal.profile.playerId,
      description: connection.localDescription.toJSON(),
    };
    return { client, answer: await encodeRemoteSignal(answerSignal) };
  }

  public subscribe(listener: (state: RemoteConnectionStatus) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  /** Subscribe to the private display-only payload published by this phone's host slot. */
  public subscribeCompanion(listener: (view: RemoteCompanionView | null) => void): () => void {
    this.companionListeners.add(listener);
    listener(this.companionView);
    return () => this.companionListeners.delete(listener);
  }

  public setPressed(action: string, pressed: boolean): void {
    if (!this.profile.actions.includes(action)) return;
    if (pressed) this.buttons.add(action);
    else this.buttons.delete(action);
    this.sendSnapshot();
  }

  public releaseAll(): void {
    this.buttons.clear();
    this.sendSnapshot();
  }

  public destroy(): void {
    this.releaseAll();
    if (this.sendTimer !== null) window.clearInterval(this.sendTimer);
    this.sendTimer = null;
    this.channel?.close();
    this.connection.close();
    this.channel = null;
    this.setCompanionView(null);
    this.setState('idle');
  }

  private bindChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.addEventListener('open', () => {
      this.setState('connected');
      this.sendSnapshot();
      if (this.sendTimer !== null) window.clearInterval(this.sendTimer);
      this.sendTimer = window.setInterval(() => this.sendSnapshot(), 1000 / 30);
    });
    channel.addEventListener('close', () => this.setState('reconnecting'));
    channel.addEventListener('error', () => this.setState('error'));
    channel.addEventListener('message', (event) => {
      const view = parseCompanionPacket(event.data);
      if (view !== undefined) this.setCompanionView(view);
    });
  }

  private sendSnapshot(): void {
    if (!this.channel || this.channel.readyState !== 'open') return;
    const packet: RemoteInputPacket = {
      version: REMOTE_PROTOCOL_VERSION,
      sequence: this.sequence,
      buttons: [...this.buttons],
    };
    this.sequence = (this.sequence + 1) % 65_536;
    this.channel.send(JSON.stringify(packet));
  }

  private setState(state: RemoteConnectionStatus): void {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach(listener => listener(state));
  }

  private setCompanionView(view: RemoteCompanionView | null): void {
    this.companionView = view;
    this.companionListeners.forEach(listener => listener(view));
  }
}

export const remoteControllerService = new RemoteControllerService();
