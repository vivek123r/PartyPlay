# Dungeon Brawl asset sources

This directory contains only the runtime subset selected from
`/home/viv/Projects/Assets`.

Every curated runtime copy now uses the semantic
`subject--action--variant-or-layout.png` naming convention. Animation sheet
names include `sheet-{frame count}x{frame width}x{frame height}`. See
`ASSET_CATALOG.json` for AI-readable identities, runtime keys, gameplay uses,
and class effect mappings. The original asset dump is intentionally untouched.

- Player units, particles, and HUD pieces: `Tiny Swords (Free Pack)`.
- Orc: `Tiny RPG Character Asset Pack 01 v2.0 -Free Soldier&Orc`.
- Demon: `Tiny RPG Character Asset Pack 02 -Free Demon_A&Blood Monster_A`.
- Dungeon tiles, objects, mummy, slime, ogre, ghost, bosses, and combat effects:
  `Legacy Collection` by Ansimuz. The supplied `public-license.pdf` identifies
  this collection as CC0.
- The class-specific bolt, pulse, charge, shadow trail, spark, impact, and
  ground-rupture sheets are also from the CC0 `Legacy Collection`.
- Ruins and crystals: Craftpix free top-down ruins/crystals packs. Their
  supplied license files point to <https://craftpix.net/file-licenses/>.
- HUD/loot icon atlas: Craftpix free basic fantasy UI icons pack.

The supplied Tiny Swords and Tiny RPG archives did not contain a license file.
They are marked here as license-unverified and should be checked before a
public/commercial distribution. This does not affect local development.

- Dungeon Brawl sound effects: copied from the user-provided `sound affects/All sounds`
  folder and renamed semantically under `audio/`. Their license/redistribution terms
  were not included in the dump, so verify them before publishing the game.
