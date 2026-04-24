import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
} from 'react-native';
import { Link, Redirect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import {
  Button,
  Card,
  Input,
  Label,
  Muted,
  PasswordInput,
  ThemeToggle,
} from '@/components/ui';
import { ViaXLogo } from '@/components/ViaXLogo';
import { useToast } from '@/components/Toast';
import { hasApiUrl, getApiUrl } from '@/lib/api';

export default function LoginScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading, login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(hasApiUrl());

  useEffect(() => setServerConfigured(hasApiUrl()), [user, loading]);

  if (loading) return null;
  if (user) return <Redirect href="/(tabs)/dashboard" />;

  const onSubmit = async () => {
    if (!hasApiUrl()) {
      toast.showToast('Configure o servidor antes de entrar.');
      return;
    }
    if (!email.trim() || !password) {
      toast.showToast('Preencha email e senha.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      // Mirror web Login.tsx — surface API errors via toast (not inline).
      toast.showToast(e?.message ?? 'Credenciais inválidas.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.toggleWrap, { top: insets.top + 12 }]}>
        <ThemeToggle />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Logo above card — mirrors web */}
            <View style={styles.logoWrap}>
              <ViaXLogo size="md" showTagline />
            </View>

            {/* Server-not-configured banner — mobile-only addition (web has no Setup) */}
            {!serverConfigured && (
              <Card
                style={{
                  gap: 10,
                  borderColor: c.accent,
                  marginBottom: 14,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: c.accent,
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 13,
                  }}
                >
                  Servidor não configurado
                </Text>
                <Muted>
                  Antes de entrar, configure a URL do seu servidor ViaX:Trace (Termux ou outro host).
                </Muted>
                <Button onPress={() => router.push('/setup')}>Configurar servidor</Button>
              </Card>
            )}

            {/* Card — mirrors web Login card with exact paddings */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header — web: padding: 1.75rem 2rem 1.25rem (28/32/20) */}
              <View
                style={[
                  styles.cardHeader,
                  { borderBottomColor: c.border },
                ]}
              >
                <Text
                  style={{
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 17.6,
                    letterSpacing: -0.4,
                    color: c.text,
                    marginBottom: 3,
                  }}
                >
                  Acessar conta
                </Text>
                <Text
                  style={{
                    fontFamily: 'Poppins_400Regular',
                    fontSize: 13,
                    color: c.textFaint,
                  }}
                >
                  Entre com suas credenciais para continuar
                </Text>
              </View>

              {/* Body — web: padding: 1.5rem 2rem 2rem (24/32/32) */}
              <View style={styles.cardBody}>
                <View style={{ gap: 6 }}>
                  <Label>Email</Label>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    placeholder="seu@email.com"
                    returnKeyType="next"
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Label>Senha</Label>
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    placeholder="••••••••"
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                  />
                </View>

                <Button
                  onPress={onSubmit}
                  loading={submitting}
                  disabled={!serverConfigured}
                  iconRight="arrow-forward"
                >
                  Entrar
                </Button>

                <View style={styles.footerRow}>
                  <Muted>Ainda não tem conta?</Muted>
                  <Link href="/register" asChild>
                    <Pressable hitSlop={6}>
                      <Text
                        style={{
                          color: c.accent,
                          fontFamily: 'Poppins_600SemiBold',
                          fontSize: 13,
                        }}
                      >
                        {' '}Criar conta grátis
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                {serverConfigured && (
                  <Pressable onPress={() => router.push('/setup')} hitSlop={4}>
                    <Text
                      style={{
                        color: c.textFaint,
                        fontFamily: 'Poppins_400Regular',
                        fontSize: 11,
                        textAlign: 'center',
                        marginTop: 2,
                      }}
                    >
                      Servidor: {getApiUrl()} (alterar)
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toggleWrap: { position: 'absolute', right: 14, zIndex: 10 },
  scroll: {
    paddingHorizontal: 22,
    paddingVertical: 28,
    justifyContent: 'center',
    flexGrow: 1,
    alignItems: 'center',
  },
  container: { width: '100%', maxWidth: 440 },
  logoWrap: { alignItems: 'center', marginBottom: 18 },
  /** Web: 1.75rem 2rem 1.25rem (28px / 32px / 20px). */
  cardHeader: {
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  /** Web: 1.5rem 2rem 2rem (24px / 32px / 32px). */
  cardBody: {
    paddingTop: 24,
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
});
