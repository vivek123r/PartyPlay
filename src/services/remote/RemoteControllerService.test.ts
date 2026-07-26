import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeRemoteSignal } from './SignalCodec';
import { RemoteControllerService } from './RemoteControllerService';
import type { RemoteAnswerSignal } from './types';

class FakeDataChannel extends EventTarget {
  public readonly label = 'partyplay-input-v1';
  public readyState: RTCDataChannelState = 'connecting';

  public send(): void {}

  public close(): void {
    this.readyState = 'closed';
    this.dispatchEvent(new Event('close'));
  }

  public open(): void {
    this.readyState = 'open';
    this.dispatchEvent(new Event('open'));
  }

  public receive(data: string): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

class FakePeerConnection extends EventTarget {
  public static latest: FakePeerConnection | null = null;
  public readonly channel = new FakeDataChannel();
  public readonly connectionState: RTCPeerConnectionState = 'new';
  public readonly iceGatheringState: RTCIceGatheringState = 'complete';
  public localDescription: RTCSessionDescription | null = null;
  public remoteDescription: RTCSessionDescription | null = null;
  public dataChannelOptions: RTCDataChannelInit | undefined;

  public constructor() {
    super();
    FakePeerConnection.latest = this;
  }

  public createDataChannel(_label: string, options?: RTCDataChannelInit): RTCDataChannel {
    this.dataChannelOptions = options;
    return this.channel as unknown as RTCDataChannel;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' };
  }

  public async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = { ...description, toJSON: () => description } as RTCSessionDescription;
  }

  public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = { ...description, toJSON: () => description } as RTCSessionDescription;
  }

  public close(): void {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakePeerConnection.latest = null;
});

describe('RemoteControllerService', () => {
  it('creates the required unreliable channel and exposes semantic button snapshots', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const service = new RemoteControllerService();
    const offer = await service.createOffer({
      playerId: 1,
      playerName: 'Player 1',
      playerColor: '#ff2e63',
      gameId: 'dungeon-brawl',
      gameTitle: 'Dungeon Brawl',
      actions: ['moveLeft', 'action'],
    });
    expect(offer).toMatch(/^pp1d\./);
    expect(FakePeerConnection.latest?.dataChannelOptions).toEqual({ ordered: false, maxRetransmits: 0 });

    const answer: RemoteAnswerSignal = {
      version: 1,
      kind: 'answer',
      playerId: 1,
      description: { type: 'answer', sdp: 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' },
    };
    await service.acceptAnswer(1, await encodeRemoteSignal(answer));
    const channel = FakePeerConnection.latest!.channel;
    channel.open();
    channel.receive(JSON.stringify({ version: 1, sequence: 1, buttons: ['moveLeft', 'notAllowed'] }));
    expect(service.poll(1)).toEqual(new Map([['moveLeft', true]]));

    channel.receive(JSON.stringify({ version: 1, sequence: 0, buttons: ['action'] }));
    expect(service.poll(1)).toEqual(new Map([['moveLeft', true]]));
    service.destroy();
  });
});
