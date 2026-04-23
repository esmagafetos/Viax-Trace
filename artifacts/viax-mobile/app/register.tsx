import { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { Button, Card, H1, Input, Label, Muted } from '@/components/ui';
import { ViaXLogo } from '@/components/ViaXLogo';
import { hasApiUrl } from '@/lib/api';

export default function RegisterScreen() {
  const c = useColors();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!hasApiUrl()) {
      setError('Configure o servidor antes de criar conta.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({ username: username.trim(), password, name: name.trim(), email: email.trim() });
      router.replace('/setup');
    } catch (e: any) {
      setError(e?.message ?? 'Falha no cadastro');
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

          {!hasApiUrl() && (
            <Card style={{ gap: 10, borderColor: c.accent }}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                Servidor não configurado
              </Text>
              <Muted>Configure o servidor antes de cadastrar sua conta.</Muted>
              <Button onPress={() => router.push('/setup')}>Configurar servidor</Button>
            </Card>
          )}

          <Card style={{ gap: 14 }}>
            <H1>Criar conta</H1>
            <Muted>Cadastre-se para começar a auditar suas rotas.</Muted>

            <View style={{ gap: 4 }}>
              <Label>Nome</Label>
              <Input value={name} onChangeText={setName} placeholder="Seu nome" />
            </View>

            <View style={{ gap: 4 }}>
              <Label>E-mail</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="voce@dominio.com"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Label>Usuário</Label>
              <Input value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="seu.usuario" />
            </View>

            <View style={{ gap: 4 }}>
              <Label>Senha</Label>
              <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
            </View>

            {error && (
              <Text style={{ color: '#dc2626', fontFamily: 'Poppins_500Medium', fontSize: 13 }}>{error}</Text>
            )}

            <Button onPress={onSubmit} loading={submitting} disabled={!hasApiUrl()}>
              Cadastrar
            </Button>

            <View style={styles.footerRow}>
              <Muted>Já tem conta?</Muted>
              <Link href="/" asChild>
                <Pressable>
                  <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}> Entrar</Text>
                </Pressable>
              </Link>
            </View>
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
