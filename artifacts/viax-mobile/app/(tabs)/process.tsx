import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AppHeader } from '@/components/AppHeader';
import { useResponsive } from '@/lib/responsive';
import { apiRequest, getApiUrl } from '@/lib/api';
import { formatMs } from '@/lib/format';

type ResultRow = {
  linha: number;
  endereco_original: string;
  nome_rua_extraido: string | null;
  nome_rua_oficial: string | null;
  similaridade: number | null;
  is_nuance: boolean;
  motivo: string;
  poi_estruturado: string | null;
  distancia_metros: number | null;
  tipo_endereco: string;
};

type ProcessResult = {
  total_enderecos: number;
  total_nuances: number;
  percentual_problema: number;
  detalhes: ResultRow[];
  metricas_tecnicas: {
    tempo_processamento_ms: number;
    taxa_geocode_sucesso: number;
    instancia: string;
  };
};

type SettingsBrief = {
  instanceMode?: string;
  googleMapsApiKey?: string | null;
};

type Filter = 'all' | 'nuance' | 'ok';

const TIPO_MAP: Record<string, { label: string; color: string }> = {
  rodovia: { label: 'Rodovias', color: '#f97316' },
  comercio: { label: 'Comércios', color: '#a855f7' },
  via_secundaria: { label: 'Via Secundária', color: '#3b82f6' },
  avenida_extensa: { label: 'Av. Extensas', color: '#eab308' },
  residencial: { label: 'Residencial', color: '#22c55e' },
};

