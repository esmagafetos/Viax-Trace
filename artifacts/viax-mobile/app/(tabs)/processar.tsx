import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScreenHeader from "@/components/ScreenHeader";
import { Donut, BarChart } from "@/components/Sparkline";
import { streamSSE } from "@/lib/sse";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { formatBytes, formatMs } from "@/lib/format";
import type { ProcessResult, ProcessResultRow, UserSettings } from "@/lib/types";

type Picked = { uri: string; name: string; size: number };
type Phase = "idle" | "ready" | "running" | "done" | "error";
type FilterMode = "all" | "nuance" | "ok";

export default function ProcessarScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => api<UserSettings>("/users/settings") });

  const [file, setFile] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [stepLog, setStepLog] = useState<string[]>([]);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const cancelRef = useRef<{ cancel: () => void } | null>(null);

  const settings = settingsQ.data;
  const showWarning = !settingsQ.isLoading && settings && settings.instanceMode === "googlemaps" && !settings.googleMapsApiKey;

  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const ext = (a.name ?? "").toLowerCase().split(".").pop();
      if (ext !== "xlsx" && ext !== "csv") { show("Use um arquivo .xlsx ou .csv", "error"); return; }
      if ((a.size ?? 0) > 10 * 1024 * 1024) { show("Arquivo acima de 10MB.", "error"); return; }
      setFile({ uri: a.uri, name: a.name ?? "arquivo", size: a.size ?? 0 });
      setPhase("ready");
      setResult(null); setErrorMsg(null); setStep(""); setStepLog([]); setProgress(0);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      show(e?.message ?? "Falha ao selecionar arquivo.", "error");
    }
  };

  const start = () => {
    if (!file) return;
    setPhase("running"); setProgress(0); setStep("Enviando arquivo..."); setStepLog([]); setResult(null); setErrorMsg(null);
    cancelRef.current = streamSSE({
      path: "/process/upload",
      fileUri: file.uri,
      fileName: file.name,
      handlers: {
        onStep: (d) => {
          setStep(d.step);
          setStepLog((prev) => [...prev.slice(-40), d.step]);
          if (typeof d.progress === "number") setProgress(d.progress);
          // Estimate progress from step messages like "[3/100]"
          const m = /\[(\d+)\/(\d+)\]/.exec(d.step);
          if (m) {
            const cur = Number(m[1]); const tot = Number(m[2]);
            if (tot > 0) setProgress(0.3 + (cur / tot) * 0.7);
          }
        },
        onResult: (d) => {
          const payload: ProcessResult = (d?.result ?? d) as ProcessResult;
          setResult(payload);
          setProgress(1);
          setPhase("done");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          show("Análise concluída.", "success");
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          void queryClient.invalidateQueries({ queryKey: ["analyses"] });
        },
        onError: (d) => {
          setErrorMsg(d.error);
          setPhase("error");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
      onUploadProgress: (frac) => setProgress(frac * 0.3),
    });
  };

  const cancel = () => { cancelRef.current?.cancel(); setPhase(file ? "ready" : "idle"); setStep(""); setProgress(0); };
  const reset = () => { setFile(null); setPhase("idle"); setProgress(0); setStep(""); setStepLog([]); setResult(null); setErrorMsg(null); setFilter("all"); };

  const exportCsv = async () => {
    if (!result) return;
    const header = ["Linha", "Endereço Original", "Nome Rua Extraído", "Nome Rua Oficial", "Similaridade", "Nuance", "Distância (m)", "Tipo", "Motivo"].join(";");
    const rows = result.detalhes.map((r) =>
      [
        r.linha,
        csvEscape(r.endereco_original),
        csvEscape(r.nome_rua_extraido ?? ""),
        csvEscape(r.nome_rua_oficial ?? ""),
        ((r.similaridade ?? 0) * 100).toFixed(1) + "%",
        r.is_nuance ? "Sim" : "Não",
        Math.round(r.distancia_metros ?? 0),
        csvEscape(r.tipo_endereco ?? ""),
        csvEscape(r.motivo ?? ""),
      ].join(";")
    );
    const csv = [header, ...rows].join("\n");
    const path = `${FileSystem.cacheDirectory}viax-resultado-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar resultado" });
    } else {
      show("Compartilhamento indisponível.", "error");
    }
  };

  const filteredRows = useMemo(() => {
    if (!result) return [] as ProcessResultRow[];
    if (filter === "nuance") return result.detalhes.filter((r) => r.is_nuance);
    if (filter === "ok") return result.detalhes.filter((r) => !r.is_nuance);
    return result.detalhes;
  }, [result, filter]);

  // Tipo distribution for the "tipos de endereço" bar chart
  const tipoStats = useMemo(() => {
    if (!result) return [] as { label: string; value: number; color: string }[];
    const counts = new Map<string, number>();
    for (const r of result.detalhes) {
      const t = r.tipo_endereco || "outro";
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const palette: string[] = [t.accent, t.ok, "#7c3aed", "#1565c0", "#b45309", "#ec4899"];
    return Array.from(counts.entries()).map(([label, value], i) => ({ label, value, color: palette[i % palette.length] ?? t.accent }));
  }, [result, t]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 96 }}>
      <ScreenHeader title="Processar planilha" subtitle="Audite seus endereços de entrega — XLSX ou CSV (máx. 500 linhas, 10MB)" />

      {/* Config warning */}
      {showWarning && (
        <Pressable
          onPress={() => router.push("/(tabs)/configuracoes")}
          style={({ pressed }) => ({
            marginBottom: 12, padding: 12, borderRadius: radii.lg,
            backgroundColor: t.accentDim, borderWidth: 1, borderColor: "rgba(212,82,26,0.3)",
            flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="warning" size={20} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 12, color: t.accent }}>Chave do Google Maps ausente</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.text, marginTop: 2 }}>
              Configure a chave em Configurações ou troque para Padrão Gratuito.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.accent} />
        </Pressable>
      )}

      {/* Instance badge */}
      {settings && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <InstanceBadge mode={settings.instanceMode} />
          <Pill label={`Tolerância: ${settings.toleranceMeters}m`} tone="neutral" />
          <Pill label={settings.parserMode === "ai" ? `IA${settings.aiProvider ? ` (${settings.aiProvider})` : ""}` : "Parser embutido"} tone="neutral" />
        </View>
      )}

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Arquivo" subtitle='A coluna "Destination Address" é obrigatória.' />
        <Pressable onPress={pick} disabled={phase === "running"} style={({ pressed }) => ({
          borderColor: t.borderStrong, borderWidth: 1, borderStyle: "dashed", borderRadius: radii.lg,
          paddingVertical: 28, paddingHorizontal: 18, alignItems: "center", justifyContent: "center",
          backgroundColor: file ? t.surface2 : "transparent", opacity: pressed ? 0.7 : 1, gap: 8,
        })}>
          <Ionicons name={file ? "document-attach" : "cloud-upload-outline"} size={32} color={file ? t.accent : t.textFaint} />
          {file ? (
            <>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: t.text }} numberOfLines={1}>{file.name}</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{formatBytes(file.size)} · toque para trocar</Text>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: t.textMuted }}>Selecionar arquivo</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>XLSX ou CSV · máx. 10MB</Text>
            </>
          )}
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          {phase === "running" ? (
            <Button label="Cancelar" variant="outline" fullWidth onPress={cancel} />
          ) : (
            <Button
              label={phase === "done" ? "Nova análise" : "Iniciar auditoria"}
              variant="primary" fullWidth
              disabled={!file && phase !== "done"}
              onPress={phase === "done" ? reset : start}
            />
          )}
        </View>
      </Card>

      {phase === "running" && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Em andamento" />
            <View style={{ alignItems: "center", paddingVertical: 8, gap: 10 }}>
              <ActivityIndicator color={t.accent} />
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text, textAlign: "center" }} numberOfLines={2}>
                {step || "Processando..."}
              </Text>
              <ProgressBar value={progress} />
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{Math.round(progress * 100)}%</Text>
            </View>
            {stepLog.length > 1 && (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: t.surface2, maxHeight: 110 }}>
                <ScrollView>
                  {stepLog.slice(-8).map((s, i) => (
                    <Text key={i} style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginBottom: 2 }} numberOfLines={1}>
                      {s}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            )}
          </Card>
        </Animated.View>
      )}

      {phase === "error" && errorMsg && (
        <Card style={{ marginBottom: 14, borderColor: t.accent, backgroundColor: t.accentDim }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.accent }}>Erro</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.text, marginTop: 4 }}>{errorMsg}</Text>
            </View>
          </View>
        </Card>
      )}

      {phase === "done" && result && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="Resumo" right={<Pill label="Concluído" tone="ok" />} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <SummaryStat title="Endereços" value={String(result.total_enderecos)} />
              <SummaryStat title="Nuances" value={String(result.total_nuances)} accent={result.total_nuances > 0} />
              <SummaryStat title="Problemas" value={`${result.percentual_problema.toFixed(1)}%`} />
              <SummaryStat title="Geocode" value={`${(result.metricas_tecnicas?.taxa_geocode_sucesso ?? 0).toFixed(1)}%`} />
              <SummaryStat title="Tempo" value={formatMs(result.metricas_tecnicas?.tempo_processamento_ms ?? 0)} />
            </View>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardHeader title="OK vs Nuances" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Donut
                value={result.total_enderecos > 0 ? (result.total_enderecos - result.total_nuances) / result.total_enderecos : 0}
                size={120} stroke={14}
                color={t.ok} trackColor={t.accentDim}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <LegendItem color={t.ok} label="Endereços corretos" value={result.total_enderecos - result.total_nuances} />
                <LegendItem color={t.accent} label="Nuances detectadas" value={result.total_nuances} />
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                  Instância: {result.metricas_tecnicas?.instancia ?? "—"}
                </Text>
              </View>
            </View>
          </Card>

          {tipoStats.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <CardHeader title="Tipos de endereço" subtitle={`${tipoStats.length} categoria(s)`} />
              <BarChartLabeled stats={tipoStats} />
            </Card>
          )}

          <Card padded={false} style={{ marginBottom: 14, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                Detalhes ({filteredRows.length})
              </Text>
              <Pressable onPress={exportCsv} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="download-outline" size={14} color={t.accent} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.accent }}>CSV</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 6, padding: 12 }}>
              {([
                { v: "all" as const, l: `Todos (${result.detalhes.length})` },
                { v: "nuance" as const, l: `Nuances (${result.total_nuances})` },
                { v: "ok" as const, l: `OK (${result.detalhes.length - result.total_nuances})` },
              ]).map((f) => {
                const sel = filter === f.v;
                return (
                  <Pressable key={f.v} onPress={() => { setFilter(f.v); void Haptics.selectionAsync(); }}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: sel ? t.accent : t.borderStrong, backgroundColor: sel ? t.accent : "transparent" }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: sel ? "#fff" : t.textMuted }}>{f.l}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
              {filteredRows.slice(0, 50).map((r) => <RowCard key={`${r.linha}-${r.endereco_original}`} row={r} />)}
              {filteredRows.length > 50 && (
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 8 }}>
                  +{filteredRows.length - 50} linhas no CSV exportado
                </Text>
              )}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function csvEscape(v: string): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[;"\n]/.test(s) ? `"${s}"` : s;
}

function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 6, backgroundColor: t.surface2, borderRadius: 999, width: "100%", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.max(2, Math.min(100, Math.round(value * 100)))}%`, backgroundColor: t.accent, borderRadius: 999 }} />
    </View>
  );
}

