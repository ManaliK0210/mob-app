// Clean, native-feeling palette: white surfaces, one warm accent, real photography does the rest.
export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F5F3',
  surfaceAlt: '#EFEFEC',
  ink: '#1B1B1B',
  inkSoft: '#5F5F5F',
  muted: '#9A9A96',
  line: '#ECECE8',
  accent: '#F2542D',
  accentDark: '#C9401E',
  accentTint: '#FFEEE8',
  success: '#2E9E62',
  danger: '#D93B30',
  dangerTint: '#FDECEA',
  dark: '#141414',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const type = {
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  small: { fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  tiny: { fontSize: 12, lineHeight: 16, color: colors.muted },
};

export const shadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};
