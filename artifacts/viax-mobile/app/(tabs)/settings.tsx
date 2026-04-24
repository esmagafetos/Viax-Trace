import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  Pressable,
  Linking,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { apiRequest, getApiUrl, uploadAvatar } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { H1, Muted, Label, Input, Button, FieldError, Slider, DateInput } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { formatBRL } from '@/lib/format';

type Tab = 'perfil' | 'financeiro' | 'instancias' | 'parser' | 'tolerancia' | 'sobre';

type SettingsData = {
  parserMode: 'builtin' | 'ai';
  aiProvider: string | null;
  aiApiKey: string | null;
  toleranceMeters: number;
  instanceMode: 'builtin' | 'geocodebr' | 'googlemaps';
  googleMapsApiKey: string | null;
  valorPorRota: number | null;
  cicloPagamentoDias: number;
  metaMensalRotas: number | null;
  despesasFixasMensais: number | null;
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'instancias', label: 'Instâncias' },
  { id: 'parser', label: 'Parser' },
  { id: 'tolerancia', label: 'Tolerância' },
  { id: 'sobre', label: 'Sobre' },
];

const CICLO_OPTS = [
  { value: 7, label: 'Semanal (7 dias)' },
  { value: 14, label: 'Quinzenal (14 dias)' },
  { value: 30, label: 'Mensal (30 dias)' },
];

const TOLERANCE_PRESETS = [100, 300, 500, 1000, 2000, 5000];

export default function SettingsScreen() {
  const c = useColors();
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (TABS.find((t) => t.id === params.tab)?.id ?? 'perfil') as Tab;
  const [active, setActive] = useState<Tab>(initialTab);

  useEffect(() => {
    const next = TABS.find((t) => t.id === params.tab)?.id as Tab | undefined;
    if (next) setActive(next);
  }, [params.tab]);

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ['/api/users/settings'],
    queryFn: () => apiRequest<SettingsData>('/api/users/settings'),
  });

  const onLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <H1>Configurações</H1>
          <Muted>Perfil, financeiro, instâncias, parser e tolerância.</Muted>
        </View>

        {/* Tab strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, paddingBottom: 1 }}
          style={[styles.tabBar, { borderBottomColor: c.borderStrong }]}
        >
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActive(t.id)}
                style={({ pressed }) => [
                  styles.tabBtn,
                  {
                    borderBottomColor: isActive ? c.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? c.accent : c.textMuted,
                    fontFamily: isActive ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                    fontSize: 13,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {active === 'perfil' && <PerfilTab user={user} onUpdated={refresh} />}
        {active === 'financeiro' && (
          <FinanceiroTab settings={settings} loading={isLoading} queryClient={queryClient} />
        )}
        {active === 'instancias' && (
          <InstanciasTab settings={settings} loading={isLoading} queryClient={queryClient} />
        )}
        {active === 'parser' && (
          <ParserTab settings={settings} loading={isLoading} queryClient={queryClient} />
        )}
        {active === 'tolerancia' && (
          <ToleranciaTab settings={settings} loading={isLoading} queryClient={queryClient} />
        )}
        {active === 'sobre' && <SobreTab />}

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logout,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────── helpers ─────────────── */

function PanelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={[panel.wrap, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
      <View style={[panel.head, { borderBottomColor: c.border }]}>
        <Text style={[panel.headLabel, { color: c.textMuted }]}>{title}</Text>
      </View>
      <View style={panel.body}>{children}</View>
    </View>
  );
}

function useSaveSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return async (patch: Partial<SettingsData>) => {
    try {
      await apiRequest('/api/users/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/users/settings'] });
      toast.showToast('Configurações atualizadas.', 'success');
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao salvar.');
    }
  };
}

/* ─────────────── tabs ─────────────── */

