import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = nextId++;
    setToasts((cur) => [...cur, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { paddingTop: insets.top + 12 }]}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translate, { toValue: -8, duration: 180, useNativeDriver: true }),
      ]).start(() => onDismiss(item.id));
    }, 4000);

    return () => clearTimeout(timeout);
  }, [item.id, onDismiss, opacity, translate]);

  const palette = TOAST_PALETTE[item.type];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity,
          transform: [{ translateY: translate }],
        },
      ]}
    >
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text
        numberOfLines={3}
        style={{
          flex: 1,
          color: palette.fg,
          fontFamily: 'Poppins_500Medium',
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {item.message}
      </Text>
      <Pressable hitSlop={8} onPress={() => onDismiss(item.id)}>
        <Ionicons name="close" size={16} color={palette.fg} />
      </Pressable>
    </Animated.View>
  );
}

const TOAST_PALETTE: Record<ToastType, { bg: string; border: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  error: {
    bg: '#2a1410',
    border: 'rgba(212,82,26,0.4)',
    fg: '#f4a58a',
    icon: 'alert-circle-outline',
  },
  success: {
    bg: '#0d2018',
    border: 'rgba(26,122,74,0.4)',
    fg: '#86efac',
    icon: 'checkmark-circle-outline',
  },
  info: {
    bg: '#0c1726',
    border: 'rgba(59,130,246,0.4)',
    fg: '#bfdbfe',
    icon: 'information-circle-outline',
  },
};

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
