import { useState } from 'react';
import { ScrollView, View, StyleSheet, Text, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { ViaXLogo } from '@/components/ViaXLogo';
import { Card } from '@/components/ui';
import { formatBRL, formatDate, formatShortDate } from '@/lib/format';
import { useResponsive } from '@/lib/responsive';

type Summary = {
  totalAnalyses: number;
  totalAddressesProcessed: number;
  avgNuanceRate: number;
  avgSimilarity: number;
  analysesThisMonth: number;
};

type RecentAnalysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  status: string;
  createdAt: string;
};

type Financial = {
  valorPorRota: number | null;
  cicloPagamentoDias: number;
  inicioDoCliclo: string;
  fimDoCiclo: string;
  receitaEstimada: number;
  despesasFixas: number;
  lucroBruto: number;
  rotasCicloAtual: number;
  metaRotas: number | null;
  percentualMeta: number | null;
  graficoDiario: { data: string; rotas: number; receita: number }[];
};

export default function DashboardScreen() {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { rs, cols, isCompact } = useResponsive();
  const [heroDismissed, setHeroDismissed] = useState(false);

  const summaryQ = useQuery<Summary>({
    queryKey: ['/api/dashboard/summary'],
    queryFn: () => apiRequest<Summary>('/api/dashboard/summary'),
  });
  const recentQ = useQuery<RecentAnalysis[]>({
    queryKey: ['/api/dashboard/recent'],
    queryFn: () => apiRequest<RecentAnalysis[]>('/api/dashboard/recent'),
  });
  const financialQ = useQuery<Financial>({
    queryKey: ['/api/dashboard/financial'],
    queryFn: () => apiRequest<Financial>('/api/dashboard/financial'),
  });

  const refreshing =
    summaryQ.isRefetching || recentQ.isRefetching || financialQ.isRefetching;

  const refetchAll = () => {
    summaryQ.refetch();
    recentQ.refetch();
    financialQ.refetch();
  };

  const s = summaryQ.data;
  const r = recentQ.data ?? [];
  const f = financialQ.data;
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: rs(16), gap: rs(14), paddingBottom: rs(32) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={c.accent} />}
      >
        {/* Hero banner */}
        {!heroDismissed && <HeroBanner userName={firstName} onDismiss={() => setHeroDismissed(true)} onAction={() => router.push('/(tabs)/process')} />}

        <View>
          <Text style={[styles.h1, { color: c.text, fontSize: rs(22) }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: c.textFaint, fontSize: rs(12) }]}>
            Resumo das suas análises e controle financeiro de rotas.
          </Text>
        </View>

        {/* Stat tiles — mobile-first grid: 2 cols (xs/sm), 3 cols (md), 4 cols (lg) */}
        {s ? (
          <View style={[styles.statGrid, { gap: rs(8) }]}>
            <StatTile value={String(s.totalAnalyses)} label="Análises" cols={cols} />
            <StatTile
              value={s.totalAddressesProcessed.toLocaleString('pt-BR')}
              label="Endereços"
              tone="ok"
              cols={cols}
            />
            <StatTile
              value={`${Math.round((s.avgNuanceRate / Math.max(s.totalAddressesProcessed, 1)) * 100 || 0)}%`}
              label="Nuances"
              tone="accent"
              cols={cols}
            />
            <StatTile
              value={`${Math.round((s.avgSimilarity || 0) * 100)}%`}
              label="Similaridade"
              tone="ok"
              cols={cols}
            />
            <StatTile value={String(s.analysesThisMonth)} label="Este mês" cols={cols} />
          </View>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular' }}>
              Carregando estatísticas…
            </Text>
          </Card>
        )}

        {/* Financial panel */}
        {f && <FinancialPanel f={f} onConfigure={() => router.push('/(tabs)/settings')} />}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/process')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>Nova análise</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/history')}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: c.borderStrong, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.ghostBtnText, { color: c.textMuted }]}>Ver histórico</Text>
          </Pressable>
        </View>

        {/* Recent analyses */}
        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>Análises recentes</Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={6}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
                Ver todas →
              </Text>
            </Pressable>
          </View>

          {recentQ.isLoading ? (
            <View style={styles.panelEmpty}>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>
                Carregando…
              </Text>
            </View>
          ) : r.length === 0 ? (
            <View style={styles.panelEmpty}>
              <Ionicons name="folder-open-outline" size={28} color={c.textFaint} />
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 8 }}>
                Nenhuma análise ainda.
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/process')} hitSlop={6} style={{ marginTop: 4 }}>
                <Text style={{ color: c.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                  Processar primeira rota
                </Text>
              </Pressable>
            </View>
          ) : (
            r.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.recentRow,
                  { borderBottomColor: c.border, borderBottomWidth: i === r.length - 1 ? 0 : 1 },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: c.text, fontFamily: 'Poppins_500Medium', fontSize: 13 }}
                  >
                    {a.fileName}
                  </Text>
                  <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }}>
                    {a.totalAddresses} endereços · {formatDate(a.createdAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Badge
                    tone={a.nuances > 0 ? 'accent' : 'ok'}
                    label={`${a.nuances}`}
                  />
                  <Badge
                    tone={a.status === 'done' ? 'ok' : 'accent'}
                    label={a.status === 'done' ? 'OK' : a.status}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroBanner({
  userName,
  onDismiss,
  onAction,
}: {
  userName: string;
  onDismiss: () => void;
  onAction: () => void;
}) {
  return (
    <View style={heroStyles.wrap}>
      <LinearGradient
        colors={['#1a0e08', '#2d1408', '#3d1c0c', '#1f0a18']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative radial blobs */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="blob1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#d4521a" stopOpacity="0.32" />
            <Stop offset="70%" stopColor="#d4521a" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blob2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#d4521a" stopOpacity="0.16" />
            <Stop offset="70%" stopColor="#d4521a" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <SvgCircle cx="78%" cy="-10%" r="130" fill="url(#blob1)" />
        <SvgCircle cx="15%" cy="115%" r="95" fill="url(#blob2)" />
      </Svg>

      {/* Decorative dashed route paths */}
      <Svg
        viewBox="0 0 600 120"
        preserveAspectRatio="xMidYMid slice"
        style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}
        pointerEvents="none"
      >
        <Path
          d="M0 60 C100 20 200 100 300 60 C400 20 500 80 600 40"
          stroke="white"
          strokeWidth={2}
          strokeDasharray="8 10"
          fill="none"
        />
        <Path
          d="M0 90 C150 50 250 110 400 70 C500 40 550 90 600 70"
          stroke="white"
          strokeWidth={1.5}
          strokeDasharray="5 8"
          fill="none"
        />
        <SvgCircle cx={0} cy={60} r={6} fill="white" />
        <SvgCircle cx={300} cy={60} r={8} fill="white" fillOpacity={0.6} />
        <SvgCircle cx={600} cy={40} r={5} fill="white" />
      </Svg>

      <View style={heroStyles.inner}>
        <View style={heroStyles.left}>
          <View style={{ flexShrink: 0 }}>
            <ViaXLogo size="md" dark showTagline />
          </View>
          <View style={heroStyles.divider} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={heroStyles.greetingRow}>
              <Text style={heroStyles.greeting} numberOfLines={1}>
                Olá, {userName}!
              </Text>
              <View style={heroStyles.versionPill}>
                <Text style={heroStyles.versionPillText}>v8.0</Text>
              </View>
            </View>
            <Text style={heroStyles.subtitle}>
              Geocodificação multi-camada · Detecção de nuances · Suporte a Travessa e Passagem
            </Text>
          </View>
        </View>

        <View style={heroStyles.actions}>
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [heroStyles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
            <Text style={heroStyles.ctaText}>Nova Análise</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={heroStyles.close} hitSlop={8}>
            <Ionicons name="close" size={16} color="rgba(240,237,232,0.4)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatTile({ value, label, tone = 'muted', cols = 2 }: { value: string; label: string; tone?: 'muted' | 'ok' | 'accent'; cols?: number }) {
  const c = useColors();
  const { rs } = useResponsive();
  const color = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.text;
  const stripColor = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.borderStrong;
  const basis = cols === 4 ? '23%' : cols === 3 ? '31%' : '47%';
  return (
    <View
      style={[
        statStyles.tile,
        {
          backgroundColor: c.surface,
          borderColor: c.borderStrong,
          flexBasis: basis,
          paddingHorizontal: rs(12),
          paddingTop: rs(12),
          paddingBottom: rs(14),
        },
      ]}
    >
      <Text style={[statStyles.value, { color, fontSize: rs(22) }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[statStyles.label, { color: c.textFaint, fontSize: rs(9) }]} numberOfLines={1}>{label}</Text>
      <View style={[statStyles.strip, { backgroundColor: stripColor }]} />
    </View>
  );
}

function FinancialPanel({ f, onConfigure }: { f: Financial; onConfigure: () => void }) {
  const c = useColors();
  const semConfigurar = f.valorPorRota == null;
  const cicloLabel =
    f.cicloPagamentoDias === 7 ? 'semanal' : f.cicloPagamentoDias === 14 ? 'quinzenal' : 'mensal';

  if (semConfigurar) {
    return (
      <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong, padding: 16, gap: 12 }]}>
        <View>
          <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>
            Controle financeiro
          </Text>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita.
          </Text>
        </View>
        <Pressable
          onPress={onConfigure}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1, alignSelf: 'flex-start' },
          ]}
        >
          <Text style={styles.primaryBtnText}>Configurar agora</Text>
        </Pressable>
      </View>
    );
  }

  const metaPct = f.percentualMeta ?? 0;
  const hasMeta = f.metaRotas != null && f.metaRotas > 0;

  return (
    <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
      <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
        <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>
          Ciclo {cicloLabel} · Financeiro
        </Text>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11 }}>
          {formatShortDate(f.inicioDoCliclo)} – {formatShortDate(f.fimDoCiclo)}
        </Text>
      </View>

      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Receita', value: formatBRL(f.receitaEstimada), color: c.ok },
            { label: 'Despesas', value: formatBRL(f.despesasFixas), color: c.accent },
            { label: 'Lucro', value: formatBRL(f.lucroBruto), color: f.lucroBruto >= 0 ? c.ok : c.accent },
          ].map((it) => (
            <View
              key={it.label}
              style={{
                flexGrow: 1,
                minWidth: '30%',
                backgroundColor: c.surface2,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: it.color, fontFamily: 'Poppins_700Bold', fontSize: 14 }}>
                {it.value}
              </Text>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_600SemiBold', fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
                {it.label}
              </Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={{ color: c.textFaint, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
            Rotas no ciclo
          </Text>
          <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 28, letterSpacing: -1 }}>
            {f.rotasCicloAtual}
          </Text>
          {f.valorPorRota && (
            <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }}>
              × {formatBRL(f.valorPorRota)}/rota
            </Text>
          )}
          {hasMeta && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: c.textFaint, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Meta
                </Text>
                <Text style={{ color: metaPct >= 100 ? c.ok : c.accent, fontFamily: 'Poppins_700Bold', fontSize: 11 }}>
                  {metaPct}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: c.borderStrong, borderRadius: 2, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    backgroundColor: metaPct >= 100 ? c.ok : c.accent,
                    width: `${Math.min(metaPct, 100)}%`,
                  }}
                />
              </View>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 2 }}>
                {f.metaRotas} rotas alvo
              </Text>
            </View>
          )}
        </View>

        <MiniBarChart data={f.graficoDiario ?? []} accent={c.accent} ok={c.ok} muted={c.borderStrong} faint={c.textFaint} />
      </View>
    </View>
  );
}

