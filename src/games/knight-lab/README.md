# Animation Lab

This folder is the home for reusable character-animation experiments. It is
presented in the platform as a developer tool rather than a normal game.

## Modules

- `KnightAnimationLibrary.ts` — loads and slices the supplied Knight sheets.
- `KnightActor.ts` — reusable sprite actor and frame playback.
- `index.ts` — Animation Lab shell, module picker, training room, and debug HUD.
- `manifest.ts` — registers the lab in the platform browser.

Future character tests should add a module inside this folder and a new option
to the lab picker without changing the platform game runtime.
