import { useState } from 'react';
import { ScrollView, View, StyleSheet, Text, RefreshControl, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { H1, Muted } from '@/components/ui';
import { formatDate, formatMs } from '@/lib/format';

type Analysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  geocodeSuccess: number;
  similarityAvg: number;
  processingTimeMs: number;
  parserMode: string;
  status: string;
  createdAt: string;
};

type Listing = { items: Analysis[]; total: number; page: number; limit: number };

export default function HistoryScreen() {
  const c = useColors();
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<Listing>({
    queryKey: ['/api/analyses', page, limit],
    queryFn: () =>
      apiRequest<Listing>(`/api/analyses?page=${page}&limit=${limit}`),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const onDelete = (id: number) => {
    Alert.alert('Excluir análise', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await apiRequest(`/api/analyses/${id}`, { method: 'DELETE' });
            await queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Falha ao excluir.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />}
      >
        <View>
          <H1>Histórico de análises</H1>
          <Muted>
            {total > 0
              ? `${total} análise${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`
              : 'Nenhuma análise ainda.'}
          </Muted>
        </View>

        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>Análises</Text>
          </View>

          {isLoading ? (
            <View style={styles.empty}>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular' }}>Carregando…</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={32} color={c.textFaint} />
              <Muted>Nenhuma análise encontrada.</Muted>
            </View>
          ) : (
            items.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.row,
                  { borderBottomColor: c.border, borderBottomWidth: i === items.length - 1 ? 0 : 1 },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: c.text, fontFamily: 'Poppins_500Medium', fontSize: 13 }}
                  >
                    {a.fileName}
                  </Text>
                  <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 11 }}>
                    #{a.id} · {formatDate(a.createdAt)} · {formatMs(a.processingTimeMs)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Tag bg={c.surface2} fg={c.textFaint}>
                      {a.totalAddresses} endereços
                    </Tag>
                    <Tag
                      bg={a.nuances > 0 ? c.accentDim : 'rgba(46,168,99,0.15)'}
                      fg={a.nuances > 0 ? c.accent : c.ok}
                    >
                      {a.nuances} nuances
                    </Tag>
                    <Tag bg={c.surface2} fg={c.textFaint}>
                      {(a.similarityAvg * 100).toFixed(1)}% sim.
                    </Tag>
                    <Tag bg={c.surface2} fg={c.textFaint}>
                      {a.parserMode}
                    </Tag>
                    <Tag
                      bg={a.status === 'done' ? 'rgba(46,168,99,0.15)' : c.accentDim}
                      fg={a.status === 'done' ? c.ok : c.accent}
                    >
                      {a.status === 'done' ? 'Concluído' : a.status}
                    </Tag>
                  </View>
                </View>
                <Pressable
                  onPress={() => onDelete(a.id)}
                  disabled={deletingId === a.id}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    opacity: pressed || deletingId === a.id ? 0.5 : 1,
                    padding: 6,
                  })}
                >
                  <Ionicons name="trash-outline" size={18} color={c.textFaint} />
                </Pressable>
              </View>
            ))
          )}

          {totalPages > 1 && (
            <View style={[styles.paginator, { borderTopColor: c.border }]}>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 12 }}>
                Página {page} de {totalPages}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={({ pressed }) => [
                    styles.pageBtn,
                    {
                      borderColor: c.borderStrong,
                      opacity: page <= 1 ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
                    Anterior
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={({ pressed }) => [
                    styles.pageBtn,
                    {
                      borderColor: c.borderStrong,
                      opacity: page >= totalPages ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 12 }}>
                    Próxima
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
      <Text style={{ color: fg, fontFamily: 'Poppins_500Medium', fontSize: 10 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  panel: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  panelHead: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  panelHeadLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  empty: { padding: 32, alignItems: 'center', gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paginator: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
});
