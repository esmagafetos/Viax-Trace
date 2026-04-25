import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, Path as SvgPath, RadialGradient, Stop } from "react-native-svg";

import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme, radii } from "@/lib/theme";
import { Card } from "@/components/ui/Card";
import ViaXLogo from "@/components/Logo";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardSummary, FinancialSummary, RecentAnalysis } from "@/lib/types";

export default function DashboardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: () => api<DashboardSummary>("/dashboard/summary") });
  const recent = useQuery({ queryKey: ["dashboard", "recent"], queryFn: () => api<RecentAnalysis[]>("/dashboard/recent") });
  const financial = useQuery({ queryKey: ["dashboard", "financial"], queryFn: () => api<FinancialSummary>("/dashboard/financial") });

  useFocusEffect(useCallback(() => {
    void summary.refetch(); void recent.refetch(); void financial.refetch();
  }, [summary, recent, financial]));

  const refreshing = summary.isFetching || recent.isFetching || financial.isFetching;
  const onRefresh = () => { void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); };

  const s = summary.data;
  const f = financial.data;
  const recentItems = recent.data ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "usuário";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: insets.bottom + 96 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
    >
      <HeroBanner userName={firstName} onNew={() => router.push("/(tabs)/processar")} screenWidth={width} />

      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 22, color: t.text, letterSpacing: -0.5 }}>Dashboard</Text>
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, marginTop: 3 }}>
          Resumo das suas análises e controle financeiro de rotas.
        </Text>
      </View>

      {summary.isLoading ? (
        <View style={{ paddingVertical: 60, alignItems: "center" }}><ActivityIndicator color={t.accent} /></View>
      ) : s ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <DashStat value={String(s.totalAnalyses)} label="Análises" />
          <DashStat value={s.totalAddressesProcessed.toLocaleString("pt-BR")} label="Endereços" good />
          <DashStat value={`${Math.round((s.avgNuanceRate / Math.max(s.totalAddressesProcessed, 1)) * 100 || 0)}%`} label="Nuances" accent />
          <DashStat value={`${Math.round((s.avgSimilarity || 0) * 100)}%`} label="Similaridade" good />
          <DashStat value={String(s.analysesThisMonth)} label="Este Mês" />
        </View>
      ) : null}

      {!financial.isLoading && f && <FinancialPanel f={f} onConfigure={() => router.push("/(tabs)/configuracoes")} />}

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={() => router.push("/(tabs)/processar")}
          style={({ pressed }) => ({
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            paddingVertical: 12, borderRadius: 999, backgroundColor: t.accent, opacity: pressed ? 0.85 : 1,
            shadowColor: t.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
          })}
        >
          <Ionicons name="document-text-outline" size={15} color="#fff" />
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" }}>Nova Análise</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/historico")}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999,
            backgroundColor: "transparent", borderWidth: 1, borderColor: t.borderStrong, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.textMuted }}>Ver Histórico</Text>
        </Pressable>
      </View>

      <Card padded={false} style={{ overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Análises Recentes
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/historico")} hitSlop={8}>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.accent }}>Ver todas →</Text>
          </Pressable>
        </View>
        {recent.isLoading ? (
          <View style={{ padding: 28, alignItems: "center" }}><ActivityIndicator color={t.accent} /></View>
        ) : recentItems.length === 0 ? (
          <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
            <Ionicons name="document-text-outline" size={28} color={t.textFaint} />
            <Text style={{ fontFamily: "Poppins_400Regular", color: t.textFaint, fontSize: 13, textAlign: "center" }}>
              Nenhuma análise ainda.{" "}
              <Text onPress={() => router.push("/(tabs)/processar")} style={{ color: t.accent, fontFamily: "Poppins_600SemiBold" }}>
                Processar primeira rota
              </Text>
            </Text>
          </View>
        ) : (
          <View>
            {recentItems.map((a, i) => (
              <View key={a.id} style={{
                flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: i < recentItems.length - 1 ? 1 : 0, borderBottomColor: t.border,
              }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text numberOfLines={1} style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text }}>{a.fileName}</Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                    {a.totalAddresses} endereços · {formatDate(a.createdAt)}
                  </Text>
                </View>
                <Badge label={String(a.nuances)} tone={a.nuances > 0 ? "accent" : "ok"} />
                <View style={{ width: 8 }} />
                <Badge label={a.status === "done" ? "Concluído" : a.status} tone={a.status === "done" ? "ok" : "accent"} />
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function HeroBanner({ userName, onNew, screenWidth }: { userName: string; onNew: () => void; screenWidth: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const w = screenWidth - 32;
  const h = 150;
  return (
    <View style={{
      position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 18,
      borderWidth: 1, borderColor: "rgba(212,82,26,0.2)",
      shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    }}>
      <Svg width={w} height={h} style={{ position: "absolute", inset: 0 } as any}>
        <Defs>
          <RadialGradient id="g1" cx="80%" cy="0%" r="80%">
            <Stop offset="0" stopColor="#d4521a" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#1a0e08" stopOpacity={1} />
          </RadialGradient>
          <RadialGradient id="g2" cx="0%" cy="100%" r="60%">
            <Stop offset="0" stopColor="#7c1f3a" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#1a0e08" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <SvgPath d={`M0 0 H${w} V${h} H0 Z`} fill="#1a0e08" />
        <SvgPath d={`M0 0 H${w} V${h} H0 Z`} fill="url(#g1)" />
        <SvgPath d={`M0 0 H${w} V${h} H0 Z`} fill="url(#g2)" />
        <SvgPath d={`M0 ${h * 0.55} C${w * 0.18} ${h * 0.25}, ${w * 0.36} ${h * 0.85}, ${w * 0.55} ${h * 0.5} S${w * 0.85} ${h * 0.7}, ${w} ${h * 0.35}`} stroke="white" strokeOpacity={0.06} strokeWidth={2} strokeDasharray="8,10" fill="none" />
        <Circle cx={0} cy={h * 0.55} r={4} fill="white" fillOpacity={0.3} />
        <Circle cx={w * 0.55} cy={h * 0.5} r={6} fill="white" fillOpacity={0.18} />
        <Circle cx={w} cy={h * 0.35} r={4} fill="white" fillOpacity={0.3} />
      </Svg>

      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <ViaXLogo size="md" dark showTagline />
          <Pressable onPress={() => setDismissed(true)} hitSlop={10} style={{ padding: 4 }}>
            <Ionicons name="close" size={18} color="rgba(240,237,232,0.4)" />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 14, color: "#f0ede8" }}>Olá, {userName}!</Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "rgba(212,82,26,0.25)", borderWidth: 1, borderColor: "rgba(212,82,26,0.4)" }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 9, color: "#e8a882", letterSpacing: 0.5 }}>v8.0</Text>
          </View>
        </View>
        <Pressable onPress={onNew} style={({ pressed }) => ({
          alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
          paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#d4521a",
          opacity: pressed ? 0.85 : 1,
          shadowColor: "#d4521a", shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 4,
        })}>
          <Ionicons name="document-text-outline" size={14} color="#fff" />
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#fff" }}>Nova Análise</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DashStat({ value, label, accent, good }: { value: string; label: string; accent?: boolean; good?: boolean }) {
  const t = useTheme();
  const barColor = accent ? t.accent : good ? t.ok : t.border;
  const valueColor = accent ? t.accent : good ? t.ok : t.text;
  return (
    <View style={{
      flexBasis: "31%", flexGrow: 1, minWidth: 100,
      backgroundColor: t.surface, borderColor: t.borderStrong, borderWidth: 1,
      borderRadius: 14, paddingTop: 14, paddingHorizontal: 12, paddingBottom: 12,
      position: "relative", overflow: "hidden",
    }}>
      <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 22, color: valueColor, letterSpacing: -0.4, lineHeight: 24 }}>{value}</Text>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 9, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>{label}</Text>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, backgroundColor: barColor }} />
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: "ok" | "accent" | "neutral" }) {
  const t = useTheme();
  const map = {
    ok: { bg: t.okDim, fg: t.ok },
    accent: { bg: t.accentDim, fg: t.accent },
    neutral: { bg: t.surface2, fg: t.textMuted },
  }[tone];
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: map.bg }}>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 10, color: map.fg, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function FinancialPanel({ f, onConfigure }: { f: FinancialSummary; onConfigure: () => void }) {
  const t = useTheme();
  const semConfigurar = f.valorPorRota === null;
  const cicloLabel = f.cicloPagamentoDias === 7 ? "semanal" : f.cicloPagamentoDias === 14 ? "quinzenal" : "mensal";
  const hasMeta = f.metaRotas !== null && f.metaRotas > 0;
  const metaPct = f.percentualMeta ?? 0;

  if (semConfigurar) {
    return (
      <Card style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 13, color: t.text, marginBottom: 4 }}>Controle Financeiro</Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, lineHeight: 17 }}>
            Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita e controle de despesas.
          </Text>
        </View>
        <Pressable onPress={onConfigure} style={({ pressed }) => ({
          paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: t.accent, opacity: pressed ? 0.85 : 1,
        })}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#fff" }}>Configurar agora</Text>
        </Pressable>
      </Card>
    );
  }

  const fmtBRL = (v: number) => formatCurrency(v);
  const startDate = new Date(f.inicioDoCliclo);
  const endDate = new Date(f.fimDoCiclo);
  const fmtShort = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <Card padded={false} style={{ marginBottom: 16, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
          Ciclo {cicloLabel} · Financeiro
        </Text>
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>
          {fmtShort(startDate)} – {fmtShort(endDate)}
        </Text>
      </View>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <FinTile label="Receita Estimada" value={fmtBRL(f.receitaEstimada)} color={t.ok} />
          <FinTile label="Despesas Fixas" value={fmtBRL(f.despesasFixas)} color={t.accent} />
          <FinTile label="Lucro Bruto" value={fmtBRL(f.lucroBruto)} color={f.lucroBruto >= 0 ? t.ok : t.accent} />
        </View>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 9, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Rotas no ciclo</Text>
            <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 32, color: t.text, letterSpacing: -1, lineHeight: 32 }}>{f.rotasCicloAtual}</Text>
            {f.valorPorRota != null && (
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 3 }}>
                × {fmtBRL(f.valorPorRota)}/rota
              </Text>
            )}
            {hasMeta && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 9, color: t.textFaint, textTransform: "uppercase", letterSpacing: 0.5 }}>Meta</Text>
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: metaPct >= 100 ? t.ok : t.accent }}>{metaPct}%</Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: t.borderStrong, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.min(metaPct, 100)}%`, backgroundColor: metaPct >= 100 ? t.ok : t.accent, borderRadius: 2 }} />
                </View>
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginTop: 2 }}>{f.metaRotas} rotas alvo</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1.2 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 9, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Atividade do ciclo</Text>
            <MiniBars data={f.graficoDiario} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 9, color: t.textFaint }}>{fmtShort(startDate)}</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 9, color: t.textFaint }}>hoje</Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

function FinTile({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View style={{
      flexBasis: "31%", flexGrow: 1, minWidth: 100,
      backgroundColor: t.surface2, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: t.border,
    }}>
      <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 14, color, letterSpacing: -0.2 }} numberOfLines={1}>{value}</Text>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 8, color: t.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function MiniBars({ data }: { data: { data: string; rotas: number; receita: number }[] }) {
  const t = useTheme();
  const visible = data.slice(-20);
  const max = Math.max(...visible.map((d) => d.rotas), 1);
  const today = new Date().toISOString().substring(0, 10);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 64, gap: 2 }}>
      {visible.map((d, i) => {
        const isToday = d.data === today;
        const h = Math.max(2, Math.round((d.rotas / max) * 58));
        return (
          <View key={i} style={{
            flex: 1, height: h,
            backgroundColor: isToday ? t.accent : d.rotas > 0 ? t.ok : t.borderStrong,
            opacity: d.rotas > 0 || isToday ? 1 : 0.35,
            borderTopLeftRadius: 2, borderTopRightRadius: 2,
          }} />
        );
      })}
    </View>
  );
}
