/**
 * ── Design Tokens ─────────────────────────────────────────────────────────
 * Single source of truth that mirrors `tailwind.config.js` and the web's
 * `artifacts/viax-scout/src/index.css`. Use NativeWind className utilities
 * whenever possible; reach for these constants only when className isn't
 * available (e.g. inside `style={{...}}`, native APIs, animation values).
 */

export { Colors, BrandGradient, Radius, Shadows } from '@/constants/colors';
export type { Theme } from '@/constants/colors';

/** 4px-step spacing scale (matches Tailwind's defaults). */
export const Spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  40: 160,
  48: 192,
  56: 224,
  64: 256,
} as const;

/** Font families exposed by `@expo-google-fonts/poppins`. */
export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/** Font sizes (mirrors `tailwind.config.js` `fontSize`). */
export const FontSize = {
  '2xs': 10,
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 40,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.6,
  loose: 1.8,
} as const;

export const LetterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

/**
 * Animation durations / easing curves (mirror of `--transition` in web CSS).
 * Use with `react-native-reanimated`'s `withTiming` / `withSpring`.
 */
export const Motion = {
  durations: {
    fast: 150,
    base: 200,
    slow: 300,
    slower: 400,
  },
  easings: {
    /** cubic-bezier(0.4, 0, 0.2, 1) — same as the web `--transition`. */
    standard: [0.4, 0, 0.2, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
  },
} as const;

export type SpacingKey = keyof typeof Spacing;
export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
