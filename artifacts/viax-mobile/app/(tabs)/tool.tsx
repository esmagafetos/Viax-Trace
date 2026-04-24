import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppHeader } from '@/components/AppHeader';
import { useResponsive } from '@/lib/responsive';
import { apiRequest, getApiUrl } from '@/lib/api';

type CondoSummary = {
  id: string;
  nome: string;
  status: 'ativo' | 'em_desenvolvimento';
  totalLotes?: number;
};

type Classificacao = 'ordenada' | 'encontrada_sem_condominio' | 'nuance';

type DeliveryRow = {
  linha: number;
  enderecoOriginal: string;
  quadra: number | null;
  lote: number | null;
  classificacao: Classificacao;
  motivo: string;
  ordem?: number;
  instrucao?: string;
};

type RouteResult = {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
};

type Filter = 'all' | Classificacao;

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todos',
  ordenada: 'Ordenadas',
  encontrada_sem_condominio: 'Sem condomínio',
  nuance: 'Nuances',
};

const CLASS_COLOR: Record<Classificacao, string> = {
  ordenada: '#2ea863',
  encontrada_sem_condominio: '#7c3aed',
  nuance: '#d4521a',
};

const CLASS_LABEL: Record<Classificacao, string> = {
  ordenada: 'Ordenada',
  encontrada_sem_condominio: 'Sem condomínio',
  nuance: 'Nuance',
};

