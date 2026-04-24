import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  Input,
  Label,
  Muted,
  PasswordInput,
  PasswordStrength,
  ThemeToggle,
} from '@/components/ui';
import { ViaXLogo } from '@/components/ViaXLogo';
import { hasApiUrl } from '@/lib/api';

function validateEmail(email: string): string | null {
  if (!email) return 'Email é obrigatório.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return 'Formato de email inválido.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Senha é obrigatória.';
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(password)) return 'A senha deve conter pelo menos uma letra.';
  if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número.';
  return null;
}

export default function RegisterScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const nameError = touched.name && !name.trim() ? 'Nome é obrigatório.' : null;

  const onSubmit = async () => {
    setTouched({ name: true, email: true, password: true });
    setServerError(null);

    if (!hasApiUrl()) {
      setServerError('Configure o servidor antes de criar conta.');
      return;
    }
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (!name.trim() || eErr || pErr) {
      setServerError(eErr ?? pErr ?? 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, birthDate: birthDate || null });
      router.replace('/setup');
    } catch (e: any) {
      setServerError(e?.message ?? 'Erro ao criar conta.');
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
          {!hasApiUrl() && (
            <Card style={{ gap: 10, borderColor: c.accent, marginBottom: 14 }}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                Servidor não configurado
              </Text>
              <Muted>Configure o servidor antes de cadastrar sua conta.</Muted>
              <Button onPress={() => router.push('/setup')}>Configurar servidor</Button>
            </Card>
          )}

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 }}>
              <ViaXLogo size="md" showTagline />
              <Muted>Crie sua conta gratuita</Muted>
            </View>

            <CardBody>
              <View>
                <Label>Nome completo</Label>
                <Input
                  value={name}
                  onChangeText={setName}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="Seu nome"
                  hasError={!!nameError}
                />
                <FieldError>{nameError}</FieldError>
              </View>

              <View>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="seu@email.com"
                  hasError={!!emailError}
                />
                <FieldError>{emailError}</FieldError>
              </View>

              <View>
                <Label>Senha</Label>
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordStrength password={password} />
                <FieldError>{passwordError}</FieldError>
              </View>

              <View>
                <Label>
                  Data de nascimento <Text style={{ fontWeight: '400', opacity: 0.6 }}>(opcional)</Text>
                </Label>
                <Input
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="AAAA-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {serverError && <FieldError>{serverError}</FieldError>}

              <Button onPress={onSubmit} loading={submitting} disabled={!hasApiUrl()}>
                Criar conta
              </Button>

              <View style={styles.footerRow}>
                <Muted>Já tem conta?</Muted>
                <Link href="/" asChild>
                  <Pressable hitSlop={6}>
                    <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                      {' '}Entrar
                    </Text>
                  </Pressable>
                </Link>
              </View>
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
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
});
