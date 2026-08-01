/** Visual language for Rento's fictional metropolitan board. */
export const RENT0_THEME = {
  ink: 0xf7f2df,
  muted: 0xa9b6c6,
  night: 0x061221,
  navy: 0x0b2138,
  panel: 0x102b46,
  panelDark: 0x071827,
  line: 0x4b7696,
  gold: 0xffc84a,
  goldDark: 0x936019,
  cyan: 0x4fe4ff,
  emerald: 0x5ce3a0,
  danger: 0xff597a,
  violet: 0xa87bff,
  road: 0x26323d,
  roadLine: 0xb7a579,
  districts: [0x36b9ff, 0x55d68a, 0xee8d4f, 0xb986ff, 0xf1cc45, 0xe75c92],
  players: [0x40d7ff, 0xffc349, 0xf46695, 0x72e39b],
} as const;

export type RentoTheme = typeof RENT0_THEME;

export const RENT0_TEXT = {
  title: { fontFamily: 'Arial Black, sans-serif', fontSize: 22, fill: RENT0_THEME.gold, letterSpacing: 1.2 },
  heading: { fontFamily: 'Arial Black, sans-serif', fontSize: 12, fill: RENT0_THEME.ink, letterSpacing: 0.6 },
  body: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: RENT0_THEME.ink },
  tiny: { fontFamily: 'Arial, sans-serif', fontSize: 8, fill: RENT0_THEME.muted, letterSpacing: 0.3 },
} as const;

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
