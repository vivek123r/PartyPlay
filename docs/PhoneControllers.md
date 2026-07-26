# Backend-free phone controllers

PartyPlay can pair a phone to a player slot without a signaling backend. The
host and phone exchange their complete WebRTC descriptions through two QR
codes, then send input directly over an unreliable, unordered RTCDataChannel.

## Pairing

1. Open a game's ready room and switch a player card from **Keyboard** to
   **Phone**.
2. Select **Show pairing QR**.
3. Scan the host QR with the phone's normal camera application. It opens the
   same deployed PartyPlay site at `#/remote`.
4. The phone displays an answer QR.
5. On the host choose **Phone is showing answer** and scan the phone using the
   host's camera.
6. When both screens show connected, start the game.

The host camera scanner requires an HTTPS deployment (or localhost during
development). The phone and host should be on the same non-isolated Wi-Fi
network. If pairing is unavailable, switch the player card back to Keyboard.

## Technical notes

- `RTCPeerConnection` is configured with `iceServers: []`; there is no STUN,
  TURN, signaling server, database, or controller relay.
- SDP and local ICE candidates are gathered before each QR is generated,
  compressed with DEFLATE, and encoded as URL-safe text.
- The channel uses `{ ordered: false, maxRetransmits: 0 }`.
- Phones send full semantic button snapshots at 30 Hz. Missing heartbeats clear
  held buttons and mark the player as reconnecting.
- Connections are game-specific. Pair again after changing to a game with a
  different controller layout.
