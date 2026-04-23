import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { icon: number; name: number; tag: number; gap: number }> = {
  sm: { icon: 18, name: 14, tag: 8, gap: 6 },
  md: { icon: 24, name: 17, tag: 9, gap: 9 },
  lg: { icon: 32, name: 22, tag: 10, gap: 11 },
  xl: { icon: 48, name: 32, tag: 13, gap: 16 },
};

interface LogoIconProps {
  size?: number;
  color?: string;
  accentColor?: string;
}

export function LogoIcon({ size = 28, color = '#1a1917', accentColor = '#d4521a' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M7 7C7 7 7 16 14 18C20 20 21 21 21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={7} cy={7} r={2.5} fill={color} />
      <Circle cx={21} cy={21} r={4.5} fill={accentColor} />
      <Circle cx={21} cy={21} r={1.8} fill="#ffffff" />
    </Svg>
  );
}

interface AppIconProps {
  size?: number;
  dark?: boolean;
}

export function AppIcon({ size = 40, dark }: AppIconProps) {
  const { dark: themeDark } = useTheme();
  const isDark = dark ?? themeDark;
  const bg = isDark ? '#121110' : '#ffffff';
  const fg = isDark ? '#f0ede8' : '#1a1917';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width={40} height={40} rx={9} fill={bg} />
      <Path
        d="M10 10C10 10 10 20 17 22C23 24 24 25 24 25"
        stroke={fg}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={10} cy={10} r={3} fill={fg} />
      <Circle cx={30} cy={30} r={5.5} fill="#d4521a" />
      <Circle cx={30} cy={30} r={2.2} fill="#ffffff" />
    </Svg>
  );
}

export function LogoMark({ size = 28, dark }: LogoIconProps & { dark?: boolean }) {
  const { dark: themeDark } = useTheme();
  const isDark = dark ?? themeDark;
  return <LogoIcon size={size} color={isDark ? '#f0ede8' : '#1a1917'} accentColor="#d4521a" />;
}

interface ViaXLogoProps {
  size?: Size;
  showTagline?: boolean;
  dark?: boolean;
}

export function ViaXLogo({ size = 'md', showTagline = true, dark: darkProp }: ViaXLogoProps) {
  const { dark: themeDark } = useTheme();
  const dark = darkProp ?? themeDark;
  const s = SIZES[size];
  const textColor = dark ? '#f0ede8' : '#1a1917';
  const mutedColor = dark ? 'rgba(240,237,232,0.4)' : 'rgba(26,25,23,0.4)';

  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <LogoIcon size={s.icon} color={textColor} accentColor="#d4521a" />
      <View style={{ flexShrink: 1 }}>
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

export function FlatLogo({ width = 200, dark }: { width?: number; dark?: boolean }) {
  const iconSize = Math.round(width * 0.14);
  return (
    <View style={{ width, alignItems: 'flex-start' }}>
      <ViaXLogo size="lg" dark={dark} showTagline />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