function PerfilTab({ user, onUpdated }: { user: any; onUpdated: () => Promise<void> }) {
  const c = useColors();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.showToast('Permissão da galeria negada.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as unknown as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);
      const mime = asset.mimeType ?? 'image/jpeg';
      const ext = mime.split('/')[1] ?? 'jpg';
      await uploadAvatar(asset.uri, mime, `avatar.${ext}`);
      await onUpdated();
      toast.showToast('Foto atualizada.', 'success');
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao enviar foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    setName(user?.name ?? '');
    setBirthDate(user?.birthDate ?? '');
  }, [user?.name, user?.birthDate]);

  const initial = (name || user?.email || 'U').charAt(0).toUpperCase();

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiRequest('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, birthDate: birthDate || null }),
      });
      await onUpdated();
      toast.showToast('Perfil atualizado.', 'success');
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.showToast('As senhas não coincidem.');
      return;
    }
    if (newPwd.length < 6) {
      toast.showToast('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSavingPwd(true);
    try {
      await apiRequest('/api/users/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      toast.showToast('Senha alterada com sucesso.', 'success');
    } catch (e: any) {
      toast.showToast(e?.message ?? 'Falha ao alterar senha.');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <PanelCard title="Foto e informações">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[avatarStyles.box, { backgroundColor: c.accentDim, borderColor: c.borderStrong }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={avatarStyles.img} />
            ) : (
              <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: 22 }}>
                {initial}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
              Foto de perfil
            </Text>
            <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              Toque em "Atualizar" para escolher uma imagem da galeria.
            </Text>
            <View style={{ height: 8 }} />
            <Pressable
              onPress={pickAvatar}
              disabled={uploadingAvatar}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.borderStrong,
                opacity: uploadingAvatar ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              <Ionicons
                name={uploadingAvatar ? 'cloud-upload-outline' : 'image-outline'}
                size={14}
                color={c.text}
              />
              <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
                {uploadingAvatar ? 'Enviando…' : 'Atualizar foto'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 12 }} />
        <Label>Nome</Label>
        <Input value={name} onChangeText={setName} placeholder="Seu nome" />

        <View style={{ height: 10 }} />
        <Label>Data de nascimento</Label>
        <DateInput value={birthDate} onChange={setBirthDate} />

        <View style={{ height: 10 }} />
        <Label>Email</Label>
        <Input value={user?.email ?? ''} editable={false} style={{ opacity: 0.6 }} />

        <View style={{ height: 14 }} />
        <Button onPress={saveProfile} loading={savingProfile}>
          Salvar perfil
        </Button>
      </PanelCard>

      <PanelCard title="Alterar senha">
        <Label>Senha atual</Label>
        <Input
          value={currentPwd}
          onChangeText={setCurrentPwd}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
        />
        <View style={{ height: 10 }} />
        <Label>Nova senha</Label>
        <Input
          value={newPwd}
          onChangeText={setNewPwd}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
        />
        <View style={{ height: 10 }} />
        <Label>Confirmar nova senha</Label>
        <Input
          value={confirmPwd}
          onChangeText={setConfirmPwd}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
        />
        {confirmPwd && confirmPwd !== newPwd && <FieldError>As senhas não coincidem.</FieldError>}

        <View style={{ height: 14 }} />
        <Button onPress={savePassword} loading={savingPwd} variant="dark">
          Alterar senha
        </Button>
      </PanelCard>
    </View>
  );
}

