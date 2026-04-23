import { useState } from 'react';
import { ScrollView, View, StyleSheet, Text, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { ViaXLogo } from '@/components/ViaXLogo';
import { Card } from '@/components/ui';
import { formatBRL, formatDate, formatShortDate } from '@/lib/format';

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
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={c.accent} />}
      >
        {/* Hero banner */}
        {!heroDismissed && <HeroBanner userName={firstName} onDismiss={() => setHeroDismissed(true)} onAction={() => router.push('/(tabs)/process')} />}

        <View>
          <Text style={[styles.h1, { color: c.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: c.textFaint }]}>
            Resumo das suas análises e controle financeiro de rotas.
          </Text>
        </View>

        {/* Stat tiles */}
        {s ? (
          <View style={styles.statGrid}>
            <StatTile value={String(s.totalAnalyses)} label="Análises" />
            <StatTile
              value={s.totalAddressesProcessed.toLocaleString('pt-BR')}
              label="Endereços"
              tone="ok"
            />
            <StatTile
              value={`${Math.round((s.avgNuanceRate / Math.max(s.totalAddressesProcessed, 1)) * 100 || 0)}%`}
              label="Nuances"
              tone="accent"
            />
            <StatTile
              value={`${Math.round((s.avgSimilarity || 0) * 100)}%`}
              label="Similaridade"
              tone="ok"
            />
            <StatTile value={String(s.analysesThisMonth)} label="Este mês" />
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
      <View style={heroStyles.blob1} />
      <View style={heroStyles.blob2} />
      <View style={heroStyles.inner}>
        <View style={{ flex: 1, gap: 10 }}>
          <ViaXLogo size="md" dark showTagline />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={heroStyles.greeting}>Olá, {userName}!</Text>
            <View style={heroStyles.versionPill}>
              <Text style={heroStyles.versionPillText}>v8.0</Text>
            </View>
          </View>
          <Text style={heroStyles.subtitle}>
            Geocodificação multi-camada · Detecção de nuances · Suporte a Travessa e Passagem
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Pressable onPress={onAction} style={({ pressed }) => [heroStyles.cta, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
            <Text style={heroStyles.ctaText}>Nova análise</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={heroStyles.close} hitSlop={8}>
            <Ionicons name="close" size={16} color="rgba(240,237,232,0.4)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatTile({ value, label, tone = 'muted' }: { value: string; label: string; tone?: 'muted' | 'ok' | 'accent' }) {
  const c = useColors();
  const color = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.text;
  const stripColor = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.borderStrong;
  return (
    <View
      style={[
        statStyles.tile,
        { backgroundColor: c.surface, borderColor: c.borderStrong },
      ]}
    >
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: c.textFaint }]}>{label}</Text>
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
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  value: { fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.5 },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
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
    backgroundColor: '#1a0e08',
    borderWidth: 1,
    borderColor: 'rgba(212,82,26,0.25)',
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212,82,26,0.18)',
    top: -60,
    right: -30,
  },
  blob2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(212,82,26,0.10)',
    bottom: -40,
    left: -10,
  },
  inner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  greeting: { color: '#f0ede8', fontFamily: 'Poppins_700Bold', fontSize: 14 },
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
    fontSize: 11,
    lineHeight: 16,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d4521a',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
  },
  ctaText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  close: { padding: 4 },
});
