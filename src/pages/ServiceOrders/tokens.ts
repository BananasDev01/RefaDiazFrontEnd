/** Palette scoped to the redesigned orders and clients screens; the global theme stays untouched. */
export const tone = {
  ground: '#EEF1F5',
  card: '#FFFFFF',
  subtle: '#F5F7FA',
  border: '#DCE1E8',
  borderStrong: '#C9D1DC',
  divider: '#EDF0F4',
  ink: '#1C2230',
  text: '#2B2F36',
  muted: '#4A505C',
  faint: '#5F6672',
  primary: '#2A4B8D',
  primaryDark: '#1E3A70',
  primaryTint: '#E8EEF8',
  primarySoft: '#E3ECFA',
  primaryBorder: '#C3D2EC',
  danger: '#B3141D',
  dangerTint: '#FDECEE',
  dangerBorder: '#F2B8BE',
  dangerInk: '#8A1017',
  success: '#227A50',
  successTint: '#E2F2E9',
  successInk: '#1A5E3D',
  warnTint: '#FFF6E5',
  warnBorder: '#F2D9A6',
  warnInk: '#7A4D00',
  highlight: '#FFF19B',
} as const;

export const APP_BAR_HEIGHT = { xs: 56, sm: 64 } as const;

export const cardSx = {
  bgcolor: tone.card,
  border: 1,
  borderColor: tone.border,
  borderRadius: 3,
} as const;

/** Shared outlined input look for the redesigned forms. */
export const inputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tone.card, borderRadius: 2 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: tone.borderStrong },
} as const;
