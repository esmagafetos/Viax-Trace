import '../global.css';

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from '@/lib/auth';
import { initApiUrl } from '@/lib/api';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { useColors } from '@/hooks/useColors';
import { ToastProvider } from '@/components/Toast';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initSentry, reportError } from '@/lib/sentry';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry as early as possible so it can capture errors that
// happen during provider mount. No-op when EXPO_PUBLIC_SENTRY_DSN is unset.
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep cache around long enough to be re-hydrated by the persister
      // on cold start, even if the data is technically stale.
      gcTime: 1000 * 60 * 60 * 24, // 24h
    },
    mutations: {
      // Mutations are user-initiated; never silently retry on flaky
      // mobile networks (would risk double-submitting).
      retry: 0,
      networkMode: 'online',
    },
  },
});

const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'viax_query_cache_v1',
  // Throttle writes so a burst of query updates doesn't hammer storage.
  throttleTime: 1000,
});

function ThemedStack() {
  const { dark } = useTheme();
  const c = useColors();

  // Match the root window background to the active theme so dark content
  // doesn't peek through a default-white window on some Android OEMs
  // during the brief moment between native splash and React's first paint.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="docs" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    initApiUrl().finally(() => setApiReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && apiReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, apiReady]);

  /**
   * EAS Update — fire-and-forget background check on cold start.
   *
   * The native side is configured with `checkAutomatically: ON_LOAD` and
   * `fallbackToCacheTimeout: 0`, so the app boots instantly from the
   * cached bundle while the update is fetched in the background. This
   * extra explicit check exists for two reasons:
   *   1. It applies the just-downloaded update in *this* session via
   *      `reloadAsync()` if one becomes available within ~3s of mount,
   *      shaving one cold-start cycle off the rollout window.
   *   2. It catches errors that the native auto-check swallows silently
   *      and reports them to Sentry, so we know if rollout is broken.
   *
   * Disabled when `Updates.isEnabled` is false (dev client, Expo Go, or
   * `updates.enabled: false` in app.json).
   */
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled || !result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (cancelled || !fetched.isNew) return;
        // Defer one tick so we don't yank the carpet before any other
        // mount-effects finish their first frame.
        setTimeout(() => Updates.reloadAsync().catch(() => {}), 250);
      } catch (e) {
        reportError(e, { source: 'eas-update-check' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if ((!fontsLoaded && !fontError) || !apiReady) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: queryPersister,
                maxAge: 1000 * 60 * 60 * 24, // discard cache older than 24h on rehydrate
                buster: 'v1',
              }}
            >
              <AuthProvider>
                <ToastProvider>
                  <ThemedStack />
                </ToastProvider>
              </AuthProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
