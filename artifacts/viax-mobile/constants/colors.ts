export const Colors = {
  light: {
    bg: '#f4f3ef',
    surface: '#faf9f6',
    surface2: '#eeecea',
    text: '#1a1917',
    textMuted: '#6b6860',
    textFaint: '#a09e9a',
    accent: '#d4521a',
    accentDim: 'rgba(212,82,26,0.12)',
    ok: '#1a7a4a',
    okDim: 'rgba(26,122,74,0.10)',
    warn: '#b45309',
    warnDim: 'rgba(180,83,9,0.10)',
    destructive: '#dc2626',
    destructiveDim: 'rgba(220,38,38,0.10)',
    border: 'rgba(26,25,23,0.1)',
    borderStrong: 'rgba(26,25,23,0.18)',
  },
  dark: {
    bg: '#121110',
    surface: '#1c1b19',
    surface2: '#242320',
    text: '#f0ede8',
    textMuted: '#8a877f',
    textFaint: '#504d48',
    accent: '#e8703a',
    accentDim: 'rgba(232,112,58,0.13)',
    ok: '#2ea863',
    okDim: 'rgba(46,168,99,0.13)',
    warn: '#f59e0b',
    warnDim: 'rgba(245,158,11,0.13)',
    destructive: '#ef4444',
    destructiveDim: 'rgba(239,68,68,0.13)',
    border: 'rgba(240,237,232,0.08)',
    borderStrong: 'rgba(240,237,232,0.14)',
  },
};

export const BrandGradient = ['#1a0e08', '#2d1408', '#3d1c0c', '#1f0a18'] as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 99,
};

/** Dual-layer-ish shadow tokens that approximate the web's CSS box-shadows. */
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export type Theme = typeof Colors.light;
