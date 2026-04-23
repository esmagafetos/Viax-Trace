import { useWindowDimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const ratio = width / BASE_WIDTH;
  const clamped = Math.max(0.85, Math.min(ratio, 1.35));

  const rs = (size: number) => Math.round(PixelRatio.roundToNearestPixel(size * clamped));
  const rsf = (size: number) => Math.round(size * clamped);

  let bp: Breakpoint;
  if (width < 360) bp = 'xs';
  else if (width < 600) bp = 'sm';
  else if (width < 900) bp = 'md';
  else bp = 'lg';

  const cols = bp === 'xs' ? 2 : bp === 'sm' ? 2 : bp === 'md' ? 3 : 4;
  const isCompact = width < 360;
  const isWide = width >= 600;

  return { width, height, rs, rsf, bp, cols, isCompact, isWide };
}
