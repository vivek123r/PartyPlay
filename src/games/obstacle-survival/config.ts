export const GAME_CONFIG = {
  BASE_PLAYER_RADIUS: 8,        // Smaller for 480x270
  PLAYER_SPEED: 180,            // Snappy base speed (2x = 360 px/s, 3x = 540 px/s!)
  BASE_OBSTACLE_SPEED: 85,      // Smooth scroll speed
  OBSTACLE_HEIGHT: 12,          // Pixel-sized
  SPAWN_INTERVAL: 1.6,          // Fair vertical spacing
  GAP_WIDTH_FACTOR: 4.5,        // Generous gap width
};

export const HAZARD_CONFIG = {
  LASER_TELEGRAPH_TIME: 1.2,  // 1.2s fair warning before beam fires
  LASER_BEAM_DURATION: 1.2,   // Active beam duration
  PROJECTILE_SPEED: 75,       // Fair horizontal speed for reaction time
  FRAGILE_BREAK_DELAY: 0.9,   // Generous 0.9s before fragile block breaks
};
