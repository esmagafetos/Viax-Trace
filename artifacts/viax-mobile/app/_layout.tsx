import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ThemedStack() {
  const { dark } = useTheme();
  const c = useColors();
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

  if ((!fontsLoaded && !fontError) || !apiReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <ThemedStack />
              </ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
