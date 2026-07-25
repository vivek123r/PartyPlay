# BRIEFING — 2026-07-25T01:27:25Z

## Mission
Empirical adversarial verification of Milestone 4 (Requirement R4: UI & Visual FX Polish) for HOLLOW CLASH: SHADOW METROIDVANIA.

## 🔒 My Identity
- Archetype: EMPIRICAL CHALLENGER
- Roles: critic, specialist
- Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/challenger_m4
- Original parent: ef7a73b1-8f84-4bed-aaba-63e7e2de3a98
- Milestone: Milestone 4
- Instance: 1 of 1

## 🔒 Key Constraints
- Review and empirical stress-testing only — do NOT fix implementation code (report any failures as findings).
- Verification must be empirical: write and execute test scripts/harnesses, run build and existing test suites.

## Current Parent
- Conversation ID: ef7a73b1-8f84-4bed-aaba-63e7e2de3a98
- Updated: 2026-07-25T01:27:25Z

## Review Scope
- **Files to review**: UI components, HUD, Boss Health Bar, Parallax Cavern background math/rendering, soul vessel meter.
- **Verification points**:
  1. Cyan Soul Vessel Meter in Side HUD accurately reflects player Soul reserve (0 to 100) across soul gain and spending/healing.
  2. Top-Center Boss Health Bar stays fixed at top-center of viewport in screen space during camera panning from cameraX = 0 up to 480, and correctly transitions to enraged visual indicator when boss HP drops <= 300 (50%).
  3. Parallax Cavern wrap math functions cleanly for arbitrary camera offsets (including negative and large positive offsets up to cameraX = 480) without polygon distortion, coordinate overflow, or seam artifacts.

## Attack Surface
- **Hypotheses tested**: TBD
- **Vulnerabilities found**: TBD
- **Untested angles**: TBD

## Loaded Skills
- None

## Key Decisions Made
- Initialized briefing and request tracker.

## Artifact Index
- ORIGINAL_REQUEST.md — Original request description
- BRIEFING.md — Persistent briefing state
