import type { RemoteSignal } from './types';
import { REMOTE_PROTOCOL_VERSION } from './types';
import { deflateSync, inflateSync } from 'fflate';

const COMPRESSED_PREFIX = 'pp1d.';

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const isRemoteSignal = (value: unknown): value is RemoteSignal => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RemoteSignal>;
  if (candidate.version !== REMOTE_PROTOCOL_VERSION) return false;
  if (candidate.kind !== 'offer' && candidate.kind !== 'answer') return false;
  return Boolean(candidate.description?.type && candidate.description?.sdp);
};

export async function encodeRemoteSignal(signal: RemoteSignal): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(signal));
  const compressed = deflateSync(bytes, { level: 9 });
  return `${COMPRESSED_PREFIX}${toBase64Url(compressed)}`;
}

export async function decodeRemoteSignal(encoded: string): Promise<RemoteSignal> {
  const trimmed = encoded.trim();
  if (!trimmed.startsWith(COMPRESSED_PREFIX)) throw new Error('This is not a PartyPlay pairing code.');
  const compressed = fromBase64Url(trimmed.slice(COMPRESSED_PREFIX.length));
  const bytes = inflateSync(compressed);
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!isRemoteSignal(parsed)) throw new Error('The pairing code is invalid or unsupported.');
  return parsed;
}

export async function waitForIceGatheringComplete(
  connection: RTCPeerConnection,
  timeoutMs = 10_000,
): Promise<void> {
  if (connection.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      connection.removeEventListener('icegatheringstatechange', onStateChange);
      window.clearTimeout(timeout);
      resolve();
    };
    const onStateChange = () => {
      if (connection.iceGatheringState === 'complete') finish();
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    connection.addEventListener('icegatheringstatechange', onStateChange);
  });
}
