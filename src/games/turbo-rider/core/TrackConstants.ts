// Shared metric constants used by both gameplay (core/) and rendering (render/).
// Keeping them in one place is what keeps world units, collision boxes and
// pixel scale in agreement — see the projection math in render/ProjectionEngine.ts.

export const ROAD_HALF_WIDTH_METERS = 4.4;
export const SEGMENT_LENGTH_METERS = 6;

export const BIKE_WIDTH_METERS = 0.8;
export const BIKE_LENGTH_METERS = 1.7;
export const BIKE_HEIGHT_METERS = 1.5;