function FinanceiroTab({
  settings,
  loading,
}: {
  settings: SettingsData | undefined;
  loading: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const c = useColors();
  const save = useSaveSettings();
  const [valorPorRota, setValorPorRota] = useState('');
  const [ciclo, setCiclo] = useState(30);
  const [meta, setMeta] = useState('');
  const [despesas, setDespesas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setValorPorRota(settings.valorPorRota != null ? String(settings.valorPorRota) : '');
      setCiclo(settings.cicloPagamentoDias ?? 30);
      setMeta(settings.metaMensalRotas != null ? String(settings.metaMensalRotas) : '');
      setDespesas(settings.despesasFixasMensais != null ? String(settings.despesasFixasMensais) : '');
    }
  }, [settings]);

  const onSave = async () => {
    setSaving(true);
    await save({
      valorPorRota: valorPorRota ? Number(valorPorRota) : null,
      cicloPagamentoDias: ciclo,
      metaMensalRotas: meta ? Number(meta) : null,
      despesasFixasMensais: despesas ? Number(despesas) : null,
    });
    setSaving(false);
  };

  if (loading) return <PanelCard title="Controle de renda"><Muted>Carregando…</Muted></PanelCard>;

  const previa =
    valorPorRota && meta
      ? formatBRL((Number(meta) * Number(valorPorRota) * ciclo) / 30)
      : null;

  return (
    <PanelCard title="Controle de renda">
      <Muted>
        Configure sua remuneração por rota e despesas. As informações alimentam o gráfico financeiro do dashboard.
      </Muted>

      <View style={{ height: 14 }} />
      <Label>Valor por rota (R$)</Label>
      <Input
        value={valorPorRota}
        onChangeText={setValorPorRota}
        placeholder="ex: 12.50"
        keyboardType="decimal-pad"
      />

      <View style={{ height: 12 }} />
      <Label>Ciclo de pagamento</Label>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {CICLO_OPTS.map((opt) => {
          const isActive = ciclo === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setCiclo(opt.value)}
              style={({ pressed }) => [
                chipStyles.chip,
                {
                  backgroundColor: isActive ? c.accentDim : c.surface2,
                  borderColor: isActive ? c.accent : c.borderStrong,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? c.accent : c.textMuted,
                  fontFamily: 'Poppins_500Medium',
                  fontSize: 12,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 14 }} />
      <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, gap: 10 }}>
        <Text style={{ color: c.textMuted, fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Despesas e metas
        </Text>
        <View>
          <Label>Meta mensal de rotas</Label>
          <Input
            value={meta}
            onChangeText={setMeta}
            placeholder="ex: 200"
            keyboardType="number-pad"
          />
        </View>
        <View>
          <Label>Despesas fixas mensais (R$)</Label>
          <Input
            value={despesas}
            onChangeText={setDespesas}
            placeholder="ex: 450.00"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {previa && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: c.accentDim, borderWidth: 1, borderColor: 'rgba(212,82,26,0.25)' }}>
          <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginBottom: 4 }}>
            Prévia por ciclo
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18 }}>
            Receita estimada: <Text style={{ fontFamily: 'Poppins_700Bold' }}>{previa}</Text>
          </Text>
        </View>
      )}

      <View style={{ height: 14 }} />
      <Button onPress={onSave} loading={saving}>
        Salvar financeiro
      </Button>
    </PanelCard>
  );
}

