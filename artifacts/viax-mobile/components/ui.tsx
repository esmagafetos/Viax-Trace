import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Radius } from '@/constants/colors';
import { useTheme } from '@/lib/theme';
import { useResponsive } from '@/lib/responsive';

/** Card with the same warm-paper surface and 14px radius used on the web. */
export function Card({ style, children, ...rest }: ViewProps) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.borderStrong,
          borderWidth: 1,
          borderRadius: Radius.lg,
          padding: rs(16),
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ title, subtitle, style }: { title: string; subtitle?: string; style?: ViewStyle }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <View
      style={[
        {
          paddingHorizontal: rs(18),
          paddingTop: rs(18),
          paddingBottom: rs(14),
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: rs(18), letterSpacing: -0.4, color: c.text }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: rs(13), color: c.textFaint, marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function CardBody({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { rs } = useResponsive();
  return <View style={[{ paddingHorizontal: rs(18), paddingVertical: rs(18), gap: rs(14) }, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: rs(22), color: c.text, letterSpacing: -0.6 }}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: rs(16), color: c.text, letterSpacing: -0.2 }}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: any }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Text style={[{ fontFamily: 'Poppins_400Regular', fontSize: rs(13), color: c.textFaint, lineHeight: rs(19) }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Text
      style={{
        fontFamily: 'Poppins_600SemiBold',
        fontSize: rs(11),
        color: c.textFaint,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

interface InputBoxProps extends TextInputProps {
  hasError?: boolean;
  rightSlot?: React.ReactNode;
}

export function Input({ hasError, rightSlot, style, ...props }: InputBoxProps) {
  const c = useColors();
  const { rs } = useResponsive();
  const [focused, setFocused] = useState(false);
  const borderColor = hasError ? c.accent : focused ? c.accent : c.borderStrong;
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        placeholderTextColor={c.textFaint}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: c.surface2,
            color: c.text,
            borderColor,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: rs(14),
            paddingVertical: rs(12),
            paddingRight: rightSlot ? rs(44) : rs(14),
            fontFamily: 'Poppins_400Regular',
            fontSize: rs(14),
          },
          style,
        ]}
      />
      {rightSlot && (
        <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
          {rightSlot}
        </View>
      )}
    </View>
  );
}

export function PasswordInput(props: TextInputProps) {
  const c = useColors();
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      rightSlot={
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textFaint} />
        </Pressable>
      }
    />
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const c = useColors();
  const { rs } = useResponsive();
  if (!password) return null;
  const checks = [
    { ok: password.length >= 8, label: '8+ caracteres' },
    { ok: /[A-Za-z]/.test(password), label: 'Letra' },
    { ok: /[0-9]/.test(password), label: 'Número' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'Símbolo' },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const palette = [c.accent, c.accent, '#f59e0b', '#22c55e', '#16a34a'];
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              backgroundColor: i < score ? palette[score] : c.borderStrong,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: rs(10), color: score >= 3 ? '#22c55e' : c.textFaint }}>
          {levels[score]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {checks.map((chk) => (
            <Text
              key={chk.label}
              style={{
                fontFamily: chk.ok ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                fontSize: rs(9.5),
                color: chk.ok ? '#22c55e' : c.textFaint,
              }}
            >
              {chk.ok ? '✓' : '·'} {chk.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'dark';
  loading?: boolean;
  disabled?: boolean;
  iconRight?: keyof typeof Ionicons.glyphMap;
};

export function Button({ children, onPress, variant = 'primary', loading, disabled, iconRight }: ButtonProps) {
  const c = useColors();
  const { rs } = useResponsive();
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const bg = isPrimary ? c.accent : isDark ? c.text : 'transparent';
  const fg = isPrimary ? '#fff' : isDark ? c.bg : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: isPrimary || isDark ? bg : c.borderStrong,
          borderWidth: 1,
          borderRadius: Radius.pill,
          paddingVertical: rs(13),
          paddingHorizontal: rs(22),
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          shadowColor: isPrimary ? c.accent : '#000',
          shadowOpacity: isPrimary ? 0.3 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
          elevation: isPrimary ? 3 : 0,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Text style={{ color: fg, fontFamily: 'Poppins_600SemiBold', fontSize: rs(14) }}>{children}</Text>
          {iconRight && <Ionicons name={iconRight} size={rs(16)} color={fg} />}
        </>
      )}
    </Pressable>
  );
}

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'ok' | 'accent' }) {
  const c = useColors();
  const { rs } = useResponsive();
  const bg = tone === 'ok' ? 'rgba(46,168,99,0.15)' : tone === 'accent' ? c.accentDim : c.surface2;
  const fg = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.textMuted;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: bg, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: 'Poppins_500Medium', fontSize: rs(11) }}>{children}</Text>
    </View>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: c.borderStrong,
        backgroundColor: c.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={rs(13)} color={c.textMuted} />
      <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: rs(11), color: c.textMuted }}>
        {dark ? 'Claro' : 'Escuro'}
      </Text>
    </Pressable>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rs } = useResponsive();
  if (!children) return null;
  return (
    <Text style={{ color: c.accent, fontFamily: 'Poppins_500Medium', fontSize: rs(11), marginTop: 4 }}>
      {children}
    </Text>
  );
}

export const screen = StyleSheet.create({
  root: { flex: 1, padding: 18, gap: 16 },
});
