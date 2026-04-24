import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colorScheme as nwColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

type Mode = 'light' | 'dark';

interface ThemeCtx {
  mode: Mode;
  dark: boolean;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORE_KEY = 'viax_theme_mode';
/** Legacy key used before migrating from SecureStore → AsyncStorage. */
const LEGACY_STORE_KEY = 'viax_theme_mode';

/** One-shot migration of an old SecureStore-stored theme → AsyncStorage. */
async function migrateLegacyTheme(): Promise<Mode | null> {
  try {
    const legacy = await SecureStore.getItemAsync(LEGACY_STORE_KEY);
    if (legacy !== 'light' && legacy !== 'dark') return null;
    await AsyncStorage.setItem(STORE_KEY, legacy);
    await SecureStore.deleteItemAsync(LEGACY_STORE_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>(system === 'dark' ? 'dark' : 'light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let v: string | null = await AsyncStorage.getItem(STORE_KEY);
        if (!v) v = await migrateLegacyTheme();
        if (v === 'light' || v === 'dark') setModeState(v);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Keep NativeWind's color scheme in sync so `dark:` variants resolve
  // against our explicit user selection (not just the OS preference).
  useEffect(() => {
    nwColorScheme.set(mode);
  }, [mode]);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(STORE_KEY, m).catch(() => {});
  };

  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark');

  if (!hydrated) return null;

  return <Ctx.Provider value={{ mode, dark: mode === 'dark', toggle, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