function MiniBarChart({
  data,
  accent,
  ok,
  muted,
  faint,
}: {
  data: { data: string; rotas: number }[];
  accent: string;
  ok: string;
  muted: string;
  faint: string;
}) {
  const visible = data.slice(-20);
  const max = Math.max(...visible.map((d) => d.rotas), 1);
  const today = new Date().toISOString().substring(0, 10);
  if (visible.length === 0) return null;
  return (
    <View>
      <Text style={{ color: faint, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
        Atividade do ciclo
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 60 }}>
        {visible.map((d, i) => {
          const h = Math.max(2, Math.round((d.rotas / max) * 56));
          const isToday = d.data === today;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: isToday ? accent : d.rotas > 0 ? ok : muted,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                opacity: d.rotas > 0 ? 1 : 0.35,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function Badge({ tone, label }: { tone: 'ok' | 'accent' | 'muted'; label: string }) {
  const c = useColors();
  const bg = tone === 'ok' ? 'rgba(46,168,99,0.15)' : tone === 'accent' ? c.accentDim : c.surface2;
  const fg = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.textMuted;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
      <Text style={{ color: fg, fontFamily: 'Poppins_600SemiBold', fontSize: 10 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.6 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  panelHead: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelHeadLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelEmpty: { padding: 28, alignItems: 'center' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  quickActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  ghostBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
});

const statStyles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  value: { fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  strip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
});

const heroStyles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,82,26,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  inner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  left: {
    flex: 1,
    minWidth: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  greeting: { color: '#f0ede8', fontFamily: 'Poppins_700Bold', fontSize: 15 },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: 'rgba(212,82,26,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(212,82,26,0.4)',
  },
  versionPillText: {
    color: '#e8a882',
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(240,237,232,0.5)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d4521a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    shadowColor: '#d4521a',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  ctaText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },
  close: { padding: 4 },
});
