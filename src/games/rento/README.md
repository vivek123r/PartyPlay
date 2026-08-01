# Rento deterministic core

Rento is a self-contained 1–4 player property/economy board game. The rules layer does not
import PixiJS, browser storage, networking, clocks, or remote services. Given the same match
options and intent stream it produces the same state and command log.

## Integration

Create a match with `RentoRules.create(options)`, render `rules.state`, and submit all keyboard,
pointer, phone, bot, and replay actions through `rules.dispatch(intent)`. Use
`legalActionKinds(playerId)` to drive contextual controls. A roll resolves movement and its
landing synchronously; `state.lastMove.path` contains the positions a presentation layer should
animate before displaying the resulting `propertyDecision`, `auction`, or `turnActions` phase.

The public selectors `activePlayer`, `currentTile`, `property`, `propertyPurchasePrice`,
`propertyUpgradeCost`, `rentFor`, `netWorth`, `standings`, and `winnerIds` keep UI calculations
consistent with the reducer.

## Determinism and private data

- `state.commandLog` is the canonical replay stream.
- `createReplayEnvelope` and `replayRentoCommands` rebuild a match without stored snapshots.
- `createSaveEnvelope`, `parseSaveEnvelope`, and `restoreRentoRules` provide versioned persistence.
- Hidden missions live on each player state. A shared-screen or network adapter must redact every
  other player's mission before sending a private snapshot.
- Phone and AI actions are untrusted intents. Only `dispatch` may mutate authoritative state.

## Match flow

Phases are `awaitingRoll`, `propertyDecision`, `turnActions`, `auction`, `tradeResponse`, and
`finished`. Net Worth mode ends after 20, 30, or 40 completed rounds. Bankruptcy mode ends when
one of two or more players remains solvent. A single-player bankruptcy match continues as an
open-ended sandbox unless its host supplies an external end condition.

The 32-tile board contains 24 properties across six districts plus Start, Bank, Real Estate
Market, Premium Auction, Fortune Wheel, Event, Tax, and Teleport tiles. Content definitions are
data-driven in `content.ts`; no runtime asset or network request is required.

## PartyPlay cartridge

`index.ts` is the host-authoritative Pixi cartridge. It supplies keyboard, pointer, direct-phone,
and deterministic bot adapters without moving any rule into the renderer. Left/right chooses an
action, up/down inspects the selected portfolio item, Action confirms, and Alternate returns.
Versioned local saves are restored only when the configured player IDs still match.

When a player uses the direct phone controller, the cartridge publishes that player's own hidden
mission and portfolio summary through `publishCompanionView`. The payload is display-only and
travels over the already-established local WebRTC data channel; there is no signaling backend,
STUN, TURN, account, analytics, font CDN, or other runtime service.
