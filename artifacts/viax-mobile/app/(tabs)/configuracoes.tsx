import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import SliderRaw from "@react-native-community/slider";
const Slider = SliderRaw as any;
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import type { User, UserSettings, ParserMode, InstanceMode } from "@/lib/types";

type Tab = "perfil" | "financeiro" | "instancias" | "parser" | "tolerancia" | "sobre";

const CICLO_OPTS: { value: number; label: string }[] = [
  { value: 7, label: "Semanal (7d)" },
  { value: 14, label: "Quinzenal (14d)" },
  { value: 30, label: "Mensal (30d)" },
];

export default function ConfiguracoesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser, logout, serverUrl } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "financeiro", label: "Financeiro" },
    { id: "instancias", label: "Instâncias" },
    { id: "parser", label: "Parser" },
    { id: "tolerancia", label: "Tolerância" },
    { id: "sobre", label: "Sobre" },
  ];

  // Profile state
  const [name, setName] = useState(user?.name ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setBirthDate(user?.birthDate ?? "");
  }, [user]);

  // Settings state
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<UserSettings>("/users/settings") });
  const [parserMode, setParserMode] = useState<ParserMode>("builtin");
  const [aiProvider, setAiProvider] = useState<string>("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [toleranceMeters, setToleranceMeters] = useState(300);
  const [instanceMode, setInstanceMode] = useState<InstanceMode>("builtin");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [mapsKeyTouched, setMapsKeyTouched] = useState(false);
  const [valorPorRota, setValorPorRota] = useState("");
  const [cicloPagamentoDias, setCicloPagamentoDias] = useState(30);
  const [metaMensalRotas, setMetaMensalRotas] = useState("");
  const [despesasFixasMensais, setDespesasFixasMensais] = useState("");

  useEffect(() => {
    if (settings.data) {
      const s = settings.data;
      setParserMode(s.parserMode ?? "builtin");
      setAiProvider(s.aiProvider ?? "");
      setAiApiKey(s.aiApiKey ?? "");
      setToleranceMeters(s.toleranceMeters ?? 300);
      setInstanceMode(s.instanceMode ?? "builtin");
      setGoogleMapsApiKey(s.googleMapsApiKey ?? "");
      setValorPorRota(s.valorPorRota != null ? String(s.valorPorRota) : "");
      setCicloPagamentoDias(s.cicloPagamentoDias ?? 30);
      setMetaMensalRotas(s.metaMensalRotas != null ? String(s.metaMensalRotas) : "");
      setDespesasFixasMensais(s.despesasFixasMensais != null ? String(s.despesasFixasMensais) : "");
    }
  }, [settings.data]);

  // Mutations
  const saveProfile = useMutation({
    mutationFn: () => api<User>("/users/profile", {
      method: "PATCH",
      body: { name: name.trim(), birthDate: birthDate || null },
    }),
    onSuccess: async () => { show("Perfil atualizado!", "success"); await refreshUser(); },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao atualizar perfil.", "error"),
  });

  const savePwd = useMutation({
    mutationFn: () => api("/users/password", {
      method: "PATCH",
      body: { currentPassword: pwdCurrent, newPassword: pwdNew },
    }),
    onSuccess: () => { show("Senha alterada!", "success"); setPwdCurrent(""); setPwdNew(""); setPwdConfirm(""); },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao alterar senha.", "error"),
  });

  const saveSettings = useMutation({
    mutationFn: () => api("/users/settings", {
      method: "PATCH",
      body: {
        parserMode,
        aiProvider: aiProvider || null,
        aiApiKey: aiApiKey || null,
        toleranceMeters,
        instanceMode,
        googleMapsApiKey: googleMapsApiKey || null,
        valorPorRota: valorPorRota ? Number(valorPorRota) : null,
        cicloPagamentoDias,
        metaMensalRotas: metaMensalRotas ? Number(metaMensalRotas) : null,
        despesasFixasMensais: despesasFixasMensais ? Number(despesasFixasMensais) : null,
      },
    }),
    onSuccess: () => {
      show("Configurações salvas!", "success");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => show(e instanceof ApiError ? e.message : "Erro ao salvar.", "error"),
  });

  const onChangeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { show("Permissão negada.", "error"); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    try {
      const form = new FormData();
      form.append("avatar", { uri: asset.uri, name: "avatar.jpg", type: "image/jpeg" } as any);
      await api("/users/avatar", { method: "POST", formData: form });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show("Foto atualizada!", "success");
      await refreshUser();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Erro ao enviar avatar.", "error");
    }
  };

  const onChangePassword = () => {
    if (pwdNew.length < 6) { show("Senha mínima de 6 caracteres.", "error"); return; }
    if (pwdNew !== pwdConfirm) { show("As senhas não coincidem.", "error"); return; }
    savePwd.mutate();
  };

  const confirmLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  };

  const changeServer = () => {
    Alert.alert("Trocar servidor", "Você será desconectado para configurar um novo servidor.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Continuar", onPress: async () => { await logout(); router.replace("/setup"); } },
    ]);
  };

  const avatarUrl = useMemo(() => {
    if (!user?.avatarUrl) return null;
    if (user.avatarUrl.startsWith("http") || user.avatarUrl.startsWith("data:")) return user.avatarUrl;
    return `${serverUrl}${user.avatarUrl}`;
  }, [user?.avatarUrl, serverUrl]);

  const mapsKeyError = mapsKeyTouched && googleMapsApiKey && !googleMapsApiKey.startsWith("AIza")
    ? 'A chave deve começar com "AIza".'
    : mapsKeyTouched && googleMapsApiKey && (googleMapsApiKey.length < 35 || googleMapsApiKey.length > 45)
    ? "Comprimento inválido. Verifique no Google Cloud Console."
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: insets.bottom + 96 }}
    >
      {/* Title row with avatar upper-right */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 22, color: t.text, letterSpacing: -0.5 }}>Configurações</Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, marginTop: 3 }}>
            Perfil, financeiro, instâncias, parser e tolerância.
          </Text>
        </View>
        <Pressable onPress={onChangeAvatar} hitSlop={8} style={{ marginLeft: 12 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: t.accentDim,
            borderWidth: 2, borderColor: t.borderStrong,
            alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44 }} />
            ) : (
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: t.accent }}>
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      {/* Tabs scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -16, paddingHorizontal: 16 }} contentContainerStyle={{ gap: 4, borderBottomWidth: 1, borderBottomColor: t.borderStrong }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => { setActiveTab(tab.id); void Haptics.selectionAsync(); }}
              style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: active ? t.accent : "transparent" }}>
              <Text style={{ fontFamily: active ? "Poppins_600SemiBold" : "Poppins_400Regular", fontSize: 13, color: active ? t.accent : t.textMuted }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* PERFIL */}
      {activeTab === "perfil" && (
        <View>
          <SectionCard title="Foto e Informações">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <Pressable onPress={onChangeAvatar} hitSlop={8}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32, backgroundColor: t.accentDim,
                  borderWidth: 2, borderColor: t.borderStrong,
                  alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64 }} />
                    : <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 22, color: t.accent }}>{(user?.name ?? "U").charAt(0).toUpperCase()}</Text>}
                </View>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text, marginBottom: 3 }}>Foto de Perfil</Text>
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginBottom: 8 }}>JPG, PNG, WEBP ou GIF · máx 2 MB</Text>
                <Pressable onPress={onChangeAvatar} style={({ pressed }) => ({
                  alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
                  paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
                  backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderStrong, opacity: pressed ? 0.8 : 1,
                })}>
                  <Ionicons name="image-outline" size={13} color={t.textMuted} />
                  <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.textMuted }}>Escolher da galeria</Text>
                </Pressable>
              </View>
            </View>

            <Field label="Nome">
              <TextInput value={name} onChangeText={setName} style={inputStyle(t)} />
            </Field>
            <View style={{ height: 12 }} />
            <Field label="Data de Nascimento">
              <TextInput value={birthDate ?? ""} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <View style={{ height: 12 }} />
            <Field label="Email">
              <TextInput value={user?.email ?? ""} editable={false} style={[inputStyle(t), { opacity: 0.55 }]} />
            </Field>
            <View style={{ height: 14 }} />
            <SaveBtn label="Salvar Perfil" loading={saveProfile.isPending} onPress={() => saveProfile.mutate()} />
          </SectionCard>

          <SectionCard title="Alterar Senha">
            <Field label="Senha Atual">
              <TextInput value={pwdCurrent} onChangeText={setPwdCurrent} secureTextEntry placeholder="••••••••" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <View style={{ height: 12 }} />
            <Field label="Nova Senha">
              <TextInput value={pwdNew} onChangeText={setPwdNew} secureTextEntry placeholder="••••••••" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <View style={{ height: 12 }} />
            <Field label="Confirmar Nova Senha">
              <TextInput value={pwdConfirm} onChangeText={setPwdConfirm} secureTextEntry placeholder="••••••••" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <View style={{ height: 14 }} />
            <SaveBtn label="Alterar Senha" loading={savePwd.isPending} onPress={onChangePassword} dark />
          </SectionCard>

          <SectionCard title="Servidor">
            <View style={{ padding: 12, backgroundColor: t.surface2, borderRadius: 10, borderWidth: 1, borderColor: t.borderStrong, marginBottom: 10 }}>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 9, color: t.textFaint, letterSpacing: 0.5, textTransform: "uppercase" }}>URL atual</Text>
              <Text numberOfLines={1} style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.text, marginTop: 4 }}>{serverUrl ?? "—"}</Text>
            </View>
            <Button label="Trocar servidor" variant="outline" leftIcon={<Ionicons name="swap-horizontal" size={16} color={t.text} />} onPress={changeServer} fullWidth />
            <View style={{ height: 10 }} />
            <Button label="Sair da conta" variant="danger" fullWidth leftIcon={<Ionicons name="log-out-outline" size={16} color={t.accent} />} onPress={confirmLogout} />
          </SectionCard>
        </View>
      )}

      {/* FINANCEIRO */}
      {activeTab === "financeiro" && (
        <SectionCard title="Controle de Renda">
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 18, marginBottom: 14 }}>
            Configure sua remuneração por rota e controle suas despesas. Usado no painel financeiro do dashboard.
          </Text>

          <Field label="Valor por Rota (R$)">
            <TextInput value={valorPorRota} onChangeText={setValorPorRota} keyboardType="decimal-pad" placeholder="ex: 12.50" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
          </Field>
          <Hint>Quanto você recebe por rota processada</Hint>

          <View style={{ height: 12 }} />
          <Field label="Ciclo de Pagamento">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {CICLO_OPTS.map((o) => {
                const sel = cicloPagamentoDias === o.value;
                return (
                  <Pressable key={o.value} onPress={() => { setCicloPagamentoDias(o.value); void Haptics.selectionAsync(); }}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center", backgroundColor: sel ? t.accent : t.surface2, borderWidth: 1, borderColor: sel ? t.accent : t.borderStrong }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: sel ? "#fff" : t.textMuted }}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <View style={{ marginTop: 14, padding: 12, backgroundColor: t.surface2, borderRadius: 10, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 12 }}>
              Despesas e Metas
            </Text>
            <Field label="Meta Mensal de Rotas">
              <TextInput value={metaMensalRotas} onChangeText={setMetaMensalRotas} keyboardType="number-pad" placeholder="ex: 200" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <Hint>Quantas rotas quer processar por mês</Hint>
            <View style={{ height: 12 }} />
            <Field label="Despesas Fixas Mensais (R$)">
              <TextInput value={despesasFixasMensais} onChangeText={setDespesasFixasMensais} keyboardType="decimal-pad" placeholder="ex: 450.00" placeholderTextColor={t.textFaint} style={inputStyle(t)} />
            </Field>
            <Hint>Combustível, manutenção, seguro etc.</Hint>
          </View>

          {valorPorRota && cicloPagamentoDias ? (
            <View style={{ marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: t.accentDim, borderWidth: 1, borderColor: "rgba(212,82,26,0.25)" }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.accent, marginBottom: 4 }}>
                Prévia do potencial por ciclo
              </Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 18 }}>
                Com <Text style={{ fontFamily: "Poppins_700Bold" }}>{Number(valorPorRota || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>/rota
                {metaMensalRotas ? <> e meta de <Text style={{ fontFamily: "Poppins_700Bold" }}>{metaMensalRotas} rotas/mês</Text>, a receita estimada é de{" "}
                  <Text style={{ fontFamily: "Poppins_700Bold" }}>{(Number(metaMensalRotas) * Number(valorPorRota) * cicloPagamentoDias / 30).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text> por ciclo.</> : "."}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 14 }} />
          <SaveBtn label="Salvar Financeiro" loading={saveSettings.isPending} onPress={() => saveSettings.mutate()} />
        </SectionCard>
      )}

      {/* INSTÂNCIAS */}
      {activeTab === "instancias" && (
        <SectionCard title="Instância de Geocodificação">
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 18, marginBottom: 14 }}>
            Escolha o serviço usado para validar endereços. A instância afeta precisão e custo de processamento.
          </Text>

          {([
            { value: "builtin" as const, label: "Padrão Gratuito", badge: "Grátis", badgeColor: t.ok, badgeBg: t.okDim, desc: "Photon + Overpass + Nominatim (OSM) + BrasilAPI. Zero custo, sem chave necessária.", icon: "globe-outline" as const },
            { value: "geocodebr" as const, label: "GeocodeR BR", badge: "Local / CNEFE", badgeColor: "#7c3aed", badgeBg: "rgba(124,58,237,0.12)", desc: "Microserviço R via CNEFE/IBGE. Precisão máxima para BR, roda localmente.", icon: "home-outline" as const },
            { value: "googlemaps" as const, label: "Google Maps", badge: "Pay-per-use", badgeColor: "#1565c0", badgeBg: "rgba(21,101,192,0.12)", desc: "Google Maps Geocoding API. Alta precisão global. Requer chave de API paga.", icon: "location-outline" as const },
          ]).map((opt) => {
            const sel = instanceMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => { setInstanceMode(opt.value); setMapsKeyTouched(false); void Haptics.selectionAsync(); }}
                style={({ pressed }) => ({
                  padding: 12, borderRadius: 12, marginBottom: 10,
                  borderWidth: 2, borderColor: sel ? t.accent : t.borderStrong,
                  backgroundColor: sel ? t.accentDim : t.surface2,
                  flexDirection: "row", gap: 10, opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ marginTop: 2 }}>
                  <Ionicons name={opt.icon} size={18} color={sel ? t.accent : t.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 13, color: sel ? t.accent : t.text }}>{opt.label}</Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: opt.badgeBg }}>
                      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 9, color: opt.badgeColor, letterSpacing: 0.5 }}>{opt.badge}</Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, lineHeight: 16 }}>{opt.desc}</Text>
                </View>
              </Pressable>
            );
          })}

          {instanceMode === "googlemaps" && (
            <View style={{ marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: "rgba(21,101,192,0.05)", borderWidth: 1, borderColor: "rgba(21,101,192,0.2)" }}>
              <Field label="Chave de API do Google Maps">
                <TextInput
                  value={googleMapsApiKey} onChangeText={setGoogleMapsApiKey} secureTextEntry
                  placeholder="AIzaSy..." placeholderTextColor={t.textFaint} autoCapitalize="none"
                  onBlur={() => setMapsKeyTouched(true)}
                  style={[inputStyle(t), mapsKeyError ? { borderColor: t.accent } : null]}
                />
              </Field>
              {mapsKeyError && <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.accent, marginTop: 6 }}>{mapsKeyError}</Text>}
              {!mapsKeyError && googleMapsApiKey && googleMapsApiKey.startsWith("AIza") && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <Ionicons name="checkmark-circle" size={12} color={t.ok} />
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.ok }}>Formato de chave válido</Text>
                </View>
              )}
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 8, lineHeight: 16 }}>
                A chave é armazenada de forma segura. Habilite a Geocoding API no Google Cloud Console.
              </Text>
            </View>
          )}

          {instanceMode === "geocodebr" && (
            <View style={{ marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.05)", borderWidth: 1, borderColor: "rgba(124,58,237,0.2)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Ionicons name="information-circle" size={13} color="#7c3aed" />
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: "#7c3aed" }}>Como ativar o GeocodeR BR</Text>
              </View>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, lineHeight: 17 }}>
                O microserviço precisa estar rodando localmente na porta <Text style={{ fontFamily: "Poppins_700Bold" }}>8002</Text>. Configure{" "}
                <Text style={{ fontFamily: "Poppins_500Medium" }}>GEOCODEBR_URL=http://localhost:8002</Text> no servidor.
              </Text>
            </View>
          )}

          <View style={{ height: 4 }} />
          <SaveBtn label="Salvar Instância" loading={saveSettings.isPending} onPress={() => saveSettings.mutate()} />
        </SectionCard>
      )}

      {/* PARSER */}
      {activeTab === "parser" && (
        <SectionCard title="Configuração do Parser">
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.textFaint, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
            Modo de Processamento
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {[
              { value: "builtin" as const, label: "Parser Embutido", desc: "Algoritmo próprio, offline" },
              { value: "ai" as const, label: "Inteligência Artificial", desc: "Maior precisão via IA" },
            ].map((opt) => {
              const sel = parserMode === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => { setParserMode(opt.value); void Haptics.selectionAsync(); }}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    borderWidth: 1, borderColor: sel ? t.accent : t.borderStrong,
                    backgroundColor: sel ? t.accentDim : t.surface2,
                  }}>
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 12, color: sel ? t.accent : t.text, marginBottom: 3 }}>{opt.label}</Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint }}>{opt.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {parserMode === "ai" && (
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderStrong, marginBottom: 14 }}>
              <Field label="Provedor de IA">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { v: "openai", l: "OpenAI" },
                    { v: "anthropic", l: "Anthropic" },
                    { v: "google", l: "Google" },
                  ].map((p) => {
                    const sel = aiProvider === p.v;
                    return (
                      <Pressable key={p.v} onPress={() => { setAiProvider(p.v); void Haptics.selectionAsync(); }}
                        style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: sel ? t.accent : t.borderStrong, backgroundColor: sel ? t.accent : "transparent" }}>
                        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: sel ? "#fff" : t.textMuted }}>{p.l}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
              <View style={{ height: 12 }} />
              <Field label="Chave de API">
                <TextInput value={aiApiKey} onChangeText={setAiApiKey} secureTextEntry autoCapitalize="none" placeholder="sk-... ou AIza..." placeholderTextColor={t.textFaint} style={inputStyle(t)} />
              </Field>
            </View>
          )}

          <SaveBtn label="Salvar Parser" loading={saveSettings.isPending} onPress={() => saveSettings.mutate()} />
        </SectionCard>
      )}

      {/* TOLERÂNCIA */}
      {activeTab === "tolerancia" && (
        <SectionCard title="Tolerância de Coordenadas">
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 18, marginBottom: 16 }}>
            Distância máxima (metros) entre a coordenada GPS do arquivo e o endereço oficial para ser considerado correto.
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.textFaint, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Distância de Tolerância
            </Text>
            <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 18, color: t.accent }}>{toleranceMeters}m</Text>
          </View>
          <Slider
            style={{ width: "100%", height: 36 }}
            minimumValue={100}
            maximumValue={5000}
            step={100}
            value={toleranceMeters}
            onValueChange={(v: number) => setToleranceMeters(Math.round(v))}
            minimumTrackTintColor={t.accent}
            maximumTrackTintColor={t.borderStrong}
            thumbTintColor={t.accent}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint }}>100m · Rigoroso</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint }}>5000m · Flexível</Text>
          </View>

          <View style={{ marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              {toleranceMeters <= 200 ? "Rigoroso" : toleranceMeters <= 800 ? "Moderado" : toleranceMeters <= 2000 ? "Flexível" : "Muito Flexível"}
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, lineHeight: 16 }}>
              {toleranceMeters <= 200 ? "Aceita apenas endereços muito próximos da coordenada. Mais nuances detectadas."
                : toleranceMeters <= 800 ? "Configuração balanceada para uso geral em áreas urbanas."
                : toleranceMeters <= 2000 ? "Aceita divergências maiores. Útil em áreas rurais ou GPS impreciso."
                : "Muito permissivo. Pode reduzir a qualidade da validação."}
            </Text>
          </View>

          <View style={{ height: 14 }} />
          <SaveBtn label="Salvar Tolerância" loading={saveSettings.isPending} onPress={() => saveSettings.mutate()} />
        </SectionCard>
      )}

      {/* SOBRE */}
      {activeTab === "sobre" && (
        <View>
          <Card style={{ marginBottom: 14, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 20, color: t.text, letterSpacing: -0.5 }}>
                ViaX<Text style={{ color: t.textFaint, fontFamily: "Poppins_400Regular" }}>:</Text> System
              </Text>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: t.accentDim }}>
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 10, color: t.accent, letterSpacing: 0.5 }}>v8.0</Text>
              </View>
            </View>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
              Validação inteligente de rotas de entrega
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textMuted, lineHeight: 19 }}>
              Sistema de auditoria de rotas logísticas que valida endereços de planilhas contra coordenadas GPS reais via geocodificação reversa. Detecta divergências automaticamente e gera relatórios de nuances.
            </Text>
          </Card>

          <SectionCard title="Repositório & Documentação">
            {[
              { url: "https://github.com/esmagafetos/Viax-Scout", label: "GitHub — esmagafetos/Viax-Scout", sub: "Código-fonte, issues, releases", badge: "Open Source", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
              { url: "https://github.com/esmagafetos/Viax-Scout/blob/main/README.md", label: "Documentação (README)", sub: "Guia de instalação e uso", badge: "Docs", color: "#1d4ed8", bg: "rgba(29,78,216,0.1)" },
              { url: "https://github.com/esmagafetos/Viax-Scout/issues", label: "Issues & Suporte", sub: "Reporte bugs ou tire dúvidas", badge: "Issues", color: "#b45309", bg: "rgba(180,83,9,0.1)" },
              { url: "https://github.com/esmagafetos/Viax-Scout/releases", label: "Releases & Changelog", sub: "Histórico de versões", badge: "v8.0", color: t.accent, bg: t.accentDim },
            ].map((it, i) => (
              <Pressable key={i} onPress={() => import("expo-linking").then((L) => L.openURL(it.url))}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 10,
                  paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10,
                  backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border,
                  marginBottom: 8, opacity: pressed ? 0.85 : 1,
                })}>
                <Ionicons name="link-outline" size={16} color={t.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.text }}>{it.label}</Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginTop: 2 }}>{it.sub}</Text>
                </View>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: it.bg }}>
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 9, color: it.color, letterSpacing: 0.4 }}>{it.badge}</Text>
                </View>
                <Ionicons name="open-outline" size={13} color={t.textFaint} />
              </Pressable>
            ))}
          </SectionCard>

          <SectionCard title="Stack Tecnológico">
            {[
              { layer: "Frontend Web", tech: "React 18 + Vite", detail: "TypeScript, CSS, Wouter" },
              { layer: "Frontend Mobile", tech: "Expo SDK 54", detail: "React Native, NativeWind, Reanimated" },
              { layer: "Backend", tech: "Express 5", detail: "TypeScript, REST API, pino" },
              { layer: "Banco", tech: "PostgreSQL", detail: "Drizzle ORM, migrações automáticas" },
              { layer: "Geocod. CEP", tech: "BrasilAPI v2", detail: "IBGE/Correios, lat/lon" },
              { layer: "Geocod. Global", tech: "Photon (Komoot)", detail: "Sem rate limit, dados OSM" },
            ].map((it, i) => (
              <View key={i} style={{ padding: 10, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, marginBottom: 6 }}>
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 9, color: t.textFaint, letterSpacing: 0.6, textTransform: "uppercase" }}>{it.layer}</Text>
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 13, color: t.text, marginTop: 3 }}>{it.tech}</Text>
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textMuted, marginTop: 1 }}>{it.detail}</Text>
              </View>
            ))}
          </SectionCard>

          <View style={{ alignItems: "center", marginTop: 8, gap: 8 }}>
            <ViaXLogo size="sm" showTagline={false} />
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: t.textFaint, letterSpacing: 0.5 }}>v2.0.0 — Mobile</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Card padded={false} style={{ marginBottom: 14, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 10, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginTop: 5 }}>{children}</Text>
  );
}

function inputStyle(t: ReturnType<typeof useTheme>) {
  return {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: t.borderStrong,
    backgroundColor: t.surface2, color: t.text,
    fontFamily: "Poppins_400Regular", fontSize: 13,
  } as const;
}

function SaveBtn({ label, loading, onPress, dark }: { label: string; loading?: boolean; onPress: () => void; dark?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999,
        backgroundColor: dark ? t.text : t.accent,
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: dark ? t.bg : "#fff" }}>
        {loading ? "Salvando..." : label}
      </Text>
    </Pressable>
  );
}
