export const colors = {
  paper: '#EEF2EA',
  surface: '#FFFFFF',
  ink: '#17251E',
  inkSoft: '#4A5A50',
  muted: '#7C8A80',
  line: '#D9E0D4',
  basil: '#1F5C45',
  basilDark: '#143F2F',
  basilTint: '#DCE9DF',
  saffron: '#FFB627',
  saffronTint: '#FFF1CC',
  tomato: '#E2483D',
  tomatoTint: '#FBE1DE',
};

// Loaded in App.js via @expo-google-fonts/bricolage-grotesque. Falls back to system font until loaded.
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  title: 'BricolageGrotesque_700Bold',
  medium: 'BricolageGrotesque_500Medium',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.ink, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { fontFamily: fonts.title, fontSize: 16, lineHeight: 21, color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  small: { fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  tiny: { fontSize: 12, lineHeight: 16, color: colors.muted },
};
