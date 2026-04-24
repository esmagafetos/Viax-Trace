import { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { VictoryBar, VictoryAxis, VictoryChart } from 'victory-native';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { ViaXLogo } from '@/components/ViaXLogo';
import { formatBRL, formatDate, formatShortDate } from '@/lib/format';
import { useResponsive } from '@/lib/responsive';
import { useDashboardData, type DashboardFinancial } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/states/Skeleton';
import {
  StatTilesLoading,
  FinancialPanelLoading,
  RecentListLoading,
} from '@/components/states/LoadingState';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';

/** Mirror of the web's `cubic-bezier(0, 0, 0.2, 1)` (ease-out). */
const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);
/** Reusable entry transition factory — keeps every card on the same beat. */
const enterTransition = (delay = 0) =>
  ({ type: 'timing' as const, duration: 320, delay, easing: EASE_OUT });

export default function DashboardScreen() {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { rs } = useResponsive();
  const [heroDismissed, setHeroDismissed] = useState(false);

  const { summary, recent, financial, isRefetching, refetchAll } = useDashboardData();
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: rs(16), gap: rs(14), paddingBottom: rs(32) }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      >
        {/* Hero banner — slides + fades in, mirrors web's hover-card register */}
        {!heroDismissed && (
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={enterTransition(0)}
          >
            <HeroBanner
              userName={firstName}
              onDismiss={() => setHeroDismissed(true)}
              onAction={() => router.push('/(tabs)/process')}
            />
          </MotiView>
        )}

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={enterTransition(60)}
        >
          <Text style={[styles.h1, { color: c.text, fontSize: rs(22) }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: c.textFaint, fontSize: rs(12) }]}>
            Resumo das suas análises e controle financeiro de rotas.
          </Text>
        </MotiView>

        {/* ── Stat tiles ─────────────────────────────────────────────── */}
        {summary.isLoading && !summary.data ? (
          <StatTilesLoading />
        ) : summary.error ? (
          <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <ErrorState
              error={summary.error}
              onRetry={() => summary.refetch()}
              compact
              title="Não foi possível carregar as estatísticas"
            />
          </View>
        ) : (
          summary.data && (
            <View style={[styles.statGrid, { gap: rs(8) }]}>
              {[
                { value: String(summary.data.totalAnalyses), label: 'Análises', tone: 'muted' as const },
                {
                  value: summary.data.totalAddressesProcessed.toLocaleString('pt-BR'),
                  label: 'Endereços',
                  tone: 'ok' as const,
                },
                {
                  value: `${Math.round(
                    (summary.data.avgNuanceRate / Math.max(summary.data.totalAddressesProcessed, 1)) * 100 || 0
                  )}%`,
                  label: 'Nuances',
                  tone: 'accent' as const,
                },
                {
                  value: `${Math.round((summary.data.avgSimilarity || 0) * 100)}%`,
                  label: 'Similaridade',
                  tone: 'ok' as const,
                },
                { value: String(summary.data.analysesThisMonth), label: 'Este mês', tone: 'muted' as const },
              ].map((tile, i) => (
                <MotiView
                  key={tile.label}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={enterTransition(120 + i * 50)}
                  style={statTileWrap}
                >
                  <StatTile {...tile} />
                </MotiView>
              ))}
            </View>
          )
        )}

        {/* ── Financial panel ───────────────────────────────────────── */}
        {financial.isLoading && !financial.data ? (
          <FinancialPanelLoading />
        ) : financial.error ? (
          <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <ErrorState
              error={financial.error}
              onRetry={() => financial.refetch()}
              compact
              title="Painel financeiro indisponível"
            />
          </View>
        ) : (
          financial.data && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={enterTransition(380)}
            >
              <FinancialPanel f={financial.data} onConfigure={() => router.push('/(tabs)/settings')} />
            </MotiView>
          )
        )}

        {/* Quick actions */}
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={enterTransition(440)}
          style={styles.quickActions}
        >
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
        </MotiView>

        {/* ── Análises recentes ─────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={enterTransition(500)}
          style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
        >
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>Análises recentes</Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={6}>
              <Text style={{ color: c.accent, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
                Ver todas →
              </Text>
            </Pressable>
          </View>

          {recent.isLoading && !recent.data ? (
            <RecentListLoading />
          ) : recent.error ? (
            <ErrorState
              error={recent.error}
              onRetry={() => recent.refetch()}
              compact
              title="Não foi possível carregar as análises"
            />
          ) : !recent.data || recent.data.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title="Nenhuma análise ainda"
              subtitle="Processe sua primeira rota para vê-la listada aqui."
              cta={{ label: 'Processar primeira rota', onPress: () => router.push('/(tabs)/process') }}
            />
          ) : (
            recent.data.map((a, i) => (
              <MotiView
                key={a.id}
                from={{ opacity: 0, translateX: -6 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={enterTransition(560 + i * 35)}
                style={[
                  styles.recentRow,
                  { borderBottomColor: c.border, borderBottomWidth: i === recent.data!.length - 1 ? 0 : 1 },
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
                  <Badge tone={a.nuances > 0 ? 'accent' : 'ok'} label={`${a.nuances}`} />
                  <Badge
                    tone={a.status === 'done' ? 'ok' : 'accent'}
                    label={a.status === 'done' ? 'OK' : a.status}
                  />
                </View>
              </MotiView>
            ))
          )}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  HeroBanner                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

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

      <Svg
        viewBox="0 0 600 120"
        preserveAspectRatio="xMidYMid slice"
        style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}
        pointerEvents="none"
      >
        <Path d="M0 60 C100 20 200 100 300 60 C400 20 500 80 600 40" stroke="white" strokeWidth={2} strokeDasharray="8 10" fill="none" />
        <Path d="M0 90 C150 50 250 110 400 70 C500 40 550 90 600 70" stroke="white" strokeWidth={1.5} strokeDasharray="5 8" fill="none" />
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  StatTile                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
  value,
  label,
  tone = 'muted',
}: {
  value: string;
  label: string;
  tone?: 'muted' | 'ok' | 'accent';
}) {
  const c = useColors();
  const { rs } = useResponsive();
  const color = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.text;
  const stripColor = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.borderStrong;
  return (
    <View
      style={[
        statStyles.tile,
        {
          backgroundColor: c.surface,
          borderColor: c.borderStrong,
          paddingHorizontal: rs(12),
          paddingTop: rs(12),
          paddingBottom: rs(14),
        },
      ]}
    >
      <Text style={[statStyles.value, { color, fontSize: rs(22) }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: c.textFaint, fontSize: rs(9) }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[statStyles.strip, { backgroundColor: stripColor }]} />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  FinancialPanel                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

function FinancialPanel({ f, onConfigure }: { f: DashboardFinancial; onConfigure: () => void }) {
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
          {f.valorPorRota != null && (
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

        <ActivityChart data={f.graficoDiario ?? []} />
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  ActivityChart (victory-native)                                          */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Bar chart of "rotas por dia" mirroring the web's mini chart styling:
 *  - today        → accent
 *  - day with > 0 → ok (green)
 *  - empty day    → border, low opacity
 * Built with `victory-native` so animations and scaling are handled by the
 * library while the visual register stays identical to the web.
 */
function ActivityChart({ data }: { data: { data: string; rotas: number; receita: number }[] }) {
  const c = useColors();
  const { width: screenW } = useWindowDimensions();
  const visible = data.slice(-20);
  const today = new Date().toISOString().substring(0, 10);

  if (visible.length === 0) return null;

  // Width budget = screen − scroll padding (16) − panel padding (14) on both sides.
  const chartWidth = Math.max(180, screenW - 16 * 2 - 14 * 2);
  const chartHeight = 90;

  return (
    <View>
      <Text
        style={{
          color: c.textFaint,
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Atividade do ciclo
      </Text>

      <VictoryChart
        width={chartWidth}
        height={chartHeight}
        padding={{ top: 6, bottom: 14, left: 6, right: 6 }}
        domainPadding={{ x: 6 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: 'transparent' },
            ticks: { stroke: 'transparent' },
            tickLabels: { fill: 'transparent' },
            grid: { stroke: 'transparent' },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'transparent' },
            ticks: { stroke: 'transparent' },
            tickLabels: { fill: 'transparent' },
            grid: { stroke: 'transparent' },
          }}
        />
        <VictoryBar
          data={visible}
          x="data"
          y="rotas"
          cornerRadius={{ top: 2 }}
          style={{
            data: {
              fill: ({ datum }: any) =>
                datum.data === today ? c.accent : datum.rotas > 0 ? c.ok : c.borderStrong,
              fillOpacity: ({ datum }: any) => (datum.rotas > 0 ? 1 : 0.35),
            },
          }}
          animate={{ duration: 400, easing: 'cubicOut', onLoad: { duration: 320 } }}
        />
      </VictoryChart>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10 }}>
          {formatShortDate(visible[0]?.data)}
        </Text>
        <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 10 }}>hoje</Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Misc                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

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

const statTileWrap = { flexBasis: '47%', flexGrow: 1 } as const;

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
    color: 'rgba(240,237,232,0.55)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: '#d4521a',
    shadowColor: '#d4521a',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctaText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  close: { padding: 4 },
});