function SummaryStat({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 9, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: accent ? t.accent : t.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 13, color: t.text }}>{value}</Text>
    </View>
  );
}

function BarChartLabeled({ stats }: { stats: { label: string; value: number; color: string }[] }) {
  const t = useTheme();
  const max = Math.max(...stats.map((s) => s.value), 1);
  return (
    <View style={{ gap: 8 }}>
      {stats.map((s, i) => (
        <View key={i}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: t.textMuted }} numberOfLines={1}>{s.label}</Text>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.text }}>{s.value}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: t.surface2, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${(s.value / max) * 100}%`, backgroundColor: s.color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function InstanceBadge({ mode }: { mode: string }) {
  const t = useTheme();
  const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    builtin: { label: "Padrão Gratuito", color: t.ok, bg: t.okDim, icon: "globe-outline" },
    geocodebr: { label: "GeocodeR BR", color: "#7c3aed", bg: "rgba(124,58,237,0.12)", icon: "home-outline" },
    googlemaps: { label: "Google Maps", color: "#1565c0", bg: "rgba(21,101,192,0.12)", icon: "location-outline" },
  };
  const it = map[mode] ?? map.builtin!;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: it.bg }}>
      <Ionicons name={it.icon} size={11} color={it.color} />
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 10, color: it.color, letterSpacing: 0.3 }}>{it.label}</Text>
    </View>
  );
}

function RowCard({ row }: { row: ProcessResultRow }) {
  const t = useTheme();
  return (
    <View style={{
      padding: 10, backgroundColor: t.surface2, borderRadius: radii.md,
      borderLeftWidth: 3, borderLeftColor: row.is_nuance ? t.accent : t.ok,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.textFaint }}>Linha {row.linha}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {row.tipo_endereco && <Pill label={row.tipo_endereco} tone="neutral" />}
          <Pill label={row.is_nuance ? "Nuance" : "OK"} tone={row.is_nuance ? "accent" : "ok"} />
        </View>
      </View>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.text }} numberOfLines={2}>{row.endereco_original}</Text>
      {row.nome_rua_oficial && (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textMuted, marginTop: 4 }} numberOfLines={1}>
          ↳ {row.nome_rua_oficial}
          {typeof row.similaridade === "number" && ` · ${(row.similaridade * 100).toFixed(0)}%`}
          {typeof row.distancia_metros === "number" && ` · ${Math.round(row.distancia_metros)}m`}
        </Text>
      )}
      {row.motivo && (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginTop: 4 }}>{row.motivo}</Text>
      )}
    </View>
  );
}
