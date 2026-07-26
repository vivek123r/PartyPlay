/**
 * Single authority for turbo-rider's pixel-absolute art. Most of the render pipeline is already
 * parameterised on `viewW`/`viewH` (ProjectionEngine, SceneryLibrary) and needs nothing here — but
 * a few modules draw in hardcoded pixel units and have no access to the live viewport
 * (VehicleSprites' detail-LOD thresholds, BikeSprite's fixed-size player tag, Skybox's absolute
 * layout literals, EnvironmentFX's particle sizing). Those read `PIXEL_SCALE` instead.
 *
 * `PIXEL_SCALE` is `viewW / 480` — 1 at the legacy resolution, 2 at turbo-rider's native 960x540.
 * Call `setPixelScale()` once, from `TurboRiderGame.init()`, before anything renders.
 */
export let PIXEL_SCALE = 1;

export function setPixelScale(viewW: number): void {
  PIXEL_SCALE = viewW / 480;
}

/**
 * Reference viewport height the local player's bike (and, via the same ratio, opponent bikes) is
 * sized against — see `TurboRiderGame.bikeScreenPose` and `ProjectionEngine.renderViewportRoad`'s
 * `baseBikeScale`. This is a FIXED screen-fraction constant, not the live viewport: it equals the
 * legacy 2-player viewport height (270 / 2) so `viewH / BIKE_SCALE_REF_VIEW_H` keeps evaluating to
 * 1.0 at 2-player and preserves the bike's on-screen size fraction at any canvas resolution.
 * Do NOT replace this with a read of the current viewport — that would make the bike shrink/grow
 * as the platform's base resolution changes instead of just gaining pixel density.
 */
export const BIKE_SCALE_REF_VIEW_H = 135;