export default function ToolScreen() {
  const c = useColors();
  const { rs } = useResponsive();
  const [condos, setCondos] = useState<CondoSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('bougainville-iii');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const stepsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    apiRequest<{ condominios: CondoSummary[] }>('/api/condominium/list')
      .then((d) => setCondos(d.condominios ?? []))
      .catch(() => setCondos([]));
  }, []);

  const selected = condos.find((co) => co.id === selectedId);
  const canProcess = !!file && !isProcessing && selected?.status === 'ativo';

  const addStep = (msg: string) => {
    setSteps((prev) => [...prev.slice(-30), msg]);
    setTimeout(() => stepsScrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const ext = asset.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(ext ?? '')) {
      Alert.alert('Formato inválido', 'Use .xlsx ou .csv');
      return;
    }
    setFile(asset);
    setResult(null);
    setSteps([]);
  };

  const handleProcess = async () => {
    if (!file || !selected) return;
    if (selected.status !== 'ativo') {
      Alert.alert('Indisponível', 'Este condomínio ainda está em desenvolvimento.');
      return;
    }
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      Alert.alert('Servidor', 'Configure o servidor em Configurações antes de processar.');
      return;
    }
    setIsProcessing(true);
    setSteps([]);
    setResult(null);
    addStep('Enviando arquivo...');

    try {
      const form = new FormData();
      form.append('arquivo', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any);
      form.append('condominioId', selected.id);

      const response = await fetch(`${apiUrl}/api/condominium/process`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      if (!response.ok || !response.body) {
        Alert.alert('Erro', `Falha no processamento (HTTP ${response.status}).`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'step' && parsed.step) addStep(parsed.step);
            else if (eventType === 'result' && parsed.result) {
              setResult(parsed.result);
              addStep('✓ Sequência logística pronta!');
            } else if (eventType === 'error' && parsed.error) {
              Alert.alert('Erro', parsed.error);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erro de conexão', err?.message ?? String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows =
    result?.detalhes.filter((r) =>
      activeFilter === 'all' ? true : r.classificacao === activeFilter,
    ) ?? [];

  const exportCsv = () => {
    if (!result) return;
    Alert.alert(
      'Exportar CSV',
      'A exportação de CSV no aplicativo móvel será habilitada em breve. Use a versão web para baixar o arquivo.',
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: rs(16), paddingBottom: rs(32), gap: rs(14) }]}
      >
        {/* Header */}
        <View>
          <Text style={[styles.h1, { color: c.text, fontSize: rs(20) }]}>Ferramenta de Condomínios</Text>
          <Text style={[styles.h1sub, { color: c.textFaint, fontSize: rs(12) }]}>
            Rastreamento interno de entregas em condomínios fechados — Nova Califórnia (Tamoios).
          </Text>
        </View>

        {/* Selector */}
        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textFaint }]}>Selecionar condomínio</Text>
          </View>
          <View style={{ padding: rs(12), gap: 8 }}>
            {condos.length === 0 && (
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 12 }}>
                Carregando condomínios…
              </Text>
            )}
            {condos.map((co) => {
              const isActive = co.id === selectedId;
              const isAvail = co.status === 'ativo';
              return (
                <Pressable
                  key={co.id}
                  onPress={() => isAvail && setSelectedId(co.id)}
                  disabled={!isAvail}
                  style={({ pressed }) => [
                    styles.condoCard,
                    {
                      borderColor: isActive ? c.accent : c.borderStrong,
                      backgroundColor: isActive ? c.accentDim : c.surface2,
                      opacity: !isAvail ? 0.55 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 14 }}>
                    {co.nome}
                  </Text>
                  <Text
                    style={{
                      color: isAvail ? c.ok : c.textFaint,
                      fontFamily: 'Poppins_600SemiBold',
                      fontSize: 10,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}
                  >
                    {isAvail
                      ? `Disponível${co.totalLotes ? ` · ${co.totalLotes} lotes` : ''}`
                      : 'Em desenvolvimento'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Upload */}
        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textFaint }]}>
              Importar rota — {selected?.nome ?? '—'}
            </Text>
          </View>
          <Pressable
            onPress={pickFile}
            style={({ pressed }) => [
              styles.dropzone,
              {
                margin: 12,
                borderColor: file ? c.accent : c.borderStrong,
                backgroundColor: file ? c.accentDim : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                backgroundColor: c.accentDim,
                borderWidth: 1,
                borderColor: c.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={c.accent} />
            </View>
            <Text
              style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 14, textAlign: 'center', marginTop: 10 }}
            >
              {file ? file.name : 'Toque para selecionar a planilha'}
            </Text>
            <Text
              style={{
                color: c.textFaint,
                fontFamily: 'Poppins_400Regular',
                fontSize: 11,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {file
                ? file.size
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : ''
                : 'XLSX ou CSV · coluna "Destination Address"'}
            </Text>
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 99,
                backgroundColor: c.accent,
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
                {file ? 'Trocar arquivo' : 'Selecionar arquivo'}
              </Text>
            </View>
          </Pressable>

          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <Pressable
              onPress={handleProcess}
              disabled={!canProcess}
              style={({ pressed }) => [
                styles.startBtn,
                {
                  backgroundColor: c.text,
                  opacity: !canProcess ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator color={c.bg} />
              ) : (
                <Ionicons name="flash-outline" size={16} color={c.bg} />
              )}
              <Text style={{ color: c.bg, fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>
                {isProcessing ? 'Processando…' : 'Iniciar'}
              </Text>
            </Pressable>
          </View>

          {(isProcessing || steps.length > 0) && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <ScrollView ref={stepsScrollRef} style={{ maxHeight: 180 }}>
                {steps.map((step, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: c.accent,
                        marginTop: 6,
                      }}
                    />
                    <Text
                      style={{
                        color: c.textFaint,
                        fontFamily: 'Poppins_400Regular',
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Results */}
        {result && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: result.totalLinhas, label: 'Total', color: c.text },
                { value: result.totalOrdenadas, label: 'Ordenadas', color: c.ok },
                { value: result.totalSemCondominio, label: 'Sem condomínio', color: '#7c3aed' },
                { value: result.totalNuances, label: 'Nuances', color: c.accent },
              ].map((it) => (
                <View
                  key={it.label}
                  style={[
                    styles.statTile,
                    { backgroundColor: c.surface, borderColor: c.borderStrong },
                  ]}
                >
                  <Text style={{ color: it.color, fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.5 }}>
                    {it.value}
                  </Text>
                  <Text
                    style={{
                      color: c.textFaint,
                      fontFamily: 'Poppins_600SemiBold',
                      fontSize: 9,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    {it.label}
                  </Text>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: it.color,
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => {
                  const isActive = activeFilter === f;
                  const count =
                    f === 'all'
                      ? result.detalhes.length
                      : result.detalhes.filter((r) => r.classificacao === f).length;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setActiveFilter(f)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: isActive ? c.accent : c.surface2,
                          borderColor: isActive ? c.accent : c.borderStrong,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? '#fff' : c.textMuted,
                          fontFamily: 'Poppins_600SemiBold',
                          fontSize: 11,
                        }}
                      >
                        {FILTER_LABEL[f]}{' '}
                        <Text style={{ opacity: 0.7 }}>({count})</Text>
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={exportCsv}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: c.surface2,
                    borderColor: c.borderStrong,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 11 }}>
                  Exportar CSV
                </Text>
              </Pressable>
            </View>

            <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
              <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
                <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>
                  Sequência de entregas — {result.condominio.nome}
                </Text>
              </View>
              {filteredRows.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>
                    Nenhum item para este filtro.
                  </Text>
                </View>
              ) : (
                filteredRows.map((r, idx) => (
                  <View
                    key={`${r.linha}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      padding: 14,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: `${CLASS_COLOR[r.classificacao]}28`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: CLASS_COLOR[r.classificacao],
                          fontFamily: 'Poppins_700Bold',
                          fontSize: 12,
                        }}
                      >
                        {r.ordem ?? '—'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ color: c.text, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>
                          {r.quadra !== null ? `Quadra ${r.quadra}` : 'Quadra ?'}
                          {r.lote !== null ? ` · Lote ${r.lote}` : ''}
                        </Text>
                        <View
                          style={{
                            backgroundColor: `${CLASS_COLOR[r.classificacao]}28`,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 99,
                          }}
                        >
                          <Text
                            style={{
                              color: CLASS_COLOR[r.classificacao],
                              fontFamily: 'Poppins_700Bold',
                              fontSize: 9,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                            }}
                          >
                            {CLASS_LABEL[r.classificacao]}
                          </Text>
                        </View>
                      </View>
                      {r.instrucao && (
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: 'Poppins_500Medium',
                            fontSize: 12,
                            marginBottom: 3,
                            lineHeight: 17,
                          }}
                        >
                          ➜ {r.instrucao}
                        </Text>
                      )}
                      <Text
                        style={{
                          color: c.textFaint,
                          fontFamily: 'Poppins_400Regular',
                          fontSize: 11,
                          marginBottom: 2,
                        }}
                      >
                        {r.enderecoOriginal}
                      </Text>
                      <Text
                        style={{
                          color: c.textFaint,
                          fontFamily: 'Poppins_400Regular',
                          fontSize: 10,
                          fontStyle: 'italic',
                        }}
                      >
                        {r.motivo}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  h1: { fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
  h1sub: { fontFamily: 'Poppins_400Regular', marginTop: 4, lineHeight: 17 },
  panel: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  panelHead: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  panelHeadLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  condoCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 99,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
});