function InstanciasTab({
  settings,
  loading,
}: {
  settings: SettingsData | undefined;
  loading: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const c = useColors();
  const save = useSaveSettings();
  const [mode, setMode] = useState<SettingsData['instanceMode']>('builtin');
  const [mapsKey, setMapsKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setMode(settings.instanceMode ?? 'builtin');
      setMapsKey(settings.googleMapsApiKey ?? '');
    }
  }, [settings]);

  const onSave = async () => {
    setSaving(true);
    await save({ instanceMode: mode, googleMapsApiKey: mapsKey || null });
    setSaving(false);
  };

  if (loading) return <PanelCard title="Instância de geocodificação"><Muted>Carregando…</Muted></PanelCard>;

  const opts = [
    {
      value: 'builtin' as const,
      label: 'Padrão Gratuito',
      badge: 'Grátis',
      badgeColor: c.ok,
      badgeBg: 'rgba(46,168,99,0.15)',
      desc: 'Photon + Overpass + Nominatim (OSM) + BrasilAPI. Zero custo, sem chave.',
      icon: 'globe-outline' as const,
    },
    {
      value: 'geocodebr' as const,
      label: 'GeocodeR BR',
      badge: 'Local / CNEFE',
      badgeColor: '#7c3aed',
      badgeBg: 'rgba(124,58,237,0.12)',
      desc: 'Microserviço R via CNEFE/IBGE. Precisão máxima para BR, roda local.',
      icon: 'home-outline' as const,
    },
    {
      value: 'googlemaps' as const,
      label: 'Google Maps',
      badge: 'Pay-per-use',
      badgeColor: '#1565c0',
      badgeBg: 'rgba(21,101,192,0.12)',
      desc: 'Google Maps Geocoding. Alta precisão global. Requer chave paga.',
      icon: 'location-outline' as const,
    },
  ];

  const mapsKeyError =
    mapsKey && !mapsKey.startsWith('AIza')
      ? 'A chave deve começar com "AIza".'
      : mapsKey && (mapsKey.length < 35 || mapsKey.length > 45)
        ? 'Comprimento inválido.'
        : null;

  return (
    <PanelCard title="Instância de geocodificação">
      <Muted>Escolha o serviço usado para validar endereços.</Muted>

      <View style={{ height: 12 }} />
      <View style={{ gap: 8 }}>
        {opts.map((opt) => {
          const isActive = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={({ pressed }) => [
                {
                  borderWidth: 2,
                  borderColor: isActive ? c.accent : c.borderStrong,
                  backgroundColor: isActive ? c.accentDim : c.surface2,
                  borderRadius: 12,
                  padding: 12,
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={isActive ? c.accent : c.textMuted}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Text
                    style={{
                      color: isActive ? c.accent : c.text,
                      fontFamily: 'Poppins_700Bold',
                      fontSize: 13,
                    }}
                  >
                    {opt.label}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1.5,
                      borderRadius: 99,
                      backgroundColor: opt.badgeBg,
                    }}
                  >
                    <Text style={{ color: opt.badgeColor, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.4 }}>
                      {opt.badge}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16 }}>
                  {opt.desc}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {mode === 'googlemaps' && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(21,101,192,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(21,101,192,0.25)',
          }}
        >
          <Label>Chave de API do Google Maps</Label>
          <Input
            value={mapsKey}
            onChangeText={setMapsKey}
            secureTextEntry
            autoCapitalize="none"
            placeholder="AIzaSy..."
            hasError={!!mapsKeyError}
          />
          {mapsKeyError && <FieldError>{mapsKeyError}</FieldError>}
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16, marginTop: 8 }}>
            A chave deve começar com{' '}
            <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>AIza</Text>{' '}
            e ter entre 35 e 45 caracteres. Crie uma em{' '}
            <Text
              onPress={() => Linking.openURL('https://console.cloud.google.com/google/maps-apis/credentials')}
              style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' }}
            >
              console.cloud.google.com
            </Text>
            .
          </Text>
        </View>
      )}

      {mode === 'geocodebr' && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(124,58,237,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.25)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="information-circle-outline" size={14} color="#7c3aed" />
            <Text style={{ color: '#7c3aed', fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.3 }}>
              Como ativar o GeocodeR BR
            </Text>
          </View>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 17 }}>
            O microserviço precisa estar rodando localmente na porta{' '}
            <Text style={{ fontFamily: 'Poppins_700Bold' }}>8002</Text>. Configure a variável de ambiente{' '}
            <Text style={{ fontFamily: 'Poppins_500Medium', color: c.text }}>
              GEOCODEBR_URL=http://localhost:8002
            </Text>{' '}
            no servidor da API.
          </Text>
          <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            Via Docker:
          </Text>
          <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text selectable style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 10.5, lineHeight: 16 }}>
              docker run -p 8002:8002 -v geocodebr-cache:/root/.cache viax-geocodebr
            </Text>
          </View>
          <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            Via Termux (Android):
          </Text>
          <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text selectable style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 10.5, lineHeight: 16 }}>
              bash ~/viax-system/start-geocodebr.sh
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 14 }} />
      <Button onPress={onSave} loading={saving}>
        Salvar instância
      </Button>
    </PanelCard>
  );
}

