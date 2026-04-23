import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';

const LIGHT_LOGO = require('../assets/brand/viax-logo-light.png');
const DARK_LOGO = require('../assets/brand/viax-logo-dark.png');
const SHOWCASE_LOGO = require('../assets/brand/viax-logo-showcase.png');
const BANNER = require('../assets/brand/viax-github-banner.png');

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { icon: number; name: number; tag: number; gap: number }> = {
  sm: { icon: 18, name: 14, tag: 8, gap: 6 },
  md: { icon: 24, name: 17, tag: 9, gap: 9 },
  lg: { icon: 32, name: 22, tag: 10, gap: 11 },
  xl: { icon: 48, name: 32, tag: 13, gap: 16 },
};

interface LogoMarkProps {
  size?: number;
  dark?: boolean;
}

/**
 * Pure-image rendering of the brand mark — uses the same PNGs that ship with the
 * web build so the icon matches pixel-for-pixel. We crop to a square box around
 * the icon area (the showcase PNG has the mark in the centre).
 */
export function LogoMark({ size = 36, dark }: LogoMarkProps) {
  return (
    <Image
      source={SHOWCASE_LOGO}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  );
}

interface ViaXLogoProps {
  size?: Size;
  showTagline?: boolean;
  /** Force a specific theme — defaults to current theme */
  dark?: boolean;
}

/**
 * Horizontal wordmark (icon + "ViaX:Trace" + tagline). Mirrors the web
 * `<ViaXLogo />` typographic treatment but composes the icon next to the text
 * so we can render at any size without raster blur.
 */
export function ViaXLogo({ size = 'md', showTagline = true, dark: darkProp }: ViaXLogoProps) {
  const { dark: themeDark } = useTheme();
  const dark = darkProp ?? themeDark;
  const s = SIZES[size];
  const textColor = dark ? '#f0ede8' : '#1a1917';
  const mutedColor = dark ? 'rgba(240,237,232,0.4)' : 'rgba(26,25,23,0.4)';

  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <LogoMark size={s.icon} dark={dark} />
      <View>
        <Text
          style={{
            fontFamily: 'Poppins_700Bold',
            fontSize: s.name,
            letterSpacing: -0.3,
            color: textColor,
            lineHeight: s.name * 1.15,
          }}
        >
          ViaX<Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular' }}>:</Text>Trace
        </Text>
        {showTagline && (
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: s.tag,
              letterSpacing: 1.6,
              color: mutedColor,
              marginTop: 1,
            }}
          >
            AUDITORIA DE ROTAS
          </Text>
        )}
      </View>
    </View>
  );
}

/** Full GitHub banner — same asset shipped with the web Docs page. */
export function GitHubBanner() {
  return (
    <Image
      source={BANNER}
      style={{ width: '100%', aspectRatio: 1200 / 600, borderRadius: 14 }}
      resizeMode="cover"
    />
  );
}

/** Standalone light/dark logo PNG, useful for splash, headers, etc. */
export function FlatLogo({ width = 200, dark }: { width?: number; dark?: boolean }) {
  const { dark: themeDark } = useTheme();
  const isDark = dark ?? themeDark;
  return (
    <Image
      source={isDark ? DARK_LOGO : LIGHT_LOGO}
      style={{ width, aspectRatio: 4, resizeMode: 'contain' }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
