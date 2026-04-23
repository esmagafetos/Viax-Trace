import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { Button, Card, H1, H2, Input, Label, Muted, Pill } from '@/components/ui';
import { Radius } from '@/constants/colors';
import { apiRequest, getApiUrl, hasApiUrl, setApiUrl, testApiUrl } from '@/lib/api';

const TERMUX_STEPS: { title: string; cmd?: string; desc?: string }[] = [
  {
    title: '1. Instale o Termux (F-Droid)',
    desc: 'Baixe o Termux pela F-Droid (a versão da Play Store está desatualizada).',
  },
  {
    title: '2. Atualize os pacotes',
    cmd: 'pkg update -y && pkg upgrade -y',
  },
  {
    title: '3. Instale o ViaX:Trace',
    cmd: 'pkg install -y curl && curl -fsSL https://raw.githubusercontent.com/viax/viax-trace/main/install-termux.sh | bash',
    desc: 'O instalador baixa Node, PostgreSQL e configura tudo automaticamente.',
  },
  {
    title: '4. Inicie o servidor',
    cmd: 'bash ~/viax-system/start.sh',
    desc: 'O Termux exibirá uma URL parecida com http://192.168.x.x:8080. Copie essa URL.',
  },
  {
    title: '5. Cole a URL no campo abaixo',
    desc: 'Cole exatamente como o Termux exibiu. O app validará a conexão.',
  },
];

const TOLERANCE_PRESETS = [100, 300, 500, 1000, 2000, 5000];

const INSTANCES = [
  {
    value: 'builtin' as const,
    label: 'Padrão Gratuito',
    badge: 'Grátis',
    badgeColor: '#16a34a',
    badgeBg: 'rgba(22,163,74,0.12)',
    desc: 'Photon + Overpass + Nominatim (OSM). Zero custo, sem chave necessária.',
  },
  {
    value: 'geocodebr' as const,
    label: 'GeocodeR BR',
    badge: 'Local',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124,58,237,0.12)',
    desc: 'CNEFE/IBGE via microserviço R local. Máxima precisão para endereços brasileiros.',
  },
  {
    value: 'googlemaps' as const,
    label: 'Google Maps',
    badge: 'Pay-per-use',
    badgeColor: '#1565c0',
    badgeBg: 'rgba(21,101,192,0.12)',
    desc: 'Google Maps Geocoding API. Alta precisão global. Requer chave de API.',
  },
];

function validateGoogleMapsKey(key: string): string | null {
  if (!key) return 'Chave de API é obrigatória para usar o Google Maps.';
  if (!key.startsWith('AIza')) return 'A chave deve começar com "AIza".';
  if (key.length < 35 || key.length > 45) return 'Comprimento de chave inválido. Verifique no Google Cloud Console.';
  return null;
}

