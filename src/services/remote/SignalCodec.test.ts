import { describe, expect, it } from 'vitest';
import { decodeRemoteSignal, encodeRemoteSignal } from './SignalCodec';
import type { RemoteAnswerSignal, RemoteOfferSignal } from './types';

const DATA_CHANNEL_SDP = [
  'v=0',
  'o=- 123456789 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  'a=ice-ufrag:party',
  'a=ice-pwd:partyplay-direct-controller',
  `a=fingerprint:sha-256 ${'AA:'.repeat(31)}AA`,
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=candidate:1 1 UDP 2122260223 192.168.1.10 54321 typ host',
  'a=end-of-candidates',
  '',
].join('\r\n');

describe('backend-free remote signal codec', () => {
  it('round-trips a compressed offer with its controller profile', async () => {
    const offer: RemoteOfferSignal = {
      version: 1,
      kind: 'offer',
      profile: {
        playerId: 2,
        playerName: 'Player 2',
        playerColor: '#08d9d6',
        gameId: 'dungeon-brawl',
        gameTitle: 'Dungeon Brawl',
        actions: ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'action', 'skill', 'pause'],
      },
      description: { type: 'offer', sdp: DATA_CHANNEL_SDP },
    };
    const encoded = await encodeRemoteSignal(offer);
    expect(encoded).toMatch(/^pp1d\./);
    expect(encoded.length).toBeLessThan(2_500);
    await expect(decodeRemoteSignal(encoded)).resolves.toEqual(offer);
  });

  it('round-trips an answer and rejects unrelated QR content', async () => {
    const answer: RemoteAnswerSignal = {
      version: 1,
      kind: 'answer',
      playerId: 1,
      description: { type: 'answer', sdp: DATA_CHANNEL_SDP.replace('actpass', 'active') },
    };
    await expect(decodeRemoteSignal(await encodeRemoteSignal(answer))).resolves.toEqual(answer);
    await expect(decodeRemoteSignal('https://example.com')).rejects.toThrow('not a PartyPlay pairing code');
  });
});
