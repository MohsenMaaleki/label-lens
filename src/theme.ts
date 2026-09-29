import type { ComponentProps } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import type Feather from '@expo/vector-icons/Feather';
// Per-weight entry points: the package roots would bundle every weight of each family.
import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { AtkinsonHyperlegibleNext_800ExtraBold } from '@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold';
import { AtkinsonHyperlegibleMono_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-mono/700Bold';

/**
 * Pastel on cool white: the off-white of the reference screens, white cards, big soft tiles,
 * black text and black pill buttons. Separation comes from the fills, not from borders or shadows.
 * Black text passes WCAG AA on every fill (11.6:1 or more); grey text is only for the page and white cards.
 */
const light = {
  bg: '#F3F5F9',
  card: '#FFFFFF',
  line: '#E4E8EE',
  /** Dividers inside tinted cards, where the page hairline would vanish. */
  line2: '#D9DEE6',
  /** Sheet handle and dashed outlines. */
  lineStrong: '#C9CFD8',
  ink: '#141414',
  /** Secondary text. Safe on every tile, unlike grey. */
  ink2: '#3C3F46',
  /** Small grey text, on the page and white cards only (5.4:1). */
  sub: '#60646C',
  /** Marks only, such as a step not started yet. Too light for text. */
  inkFaint: '#B1B6C0',
  /** The quiet fill: secondary buttons, chips, the Scan tile, the answer bubble. */
  mist: '#E5E8EE',
  /** Icon backgrounds on white cards. */
  mistSoft: '#EEF1F5',
  yellow: '#FCE38A',
  yellowSoft: '#FEF1C4',
  orange: '#FBC56B',
  orangeSoft: '#FDE8C4',
  green: '#C3E28F',
  greenSoft: '#E7F3D2',
  lavender: '#CFC8F6',
  lavenderSoft: '#ECE9FB',
  /** Badges and high-urgency fills, always with black text (5.0:1). */
  red: '#E8533B',
  /** Text on the red fill: dark in both themes. */
  onRed: '#141414',
  redSoft: '#FBE3DE',
  /** Red text: the brand red is too light for text on soft red (3.0:1), this one is 5.5:1. */
  redText: '#A8321E',
  /** Primary buttons and the user's chat bubbles. */
  pill: '#1B1B1B',
  onPill: '#FFFFFF',
  /** White circles behind tile icons and header buttons. */
  circle: '#FFFFFF',
  onCircle: '#141414',
  marker: '#FCE38A',
  /** Text on the yellow highlighter, in both themes. */
  onMarker: '#141414',
  /** The dark payment card. */
  ticket: '#1B1B1B',
  ticketChip: '#33353B',
  ticketText: '#D9DCE2',
  onDark: '#FFFFFF',
  /** Behind the photo while it is read. */
  frame: '#E5E8EE',
  /** The snackbar: the opposite of the page. */
  inverse: '#1B1B1B',
  onInverse: '#FFFFFF',
  /** Overlays on the photo of a letter. */
  markerWash: 'rgba(252, 227, 138, 0.65)',
  lavenderWash: 'rgba(207, 200, 246, 0.45)',
  lensGlass: 'rgba(255, 255, 255, 0.2)',
  scrim: 'rgba(20, 20, 20, 0.45)',
  white: '#FFFFFF',
};

export type Palette = typeof light;

/**
 * Night: neutral greys, and the same hues as deep tints under light text, so big tiles do not glare.
 * The primary pill flips to light. Every text pair here is 6.0:1 or more.
 */
const dark: Palette = {
  bg: '#111214',
  card: '#1C1D21',
  line: '#2B2D32',
  line2: '#363940',
  lineStrong: '#454850',
  ink: '#F2F3F5',
  ink2: '#D0D3D9',
  sub: '#A0A4AC',
  inkFaint: '#5A5E66',
  mist: '#2C3038',
  mistSoft: '#23262C',
  yellow: '#4A3F16',
  yellowSoft: '#2E2915',
  orange: '#4D3413',
  orangeSoft: '#322514',
  green: '#2E3D18',
  greenSoft: '#212A15',
  lavender: '#37315C',
  lavenderSoft: '#28253D',
  red: '#F0765F',
  onRed: '#141414',
  redSoft: '#3F1F19',
  redText: '#FF9C88',
  pill: '#F2F3F5',
  onPill: '#141414',
  circle: '#F2F3F5',
  onCircle: '#141414',
  marker: '#FCE38A',
  onMarker: '#141414',
  ticket: '#26282D',
  ticketChip: '#3A3D44',
  ticketText: '#D9DCE2',
  onDark: '#FFFFFF',
  frame: '#202227',
  inverse: '#F2F3F5',
  onInverse: '#141414',
  markerWash: 'rgba(252, 227, 138, 0.6)',
  lavenderWash: 'rgba(207, 200, 246, 0.35)',
  lensGlass: 'rgba(255, 255, 255, 0.2)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
};

type Shadow = { boxShadow?: string };
type Shadows = Record<'sheet' | 'float' | 'letter' | 'lens', Shadow>;

// Only things that float get a shadow: sheets, the snackbar, the lens and the welcome letter.
const lightShadow: Shadows = {
  sheet: { boxShadow: '0px -10px 30px 0px rgba(20, 20, 20, 0.12)' },
  float: { boxShadow: '0px 10px 24px -8px rgba(20, 20, 20, 0.35)' },
  letter: { boxShadow: '0px 18px 30px -16px rgba(20, 20, 20, 0.45)' },
  lens: { boxShadow: '0px 12px 26px 0px rgba(0, 0, 0, 0.3)' },
};

const darkShadow: Shadows = {
  sheet: { boxShadow: '0px -14px 34px 0px rgba(0, 0, 0, 0.5)' },
  float: { boxShadow: '0px 10px 24px -8px rgba(0, 0, 0, 0.6)' },
  letter: { boxShadow: '0px 18px 30px -16px rgba(0, 0, 0, 0.8)' },
  lens: lightShadow.lens,
};

/** How soon something is due: red now, orange soon, green with time to spare, grey when past. */
export type Tone = 'urgent' | 'soon' | 'ok' | 'neutral';

const tonesFor = (c: Palette): Record<Tone, { fg: string; bg: string }> => ({
  urgent: { fg: c.redText, bg: c.redSoft },
  soon: { fg: c.ink, bg: c.orangeSoft },
  ok: { fg: c.ink, bg: c.greenSoft },
  neutral: { fg: c.ink2, bg: c.mist },
});

export interface Theme {
  dark: boolean;
  c: Palette;
  shadow: Shadows;
  tones: Record<Tone, { fg: string; bg: string }>;
}

const themes: Record<'light' | 'dark', Theme> = {
  light: { dark: false, c: light, shadow: lightShadow, tones: tonesFor(light) },
  dark: { dark: true, c: dark, shadow: darkShadow, tones: tonesFor(dark) },
};

/** The theme for the phone's light or dark setting. It follows a change while the app is open. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Builds a value, usually a StyleSheet, once for each theme. Call the returned hook in a component. */
export function themed<T>(build: (theme: Theme) => T) {
  const built = { light: build(themes.light), dark: build(themes.dark) };
  return function useThemed(): T {
    return built[useTheme().dark ? 'dark' : 'light'];
  };
}

/**
 * The widest the content gets. Tablets and unfolded foldables show a centered column instead of
 * phone layouts stretched to 1000 dp, with lines too long to read.
 */
export const MAX_WIDTH = 560;

/**
 * From this width (Material's "expanded" window: landscape tablets, open foldables) the app shows two
 * panes: the home list on the start side, the open letter, documents or settings next to it.
 */
export const TWO_PANE_MIN = 840;

/** Corner radius of the big tiles and cards. */
export const RADIUS = { tile: 28, card: 24, row: 20 };

/** Loaded at startup. Vazirmatn, for Persian, Arabic and Urdu, loads only when needed: see fonts.ts. */
export const fontFiles = {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  AtkinsonHyperlegibleMono_700Bold,
};

export interface Fonts {
  display: TextStyle;
  regular: TextStyle;
  bold: TextStyle;
  extra: TextStyle;
}

/** Latin text (amounts, codes, names from the letter) always uses these, whatever the UI language. */
export const latin: Fonts = {
  display: { fontFamily: 'AtkinsonHyperlegibleNext_800ExtraBold' },
  regular: { fontFamily: 'AtkinsonHyperlegibleNext_400Regular' },
  bold: { fontFamily: 'AtkinsonHyperlegibleNext_700Bold' },
  extra: { fontFamily: 'AtkinsonHyperlegibleNext_800ExtraBold' },
};

export const mono: TextStyle = { fontFamily: 'AtkinsonHyperlegibleMono_700Bold' };

const arabicScript: Fonts = {
  display: { fontFamily: 'Vazirmatn_800ExtraBold' },
  regular: { fontFamily: 'Vazirmatn_400Regular' },
  bold: { fontFamily: 'Vazirmatn_700Bold' },
  extra: { fontFamily: 'Vazirmatn_800ExtraBold' },
};

// Cyrillic, Bengali and Chinese are not in the bundled fonts: use the system font for them.
// It is also the fallback for Arabic script while Vazirmatn loads.
const system: Fonts = {
  display: { fontWeight: '800' },
  regular: { fontWeight: '400' },
  bold: { fontWeight: '700' },
  extra: { fontWeight: '800' },
};

/** `arabicReady`: Vazirmatn has loaded. Before that, Arabic-script text uses the system font. */
export function fontsFor(lang: string, arabicReady: boolean): Fonts {
  if (lang === 'fa' || lang === 'ar' || lang === 'ur') return arabicReady ? arabicScript : system;
  if (lang === 'uk' || lang === 'bn' || lang === 'zh') return system;
  return latin;
}

/** Feather icon per document type: the same icon set as the rest of the app, so only one icon font ships. */
export const docIcon: Record<string, ComponentProps<typeof Feather>['name']> = {
  tax_notice: 'percent',
  fine: 'alert-octagon',
  residence_permit: 'user',
  government_letter: 'mail',
  medication: 'plus-square',
  utility_bill: 'zap',
  bank_letter: 'credit-card',
  school_letter: 'book-open',
  medical_report: 'activity',
  contract: 'edit-3',
  food_label: 'shopping-bag',
  other: 'file-text',
};