export default function SetupScreen() {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // Server config
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [savingServer, setSavingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [serverMsg, setServerMsg] = useState<string>('');

  // App settings (only relevant when authenticated)
  const [parserMode, setParserMode] = useState<'builtin' | 'ai'>('builtin');
  const [toleranceMeters, setToleranceMeters] = useState<number>(300);
  const [instanceMode, setInstanceMode] = useState<'builtin' | 'geocodebr' | 'googlemaps'>('builtin');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const mapsKeyError =
    keyTouched && instanceMode === 'googlemaps' ? validateGoogleMapsKey(googleMapsApiKey) : null;

  useEffect(() => {
    setServerUrl(getApiUrl());
  }, []);

  const onTestServer = async () => {
    setServerStatus('idle');
    setSavingServer(true);
    const r = await testApiUrl(serverUrl);
    setSavingServer(false);
    if (r.ok) {
      setServerStatus('ok');
      setServerMsg('Conexão estabelecida com o servidor.');
    } else {
      setServerStatus('fail');
      setServerMsg(r.message ?? `HTTP ${r.status ?? '???'}`);
    }
  };

  const onSaveServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('URL inválida', 'Insira a URL do servidor.');
      return;
    }
    setSavingServer(true);
    const r = await testApiUrl(serverUrl);
    if (!r.ok) {
      setSavingServer(false);
      setServerStatus('fail');
      setServerMsg(r.message ?? `HTTP ${r.status ?? '???'}`);
      Alert.alert(
        'Falha de conexão',
        'Não conseguimos acessar o servidor. Salvar mesmo assim?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salvar mesmo assim',
            onPress: async () => {
              const v = await setApiUrl(serverUrl);
              setServerUrl(v);
            },
          },
        ],
      );
      return;
    }
    const v = await setApiUrl(serverUrl);
    setServerUrl(v);
    setServerStatus('ok');
    setServerMsg('Servidor salvo com sucesso.');
    setSavingServer(false);
  };

  const showCmd = (cmd: string) => {
    Alert.alert('Comando', cmd, [{ text: 'OK' }]);
  };

  const onSaveSettings = async () => {
    if (instanceMode === 'googlemaps') {
      setKeyTouched(true);
      const err = validateGoogleMapsKey(googleMapsApiKey);
      if (err) {
        Alert.alert('Chave inválida', err);
        return;
      }
    }
    setSavingSettings(true);
    try {
      await apiRequest('/api/users/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          parserMode,
          toleranceMeters,
          instanceMode,
          googleMapsApiKey: instanceMode === 'googlemaps' ? googleMapsApiKey : null,
        }),
      });
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingSettings(false);
    }
  };

  const onSkip = () => {
    if (user) router.replace('/(tabs)/dashboard');
    else router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View>
            <View style={[styles.badge, { backgroundColor: c.accentDim }]}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 1.2 }}>
                CONFIGURAÇÃO INICIAL
              </Text>
            </View>
            <H1>
              Bem-vindo{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </H1>
            <Muted>Configure como o ViaX:Trace deve processar seus endereços.</Muted>
          </View>

          {/* === Configurar Servidor (NEW) === */}
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="server-outline" size={18} color={c.accent} />
              <H2>Configurar servidor</H2>
            </View>
            <Muted>
              O ViaX:Trace é executado no seu próprio celular via Termux. Siga os passos abaixo para iniciar o servidor
              local e obter a URL da API.
            </Muted>

            {/* Steps */}
            <View style={{ gap: 10, marginTop: 4 }}>
              {TERMUX_STEPS.map((s, i) => (
                <View key={i} style={{ gap: 6 }}>
                  <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>{s.title}</Text>
                  {s.desc && <Muted>{s.desc}</Muted>}
                  {s.cmd && (
                    <Pressable
                      onLongPress={() => showCmd(s.cmd!)}
                      style={({ pressed }) => [
                        styles.code,
                        { backgroundColor: c.surface2, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text
                        selectable
                        style={{ flex: 1, color: c.text, fontFamily: 'Poppins_400Regular', fontSize: 11 }}
                      >
                        {s.cmd}
                      </Text>
                      <Ionicons name="ellipsis-horizontal" size={14} color={c.textMuted} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            {/* API Server URL input */}
            <View style={{ gap: 6, marginTop: 6 }}>
              <Label>API Server</Label>
              <Input
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.0.10:8080"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {serverStatus !== 'idle' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={serverStatus === 'ok' ? 'checkmark-circle' : 'alert-circle'}
                    size={14}
                    color={serverStatus === 'ok' ? c.ok : '#dc2626'}
                  />
                  <Text
                    style={{
                      color: serverStatus === 'ok' ? c.ok : '#dc2626',
                      fontFamily: 'Poppins_500Medium',
                      fontSize: 12,
                    }}
                  >
                    {serverMsg}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button onPress={onTestServer} loading={savingServer} variant="ghost">
                  Testar conexão
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={onSaveServer} loading={savingServer}>
                  Salvar
                </Button>
              </View>
            </View>
          </Card>

          {/* === App settings: only show when authenticated === */}
          {user && (
            <>
              {/* Parser mode */}
              <Card style={{ gap: 12 }}>
                <Label>Modo de Parser</Label>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { value: 'builtin' as const, label: 'Parser Embutido', desc: 'Rápido, offline, sem custos extras' },
                    { value: 'ai' as const, label: 'Inteligência Artificial', desc: 'Maior precisão com IA externa' },
                  ].map((opt) => {
                    const selected = parserMode === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setParserMode(opt.value)}
                        style={[
                          styles.option,
                          {
                            flex: 1,
                            backgroundColor: selected ? c.accentDim : c.surface2,
                            borderColor: selected ? c.accent : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? c.accent : c.text,
                            fontFamily: 'Poppins_600SemiBold',
                            fontSize: 13,
                          }}
                        >
                          {opt.label}
                        </Text>
                        <Muted>{opt.desc}</Muted>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              {/* Instance mode */}
              <Card style={{ gap: 12 }}>
                <Label>Motor de Geocodificação</Label>
                <View style={{ gap: 8 }}>
                  {INSTANCES.map((opt) => {
                    const selected = instanceMode === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          setInstanceMode(opt.value);
                          setKeyTouched(false);
                        }}
                        style={[
                          styles.option,
                          {
                            backgroundColor: selected ? c.accentDim : c.surface2,
                            borderColor: selected ? c.accent : c.border,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={{
                              color: selected ? c.accent : c.text,
                              fontFamily: 'Poppins_600SemiBold',
                              fontSize: 13,
                            }}
                          >
                            {opt.label}
                          </Text>
                          <Muted>{opt.desc}</Muted>
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 99,
                            backgroundColor: opt.badgeBg,
                          }}
                        >
                          <Text
                            style={{
                              color: opt.badgeColor,
                              fontFamily: 'Poppins_600SemiBold',
                              fontSize: 9,
                              letterSpacing: 0.5,
                            }}
                          >
                            {opt.badge}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {instanceMode === 'googlemaps' && (
                  <View
                    style={{
                      backgroundColor: 'rgba(21,101,192,0.06)',
                      borderColor: 'rgba(21,101,192,0.2)',
                      borderWidth: 1,
                      borderRadius: Radius.md,
                      padding: 12,
                      gap: 6,
                    }}
                  >
                    <Label>Chave de API do Google Maps</Label>
                    <Input
                      value={googleMapsApiKey}
                      onChangeText={setGoogleMapsApiKey}
                      onBlur={() => setKeyTouched(true)}
                      placeholder="AIzaSy..."
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    {mapsKeyError && (
                      <Text style={{ color: c.accent, fontFamily: 'Poppins_500Medium', fontSize: 11 }}>
                        {mapsKeyError}
                      </Text>
                    )}
                    <Muted>
                      Habilite a Geocoding API no Google Cloud Console. A chave é armazenada de forma segura.
                    </Muted>
                  </View>
                )}

                {instanceMode === 'geocodebr' && (
                  <View
                    style={{
                      backgroundColor: 'rgba(124,58,237,0.06)',
                      borderColor: 'rgba(124,58,237,0.2)',
                      borderWidth: 1,
                      borderRadius: Radius.md,
                      padding: 12,
                    }}
                  >
                    <Muted>
                      O microserviço geocodebr precisa estar rodando localmente (porta 8002). Configure GEOCODEBR_URL no
                      servidor. Você pode ajustar isso depois em Ajustes.
                    </Muted>
                  </View>
                )}
              </Card>

              {/* Tolerance */}
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Label>Tolerância de Coordenadas</Label>
                  <Pill tone="accent">{toleranceMeters}m</Pill>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TOLERANCE_PRESETS.map((v) => {
                    const selected = toleranceMeters === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setToleranceMeters(v)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: Radius.pill,
                          backgroundColor: selected ? c.accentDim : c.surface2,
                          borderWidth: 1,
                          borderColor: selected ? c.accent : c.border,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? c.accent : c.text,
                            fontFamily: 'Poppins_600SemiBold',
                            fontSize: 12,
                          }}
                        >
                          {v}m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Muted>
                  Distância máxima entre a coordenada GPS e o endereço oficial para aceitar como correto.
                </Muted>
              </Card>

              <Button onPress={onSaveSettings} loading={savingSettings}>
                Continuar para o Painel
              </Button>
            </>
          )}

          <Pressable onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
              {user ? 'Pular por agora' : 'Voltar para o login'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 16 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 6,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  option: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
  },
});
