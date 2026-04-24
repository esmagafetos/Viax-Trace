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
  CardBody,
  CardHeader,
  Input,
  Label,
  Muted,
  PasswordInput,
  ThemeToggle,
  FieldError,
} from '@/components/ui';
import { ViaXLogo } from '@/components/ViaXLogo';
import { hasApiUrl, getApiUrl } from '@/lib/api';

export default function LoginScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState(hasApiUrl());

  useEffect(() => setError(null), [email, password]);
  useEffect(() => setServerConfigured(hasApiUrl()), [user, loading]);

  if (loading) return null;
  if (user) return <Redirect href="/(tabs)/dashboard" />;

  const onSubmit = async () => {
    if (!hasApiUrl()) {
      setError('Configure o servidor antes de entrar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Credenciais inválidas.');
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
          <View style={styles.logoWrap}>
            <ViaXLogo size="md" showTagline />
          </View>

          {!serverConfigured && (
            <Card style={{ gap: 10, borderColor: c.accent, marginBottom: 14 }}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                Servidor não configurado
              </Text>
              <Muted>
                Antes de entrar, configure a URL do seu servidor ViaX:Trace (Termux ou outro host).
              </Muted>
              <Button onPress={() => router.push('/setup')}>Configurar servidor</Button>
            </Card>
          )}

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <CardHeader title="Acessar conta" subtitle="Entre com suas credenciais para continuar" />

            <CardBody>
              <View>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="seu@email.com"
                />
              </View>

              <View>
                <Label>Senha</Label>
                <PasswordInput value={password} onChangeText={setPassword} placeholder="••••••••" />
              </View>

              {error && <FieldError>{error}</FieldError>}

              <Button onPress={onSubmit} loading={submitting} disabled={!serverConfigured} iconRight="arrow-forward">
                Entrar
              </Button>

              <View style={styles.footerRow}>
                <Muted>Ainda não tem conta?</Muted>
                <Link href="/register" asChild>
                  <Pressable hitSlop={6}>
                    <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
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
                      marginTop: 4,
                    }}
                  >
                    Servidor: {getApiUrl()} (alterar)
                  </Text>
                </Pressable>
              )}
            </CardBody>
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
  scroll: { paddingHorizontal: 22, paddingVertical: 28, justifyContent: 'center', flexGrow: 1, alignItems: 'center' },
  container: { width: '100%', maxWidth: 440 },
  logoWrap: { alignItems: 'center', marginBottom: 18 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
});
