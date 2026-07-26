# Driftspire: Festival of Guilds

Driftspire is PartyPlay's 2–4 player social-strategy board game. A match lasts six rounds across
three Acts. Players use deterministic Route cards to travel through a floating city, co-fund
ventures, complete Commissions, negotiate Pacts, vote on Ordinances, and earn Renown.

## Controls

- Up/Down: browse Route cards, actions, Pact types, or Council proposals.
- Left/Right: choose direction, options, partners, or Favor bids.
- Action: confirm, accept a Pact, or lock a Showcase attempt.
- Alternate: change Route distance, cancel a Pact proposal, or decline a Pact.
- Escape: pause.

Every keyboard layout exposes the same named actions to paired phone controllers.

## Match flow

1. Each player drafts one of six soft-asymmetry guilds.
2. Every round, players act from lowest to highest Renown.
3. A turn plays one Route card, moves around the current district ring, and performs one action.
4. Spotlight venture types pay contributors after all players act.
5. Every second round ends in Council, a district shift, and a simultaneous Showcase.
6. The third Showcase and tiered Ambitions produce final standings.

There is no rent, bankruptcy, player elimination, skipped turn, or destructive ownership loss.

## Architecture

- `content.ts` contains the data-driven guild, district, Commission, Ambition, Ordinance,
  Spotlight, and Showcase definitions.
- `rules.ts` owns deterministic, serializable match state. It has no PixiJS dependency.
- `index.ts` adapts PartyPlay input and services to the rules engine and renders the board in
  PixiJS.
- `DriftspireRules.test.ts` covers seeded determinism, player-count scaling, Pacts, complete
  match progression, resource invariants, and save validation.

Autosaves use the game-scoped PartyPlay storage namespace and are accepted only when their schema
and player roster match the current session.

