export const RELIC_RUSH_CONFIG = {
  // Virtual Canvas Resolution
  VIRTUAL_WIDTH: 480,
  VIRTUAL_HEIGHT: 270,

  // Player Physics Parameters
  PLAYER: {
    WIDTH: 14,
    HEIGHT: 18,
    BASE_SPEED: 140, // px/s
    ACCEL: 1100, // px/s²
    FRICTION: 1200, // px/s²
    JUMP_SPEED: -260, // px/s
    GRAVITY: 750, // px/s²
    MAX_FALL_SPEED: 320, // px/s
    WALL_SLIDE_SPEED: 50, // px/s
    WALL_JUMP_VX: 160, // px/s
    WALL_JUMP_VY: -230, // px/s
    SWIM_SPEED: 90, // px/s
    THROW_VX: 220, // px/s
    THROW_VY: -110, // px/s
  },

  // Chamber Layout Rules
  LANE_HEIGHT: 55, // Height of each horizontal player chamber
  MAX_LANES: 4,

  // World Presets
  WORLDS: [
    {
      id: 'sun_temple',
      name: 'Sun Temple',
      bgColor: 0x1f170f,
      wallColor: 0xf4d160,
      accentColor: 0xe67e22,
      hazardColor: 0xd35400,
    },
    {
      id: 'jungle',
      name: 'Overgrown Jungle',
      bgColor: 0x0a1f12,
      wallColor: 0x00b894,
      accentColor: 0x55efc4,
      hazardColor: 0x006266,
    },
    {
      id: 'sunken_castle',
      name: 'Sunken Castle',
      bgColor: 0x081526,
      wallColor: 0x0984e3,
      accentColor: 0x74b9ff,
      hazardColor: 0x093c76,
    },
    {
      id: 'ice_cave',
      name: 'Crystal Ice Cave',
      bgColor: 0x071b29,
      wallColor: 0x00cec9,
      accentColor: 0x81ecec,
      hazardColor: 0x00838f,
    },
    {
      id: 'volcano',
      name: 'Magma Volcano',
      bgColor: 0x240909,
      wallColor: 0xd63031,
      accentColor: 0xff7675,
      hazardColor: 0x801010,
    },
    {
      id: 'sky_temple',
      name: 'Sky Temple',
      bgColor: 0x121d33,
      wallColor: 0xdfe6e9,
      accentColor: 0x74b9ff,
      hazardColor: 0x0984e3,
    },
    {
      id: 'haunted_mine',
      name: 'Haunted Mine',
      bgColor: 0x161124,
      wallColor: 0x6c5ce7,
      accentColor: 0xa29bfe,
      hazardColor: 0x3c2d82,
    },
    {
      id: 'ancient_abyss',
      name: 'Ancient Abyss',
      bgColor: 0x0d071a,
      wallColor: 0xa55eea,
      accentColor: 0xd6a2e8,
      hazardColor: 0x582980,
    },
  ],
};
