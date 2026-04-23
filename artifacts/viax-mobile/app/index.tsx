import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { Link, Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { Button, Card, H1, Input, Label, Muted } from '@/components/ui';
import { ViaXLogo } from '@/components/ViaXLogo';
import { hasApiUrl, getApiUrl } from '@/lib/api';

export default function LoginScreen() {
  const c = useColors();
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState(hasApiUrl());

  useEffect(() => setError(null), [username, password]);
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
      await login(username.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ViaXLogo />
          </View>

          {!serverConfigured && (
            <Card style={{ gap: 10, borderColor: c.accent }}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                Servidor não configurado
              </Text>
              <Muted>
                Antes de entrar, configure a URL do seu servidor ViaX:Trace (Termux ou outro host).
              </Muted>
              <Button onPress={() => router.push('/setup')}>Configurar servidor</Button>
            </Card>
          )}

          <Card style={{ gap: 14 }}>
            <H1>Entrar</H1>
            <Muted>Acesse sua conta para auditar rotas.</Muted>

            <View style={{ gap: 4 }}>
              <Label>Usuário</Label>
              <Input
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="seu.usuario"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Label>Senha</Label>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            </View>

            {error && (
              <Text style={{ color: '#dc2626', fontFamily: 'Poppins_500Medium', fontSize: 13 }}>{error}</Text>
            )}

            <Button onPress={onSubmit} loading={submitting} disabled={!serverConfigured}>
              Entrar
            </Button>

            <View style={styles.footerRow}>
              <Muted>Não tem conta?</Muted>
              <Link href="/register" asChild>
                <Pressable>
                  <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}> Criar conta</Text>
                </Pressable>
              </Link>
            </View>

            {serverConfigured && (
              <Pressable onPress={() => router.push('/setup')}>
                <Text style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'center' }}>
                  Servidor: {getApiUrl()} (alterar)
                </Text>
              </Pressable>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 14, justifyContent: 'center', flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