export default function ProcessScreen() {
  const c = useColors();
  const { rs } = useResponsive();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const stepsScrollRef = useRef<ScrollView>(null);

  const { data: settings } = useQuery<SettingsBrief>({
    queryKey: ['/api/users/settings'],
    queryFn: () => apiRequest<SettingsBrief>('/api/users/settings'),
  });

  const instanceMode = settings?.instanceMode ?? 'builtin';
  const googleMapsApiKey = settings?.googleMapsApiKey ?? '';

  const configWarning: { type: 'error' | 'info'; message: string; action?: string } | null = (() => {
    if (instanceMode === 'googlemaps' && !googleMapsApiKey) {
      return {
        type: 'error',
        message: 'Motor Google Maps selecionado, mas nenhuma chave de API foi configurada.',
        action: 'Adicione sua chave em Configurações → Instâncias para continuar.',
      };
    }
    if (instanceMode === 'geocodebr') {
      return {
        type: 'info',
        message: 'Motor GeocodeR BR (CNEFE/IBGE) ativo.',
        action: 'Certifique-se de que o microserviço R está rodando localmente na porta 8002.',
      };
    }
    return null;
  })();

  const canProcess = !!file && !isProcessing && configWarning?.type !== 'error';

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
    if (!file) return;
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

      const response = await fetch(`${apiUrl}/api/process/upload`, {
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
              addStep('✓ Análise concluída!');
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
      activeFilter === 'all' ? true : activeFilter === 'nuance' ? r.is_nuance : !r.is_nuance,
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
          <Text style={[styles.h1, { color: c.text, fontSize: rs(20) }]}>Processar Rota</Text>
          <Text style={[styles.h1sub, { color: c.textFaint, fontSize: rs(12) }]}>
            Importe um arquivo XLSX ou CSV com a coluna "Destination Address".
          </Text>
        </View>

        {/* Config warning banner */}
        {configWarning && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              backgroundColor:
                configWarning.type === 'error'
                  ? 'rgba(212,82,26,0.08)'
                  : 'rgba(124,58,237,0.07)',
              borderWidth: 1,
              borderColor:
                configWarning.type === 'error'
                  ? 'rgba(212,82,26,0.3)'
                  : 'rgba(124,58,237,0.25)',
            }}
          >
            <Ionicons
              name={configWarning.type === 'error' ? 'close-circle' : 'information-circle'}
              size={18}
              color={configWarning.type === 'error' ? c.accent : '#7c3aed'}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 12,
                  color: configWarning.type === 'error' ? c.accent : '#7c3aed',
                  marginBottom: configWarning.action ? 3 : 0,
                }}
              >
                {configWarning.message}
              </Text>
              {configWarning.action && (
                <Text
                  style={{
                    fontFamily: 'Poppins_400Regular',
                    fontSize: 11,
                    color: c.textFaint,
                    lineHeight: 16,
                  }}
                >
                  {configWarning.action}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Upload card */}
        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.panelHeadLabel, { color: c.textFaint }]}>Importar Rota</Text>
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
              style={{
                color: c.text,
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 10,
              }}
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
                : 'XLSX ou CSV · coluna "Destination Address" · máx 10MB'}
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
                <Ionicons name="search" size={16} color={c.bg} />
              )}
              <Text style={{ color: c.bg, fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>
                {isProcessing ? 'Processando...' : 'Iniciar'}
              </Text>
            </Pressable>
          </View>

          {(isProcessing || (steps.length > 0 && !result)) && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', gap: 10 }}>
              {isProcessing && <ActivityIndicator color={c.accent} size="small" />}
              <ScrollView ref={stepsScrollRef} style={{ maxHeight: 180, alignSelf: 'stretch' }}>
                {steps.map((step, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
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
            {/* Stat tiles */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                {
                  value: String(result.total_enderecos),
                  label: 'Total',
                  color: c.text,
                  bar: c.border,
                },
                {
                  value: String(result.total_nuances),
                  label: 'Nuances',
                  color: c.accent,
                  bar: c.accent,
                },
                {
                  value: String(result.total_enderecos - result.total_nuances),
                  label: 'OK',
                  color: c.ok,
                  bar: c.ok,
                },
                {
                  value: `${result.percentual_problema}%`,
                  label: 'Taxa Nuance',
                  color: result.percentual_problema > 20 ? c.accent : c.ok,
                  bar: result.percentual_problema > 20 ? c.accent : c.ok,
                },
                {
                  value: `${result.metricas_tecnicas.taxa_geocode_sucesso}%`,
                  label: 'Geocode OK',
                  color: c.ok,
                  bar: c.ok,
                },
                {
                  value: formatMs(result.metricas_tecnicas.tempo_processamento_ms),
                  label: 'Tempo',
                  color: c.text,
                  bar: c.border,
                },
              ].map((it) => (
                <View
                  key={it.label}
                  style={[
                    styles.statTile,
                    { backgroundColor: c.surface, borderColor: c.borderStrong },
                  ]}
                >
                  <Text
                    style={{
                      color: it.color,
                      fontFamily: 'Poppins_700Bold',
                      fontSize: 22,
                      letterSpacing: -0.5,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
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
                      backgroundColor: it.bar,
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Instance badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: c.textFaint, fontFamily: 'Poppins_500Medium', fontSize: 11 }}>
                Processado via
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 99,
                  backgroundColor: c.surface2,
                  borderWidth: 1,
                  borderColor: c.borderStrong,
                }}
              >
                <Text style={{ color: c.textMuted, fontFamily: 'Poppins_700Bold', fontSize: 11 }}>
                  {result.metricas_tecnicas.instancia}
                </Text>
              </View>
            </View>

            {/* Analytics chart */}
            <AnalyticsCard result={result} />

            {/* Filter chips + export */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['all', 'nuance', 'ok'] as const).map((f) => {
                  const isActive = activeFilter === f;
                  const count =
                    f === 'all'
                      ? result.detalhes.length
                      : f === 'nuance'
                      ? result.total_nuances
                      : result.total_enderecos - result.total_nuances;
                  const label = f === 'all' ? 'Todos' : f === 'nuance' ? 'Nuances' : 'OK';
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setActiveFilter(f)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: isActive ? c.accentDim : 'transparent',
                          borderColor: isActive ? c.accent : c.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? c.accent : c.textMuted,
                          fontFamily: 'Poppins_600SemiBold',
                          fontSize: 11,
                        }}
                      >
                        {label} <Text style={{ opacity: 0.7 }}>({count})</Text>
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'transparent',
                    borderColor: c.borderStrong,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="download-outline" size={12} color={c.textMuted} />
                <Text style={{ color: c.textMuted, fontFamily: 'Poppins_600SemiBold', fontSize: 11 }}>
                  Exportar CSV
                </Text>
              </Pressable>
            </View>

            {/* Result rows */}
            <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
              <View style={[styles.panelHead, { borderBottomColor: c.border }]}>
                <Text style={[styles.panelHeadLabel, { color: c.textMuted }]}>Detalhes</Text>
              </View>
              {filteredRows.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text
                    style={{ color: c.textFaint, fontFamily: 'Poppins_400Regular', fontSize: 13 }}
                  >
                    Nenhum registro para este filtro.
                  </Text>
                </View>
              ) : (
                filteredRows.map((r, idx) => <ResultRowCard key={r.linha} row={r} index={idx} />)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────── analytics card (donut + bars) ─────────────── */

function AnalyticsCard({ result }: { result: ProcessResult }) {
  const c = useColors();
  const total = result.total_enderecos;
  const nuances = result.total_nuances;
  const ok = total - nuances;
  const pctNuance = total > 0 ? (nuances / total) * 100 : 0;
  const pctOk = 100 - pctNuance;

  const tipoCounts: Record<string, number> = {};
  for (const row of result.detalhes) {
    const t = row.tipo_endereco || 'residencial';
    tipoCounts[t] = (tipoCounts[t] || 0) + 1;
  }

  // donut math
  const R = 42;
  const cx = 56;
  const cy = 56;
  const stroke = 14;
  const circ = 2 * Math.PI * R;
  const nuanceDash = (pctNuance / 100) * circ;
  const okDash = (pctOk / 100) * circ;

  return (
    <View style={[panel.wrap, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
      <View style={[panel.head, { borderBottomColor: c.border }]}>
        <Text style={[panel.headLabel, { color: c.textMuted }]}>Análise Visual da Rota</Text>
      </View>
      <View style={{ padding: 16, gap: 18 }}>
        {/* donut + legend */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Svg width={112} height={112} viewBox="0 0 112 112">
            {/* OK segment */}
            <Circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={c.ok}
              strokeWidth={stroke}
              strokeDasharray={`${okDash} ${circ}`}
              strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            {/* Nuance segment */}
            <Circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={c.accent}
              strokeWidth={stroke}
              strokeDasharray={`${nuanceDash} ${circ}`}
              strokeDashoffset={-okDash}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <SvgText
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize={16}
              fontWeight="800"
              fill={c.text}
            >
              {Math.round(pctNuance)}%
            </SvgText>
            <SvgText x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={c.textFaint}>
              Nuances
            </SvgText>
          </Svg>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Legend color={c.accent} label={`Nuances (${nuances})`} c={c} />
            <Legend color={c.ok} label={`OK (${ok})`} c={c} />
          </View>
        </View>

        {/* bar chart - tipos */}
        <View>
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 10,
              color: c.textFaint,
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Distribuição por Tipo
          </Text>
          <View style={{ gap: 8 }}>
            {Object.entries(TIPO_MAP).map(([tipo, { label, color }]) => {
              const count = tipoCounts[tipo] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <View key={tipo}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Poppins_500Medium',
                        fontSize: 12,
                        color: c.textMuted,
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Poppins_400Regular',
                        fontSize: 12,
                        color: c.textFaint,
                      }}
                    >
                      {count}{' '}
                      <Text style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</Text>
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 99,
                      backgroundColor: c.borderStrong,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 99,
                        width: `${pct}%` as `${number}%`,
                        backgroundColor: color,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* nuance por tipo */}
          {nuances > 0 && (
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 10,
                  color: c.textFaint,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Nuances por Tipo
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(TIPO_MAP).map(([tipo, { label, color }]) => {
                  const count = result.detalhes.filter(
                    (r) => (r.tipo_endereco || 'residencial') === tipo && r.is_nuance,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <View
                      key={tipo}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 99,
                        backgroundColor: `${color}22`,
                        borderWidth: 1,
                        borderColor: `${color}44`,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: color,
                        }}
                      />
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: 'Poppins_500Medium',
                          fontSize: 11,
                        }}
                      >
                        {label}: {count}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Legend({ color, label, c }: { color: string; label: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: c.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

/* ─────────────── result row ─────────────── */

function ResultRowCard({ row, index }: { row: ResultRow; index: number }) {
  const c = useColors();
  const sim = row.similaridade ?? null;
  const simPct = sim !== null ? Math.round(sim * 100) : null;
  const simColor = sim !== null && sim < 0.8 ? c.accent : c.ok;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 14,
        borderTopWidth: index === 0 ? 0 : 1,
        borderTopColor: c.border,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: row.is_nuance ? c.accentDim : 'rgba(46,168,99,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: row.is_nuance ? c.accent : c.ok,
            fontFamily: 'Poppins_700Bold',
            fontSize: 11,
          }}
        >
          {row.linha}
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
          <View
            style={{
              backgroundColor: row.is_nuance ? c.accentDim : 'rgba(46,168,99,0.15)',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text
              style={{
                color: row.is_nuance ? c.accent : c.ok,
                fontFamily: 'Poppins_700Bold',
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {row.is_nuance ? 'Nuance' : 'OK'}
            </Text>
          </View>
          {simPct !== null && (
            <Text
              style={{
                color: simColor,
                fontFamily: 'Poppins_700Bold',
                fontSize: 11,
              }}
            >
              {simPct}%
            </Text>
          )}
        </View>
        <Text
          style={{
            color: c.text,
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 12,
            marginBottom: 2,
          }}
          numberOfLines={2}
        >
          {row.endereco_original}
        </Text>
        {(row.nome_rua_extraido || row.nome_rua_oficial) && (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: 'Poppins_400Regular',
              fontSize: 11,
              marginBottom: 2,
              lineHeight: 16,
            }}
          >
            {row.nome_rua_extraido ?? <Text style={{ fontStyle: 'italic' }}>não extraída</Text>}
            {' → '}
            {row.nome_rua_oficial ?? <Text style={{ fontStyle: 'italic' }}>não encontrada</Text>}
          </Text>
        )}
        {sim !== null && (
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: c.borderStrong,
              overflow: 'hidden',
              marginTop: 4,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${(sim * 100).toFixed(0)}%` as `${number}%`,
                backgroundColor: simColor,
              }}
            />
          </View>
        )}
        {row.motivo && (
          <Text
            style={{
              color: c.textFaint,
              fontFamily: 'Poppins_400Regular',
              fontSize: 10,
              fontStyle: 'italic',
              lineHeight: 14,
            }}
            numberOfLines={2}
          >
            {row.motivo}
          </Text>
        )}
      </View>
    </View>
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
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
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
});
