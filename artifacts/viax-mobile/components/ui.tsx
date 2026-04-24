import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  UIManager,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColors } from '@/hooks/useColors';
import { Radius, Shadows } from '@/constants/colors';
import { useTheme } from '@/lib/theme';
import { useResponsive } from '@/lib/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
          // Outer "ring" glow on focus — mirrors web `box-shadow: 0 0 0 3px var(--accent-dim)`
          focused
            ? ({
                shadowColor: c.accent,
                shadowOpacity: 0.35,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
                elevation: 3,
              } as ViewStyle)
            : null,
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
        <>
          <SpinnerRing
            size={rs(15)}
            color={fg}
            trackColor={isPrimary || isDark ? 'rgba(255,255,255,0.3)' : c.borderStrong}
          />
          <Text style={{ color: fg, fontFamily: 'Poppins_600SemiBold', fontSize: rs(14) }}>
            {typeof children === 'string' && children.toLowerCase().startsWith('entrar') ? 'Entrando…' : 'Aguarde…'}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: fg, fontFamily: 'Poppins_600SemiBold', fontSize: rs(14) }}>{children}</Text>
          {iconRight && <Ionicons name={iconRight} size={rs(16)} color={fg} />}
        </>
      )}
    </Pressable>
  );
}

/** Rotating ring used in loading states — equivalent to the web `animate-spin-ring`. */
export function SpinnerRing({
  size = 15,
  color = '#fff',
  trackColor = 'rgba(255,255,255,0.3)',
  borderWidth = 2,
}: {
  size?: number;
  color?: string;
  trackColor?: string;
  borderWidth?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: trackColor,
        borderTopColor: color,
        transform: [{ rotate }],
      }}
    />
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

/** Linear progress bar — 1:1 with the web's animated bars. */
export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'ok' | 'warn' }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  const fg = tone === 'ok' ? c.ok : tone === 'warn' ? c.warn : c.accent;
  return (
    <View
      style={{
        height: 6,
        borderRadius: 99,
        backgroundColor: c.surface2,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: 99,
          backgroundColor: fg,
        }}
      />
    </View>
  );
}

/** Looping skeleton placeholder. */
export function Skeleton({ height = 16, width, radius = 6, style }: { height?: number; width?: number | string; radius?: number; style?: ViewStyle }) {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          height,
          width: (width ?? '100%') as any,
          borderRadius: radius,
          backgroundColor: c.surface2,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Simple uncontrolled accordion item — used by the Docs FAQ. */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const c = useColors();
  const { rs } = useResponsive();
  const [open, setOpen] = useState(defaultOpen);
  const rot = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rot, { toValue: open ? 0 : 1, duration: 180, useNativeDriver: true }).start();
    setOpen((v) => !v);
  };

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Pressable
        onPress={toggle}
        style={{
          paddingVertical: rs(14),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: c.text,
            fontFamily: 'Poppins_600SemiBold',
            fontSize: rs(13.5),
            lineHeight: rs(19),
          }}
        >
          {title}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="add" size={18} color={c.textFaint} />
        </Animated.View>
      </Pressable>
      {open && (
        <View style={{ paddingBottom: rs(14) }}>
          {typeof children === 'string' ? (
            <Text
              style={{
                color: c.textMuted,
                fontFamily: 'Poppins_400Regular',
                fontSize: rs(12.5),
                lineHeight: rs(20),
              }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </View>
  );
}

/** Continuous touch-driven slider — mirrors the web `<input type="range">` for tolerance. */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const ratio = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const KNOB = 22;

  const updateFromX = (x: number) => {
    if (width <= 0) return;
    const r = Math.max(0, Math.min(1, x / width));
    const raw = min + r * (max - min);
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => updateFromX(e.nativeEvent.locationX)}
      onResponderMove={(e) => updateFromX(e.nativeEvent.locationX)}
      style={{ height: 32, justifyContent: 'center', paddingHorizontal: KNOB / 2 }}
    >
      <View style={{ height: 4, borderRadius: 99, backgroundColor: c.surface2 }}>
        <View
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            borderRadius: 99,
            backgroundColor: c.accent,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: ratio * Math.max(0, width - KNOB),
          top: (32 - KNOB) / 2,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: c.accent,
          borderWidth: 2,
          borderColor: '#fff',
          ...Shadows.sm,
        }}
      />
    </View>
  );
}

/** Native date picker wrapped in a button-styled control — matches web `<input type="date">`. */
export function DateInput({
  value,
  onChange,
  placeholder = 'AAAA-MM-DD',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const c = useColors();
  const { rs } = useResponsive();
  const [show, setShow] = useState(false);

  const parsed = (() => {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  })();

  const display = parsed
    ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => ({
          backgroundColor: c.surface2,
          borderColor: c.borderStrong,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: rs(14),
          paddingVertical: rs(12),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: display ? c.text : c.textFaint,
            fontFamily: 'Poppins_400Regular',
            fontSize: rs(14),
          }}
        >
          {display || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={rs(16)} color={c.textFaint} />
      </Pressable>
      {show && (
        <DateTimePicker
          value={parsed ?? new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selected) => {
            if (Platform.OS === 'android') setShow(false);
            if (event.type === 'set' && selected) {
              const yyyy = selected.getFullYear();
              const mm = String(selected.getMonth() + 1).padStart(2, '0');
              const dd = String(selected.getDate()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}`);
              if (Platform.OS === 'ios') setShow(false);
            } else if (event.type === 'dismissed') {
              setShow(false);
            }
          }}
        />
      )}
    </>
  );
}

/** Centered modal with translucent backdrop and slide-up animation. */
export function Modal({
  visible,
  onClose,
  children,
  dismissOnBackdrop = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
}) {
  const c = useColors();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={dismissOnBackdrop ? onClose : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: c.surface,
              borderColor: c.borderStrong,
              borderWidth: 1,
              borderRadius: Radius.lg,
              padding: 20,
              minWidth: 280,
              maxWidth: 380,
              ...Shadows.lg,
            }}
          >
            {children}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

/** Confirmation dialog — destructive style by default for delete actions. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Modal visible={visible} onClose={onCancel} dismissOnBackdrop={!loading}>
      <Text
        style={{
          color: c.text,
          fontFamily: 'Poppins_700Bold',
          fontSize: rs(16),
          letterSpacing: -0.3,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: 'Poppins_400Regular',
          fontSize: rs(13),
          lineHeight: rs(20),
          marginBottom: 16,
        }}
      >
        {message}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: Radius.pill,
            borderWidth: 1,
            borderColor: c.borderStrong,
            backgroundColor: 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: rs(13) }}>
            {cancelLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={loading}
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: Radius.pill,
            backgroundColor: destructive ? c.destructive : c.accent,
            opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          })}
        >
          {loading && <SpinnerRing size={rs(13)} color="#fff" />}
          <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: rs(13) }}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Section card with title + chevron-style header — used in Docs and Settings. */
export function SectionCard({
  icon,
  title,
  children,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.borderStrong,
          borderWidth: 1,
          borderRadius: Radius.lg,
          overflow: 'hidden',
          ...Shadows.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          backgroundColor: c.surface2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {icon && (
          <View
            style={{
              width: rs(32),
              height: rs(32),
              borderRadius: 8,
              backgroundColor: c.accentDim,
              borderColor: 'rgba(212,82,26,0.2)',
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={rs(16)} color={c.accent} />
          </View>
        )}
        <Text
          style={{
            color: c.text,
            fontFamily: 'Poppins_700Bold',
            fontSize: rs(14),
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ padding: rs(16) }}>{children}</View>
    </View>
  );
}