function ParserTab({
  settings,
  loading,
}: {
  settings: SettingsData | undefined;
  loading: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const c = useColors();
  const save = useSaveSettings();
  const [mode, setMode] = useState<'builtin' | 'ai'>('builtin');
  const [aiProvider, setAiProvider] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setMode(settings.parserMode ?? 'builtin');
      setAiProvider(settings.aiProvider ?? '');
      setAiKey(settings.aiApiKey ?? '');
    }
  }, [settings]);

  const onSave = async () => {
    setSaving(true);
    await save({ parserMode: mode, aiProvider: aiProvider || null, aiApiKey: aiKey || null });
    setSaving(false);
  };

  if (loading) return <PanelCard title="Configuração do parser"><Muted>Carregando…</Muted></PanelCard>;

  const providers = [
    { value: 'openai', label: 'OpenAI (GPT-4o mini)' },
    { value: 'anthropic', label: 'Anthropic (Claude Haiku)' },
    { value: 'google', label: 'Google (Gemini 1.5 Flash)' },
  ];

  return (
    <PanelCard title="Configuração do parser">
      <Label>Modo de processamento</Label>
      <View style={{ gap: 8 }}>
        {[
          { value: 'builtin' as const, label: 'Parser embutido', desc: 'Algoritmo próprio, offline, zero custo.' },
          { value: 'ai' as const, label: 'Inteligência Artificial', desc: 'Maior precisão usando IA externa.' },
        ].map((opt) => {
          const isActive = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={({ pressed }) => [
                {
                  borderWidth: 1,
                  borderColor: isActive ? c.accent : c.borderStrong,
                  backgroundColor: isActive ? c.accentDim : c.surface2,
                  borderRadius: 10,
                  padding: 12,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? c.accent : c.text,
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 13,
                  marginBottom: 3,
                }}
              >
                {opt.label}
              </Text>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11 }}>
                {opt.desc}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'ai' && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: c.surface2,
            borderWidth: 1,
            borderColor: c.borderStrong,
            gap: 10,
          }}
        >
          <View>
            <Label>Provedor de IA</Label>
            <View style={{ gap: 6 }}>
              {providers.map((p) => {
                const isActive = aiProvider === p.value;
                return (
                  <Pressable
                    key={p.value}
                    onPress={() => setAiProvider(p.value)}
                    style={({ pressed }) => [
                      {
                        borderWidth: 1,
                        borderColor: isActive ? c.accent : c.borderStrong,
                        backgroundColor: isActive ? c.accentDim : c.bg,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isActive ? c.accent : c.text,
                        fontFamily: 'Poppins_500Medium',
                        fontSize: 12,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <Label>Chave de API</Label>
            <Input
              value={aiKey}
              onChangeText={setAiKey}
              secureTextEntry
              autoCapitalize="none"
              placeholder="sk-... ou AIza..."
            />
          </View>
        </View>
      )}

      <View style={{ height: 14 }} />
      <Button onPress={onSave} loading={saving}>
        Salvar parser
      </Button>
    </PanelCard>
  );
}

function ToleranciaTab({
  settings,
  loading,
}: {
  settings: SettingsData | undefined;
  loading: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const c = useColors();
  const save = useSaveSettings();
  const [tol, setTol] = useState(300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setTol(settings.toleranceMeters ?? 300);
  }, [settings]);

  const onSave = async () => {
    setSaving(true);
    await save({ toleranceMeters: tol });
    setSaving(false);
  };

  if (loading) return <PanelCard title="Tolerância de coordenadas"><Muted>Carregando…</Muted></PanelCard>;

  const label =
    tol <= 200 ? 'Rigoroso' : tol <= 800 ? 'Moderado' : tol <= 2000 ? 'Flexível' : 'Muito flexível';
  const desc =
    tol <= 200
      ? 'Aceita apenas endereços muito próximos da coordenada. Mais nuances detectadas.'
      : tol <= 800
        ? 'Configuração balanceada para uso geral em áreas urbanas.'
        : tol <= 2000
          ? 'Aceita divergências maiores. Útil em áreas rurais ou GPS impreciso.'
          : 'Muito permissivo. Pode reduzir a qualidade da validação.';

  return (
    <PanelCard title="Tolerância de coordenadas">
      <Muted>
        Distância máxima (metros) entre o GPS do arquivo e o endereço oficial para ser considerado correto.
      </Muted>

      <View style={{ height: 14 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Distância de tolerância</Label>
        <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>
          {tol}m
        </Text>
      </View>

      <View style={{ marginTop: 4 }}>
        <Slider min={100} max={5000} step={100} value={tol} onChange={setTol} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10 }}>
            100m
          </Text>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10 }}>
            5000m
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {TOLERANCE_PRESETS.map((p) => {
          const isActive = tol === p;
          return (
            <Pressable
              key={p}
              onPress={() => setTol(p)}
              style={({ pressed }) => [
                chipStyles.chip,
                {
                  backgroundColor: isActive ? c.accentDim : c.surface2,
                  borderColor: isActive ? c.accent : c.borderStrong,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? c.accent : c.textMuted,
                  fontFamily: 'Poppins_500Medium',
                  fontSize: 12,
                }}
              >
                {p}m
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border }}>
        <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16 }}>
          {desc}
        </Text>
      </View>

      <View style={{ height: 14 }} />
      <Button onPress={onSave} loading={saving}>
        Salvar tolerância
      </Button>
    </PanelCard>
  );
}

function SobreTab() {
  const c = useColors();
  const apiUrl = getApiUrl();
  const version = Constants.expoConfig?.version ?? '—';

  const links = [
    {
      href: 'https://github.com/esmagafetos/Viax-Scout',
      label: 'GitHub — esmagafetos/Viax-Scout',
      sub: 'Código-fonte, issues e releases',
      badge: 'Open Source',
      badgeColor: '#16a34a',
      badgeBg: 'rgba(22,163,74,0.12)',
      icon: 'logo-github' as const,
    },
    {
      href: 'https://github.com/esmagafetos/Viax-Scout/blob/main/README.md',
      label: 'Documentação',
      sub: 'Guia de instalação e uso',
      badge: 'Docs',
      badgeColor: '#1d4ed8',
      badgeBg: 'rgba(29,78,216,0.12)',
      icon: 'document-text-outline' as const,
    },
    {
      href: 'https://github.com/esmagafetos/Viax-Scout/issues',
      label: 'Issues & Suporte',
      sub: 'Reporte bugs ou tire dúvidas',
      badge: 'Issues',
      badgeColor: '#b45309',
      badgeBg: 'rgba(180,83,9,0.12)',
      icon: 'alert-circle-outline' as const,
    },
    {
      href: 'https://github.com/esmagafetos/Viax-Scout/releases',
      label: 'Releases & Changelog',
      sub: 'Histórico de versões',
      badge: 'v8.0',
      badgeColor: '#d4521a',
      badgeBg: 'rgba(212,82,26,0.12)',
      icon: 'pricetag-outline' as const,
    },
  ];

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          borderRadius: 14,
          padding: 18,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.borderStrong,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.5 }}>
            ViaX<Text style={{ color: c.textFaint }}>:</Text>Trace
          </Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: c.accentDim }}>
            <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.5 }}>
              v8.0
            </Text>
          </View>
        </View>
        <Text style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          Auditoria de rotas logísticas que valida endereços contra coordenadas GPS reais via geocodificação reversa.
        </Text>
      </View>

      <PanelCard title="Repositório & Documentação">
        <View style={{ gap: 8 }}>
          {links.map((l) => (
            <Pressable
              key={l.href}
              onPress={() => Linking.openURL(l.href)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 11,
                  borderRadius: 10,
                  backgroundColor: c.surface2,
                  borderWidth: 1,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name={l.icon} size={16} color={c.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>{l.label}</Text>
                <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }}>
                  {l.sub}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: l.badgeBg }}>
                <Text style={{ color: l.badgeColor, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.4 }}>
                  {l.badge}
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={c.textFaint} />
            </Pressable>
          ))}
        </View>
      </PanelCard>

      <PanelCard title="Servidor configurado">
        <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }} numberOfLines={1}>
          {apiUrl || 'Não configurado'}
        </Text>
      </PanelCard>

      <PanelCard title="Stack Tecnológico">
        <View style={{ gap: 6 }}>
          {[
            { layer: 'Mobile', tech: 'Expo SDK 54 + React Native 0.81', detail: 'expo-router, TanStack Query, Poppins, react-native-svg' },
            { layer: 'Frontend Web', tech: 'React 18 + Vite', detail: 'TypeScript, Tailwind CSS, Wouter' },
            { layer: 'Backend', tech: 'Express 5', detail: 'TypeScript, REST API, pino logger' },
            { layer: 'Banco de Dados', tech: 'PostgreSQL', detail: 'Drizzle ORM, migrações automáticas' },
            { layer: 'Monorepo', tech: 'pnpm workspaces', detail: 'Libs compartilhadas, builds isolados' },
            { layer: 'Geocod. Brasil (CEP)', tech: 'BrasilAPI v2', detail: 'Primário BR — IBGE/Correios, lat/lon' },
            { layer: 'Geocod. Brasil (CEP)', tech: 'AwesomeAPI CEP', detail: 'Fallback BR — lat/lon gratuito' },
            { layer: 'Geocod. Global', tech: 'Photon (Komoot)', detail: 'Sem rate limit, dados OSM' },
            { layer: 'Geocod. Global', tech: 'Overpass + Nominatim', detail: 'Fallback — geometria OSM precisa' },
            { layer: 'Premium opcional', tech: 'Google Maps API', detail: 'Máxima precisão, pay-per-use' },
          ].map((item, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 }}>
                {item.layer}
              </Text>
              <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 12.5, marginBottom: 1 }}>
                {item.tech}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 15 }}>
                {item.detail}
              </Text>
            </View>
          ))}
        </View>
      </PanelCard>

      <PanelCard title="Instalação">
        <Muted>
          Scripts de instalação automática estão disponíveis no repositório para Linux, macOS, Windows e Android (Termux). Cada script instala dependências, configura o banco e inicia o sistema completo.
        </Muted>
        <View style={{ height: 12 }} />
        <View style={{ gap: 8 }}>
          {[
            {
              platform: 'Linux / macOS',
              cmd: 'curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.sh | bash',
              icon: 'desktop-outline' as const,
            },
            {
              platform: 'Windows (PowerShell)',
              cmd: 'iwr -useb https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.ps1 | iex',
              icon: 'logo-windows' as const,
            },
            {
              platform: 'Android — Termux',
              cmd: 'curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-termux.sh | bash',
              icon: 'phone-portrait-outline' as const,
            },
          ].map((item) => (
            <View
              key={item.platform}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name={item.icon} size={14} color={c.textMuted} />
                <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
                  {item.platform}
                </Text>
              </View>
              <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 7 }}>
                <Text selectable style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 10.5, lineHeight: 15 }}>
                  {item.cmd}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10.5, marginTop: 10, lineHeight: 15 }}>
          Pré-requisitos:{' '}
          <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>Node.js 18+</Text>,{' '}
          <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>pnpm</Text> e{' '}
          <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>PostgreSQL 14+</Text>. O script instala automaticamente o que estiver faltando (requer conexão com internet).
        </Text>
      </PanelCard>

      <PanelCard title="Versão & Licença">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: c.textFaint, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              App
            </Text>
            <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginTop: 2 }}>
              v{version}
            </Text>
          </View>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: c.textFaint, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Licença
            </Text>
            <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginTop: 2 }}>
              MIT License
            </Text>
          </View>
        </View>
      </PanelCard>
    </View>
  );
}

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 13,
    marginTop: 4,
  },
});

const panel = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  head: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  headLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: { padding: 14 },
});

const avatarStyles = StyleSheet.create({
  box: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
});

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
});
