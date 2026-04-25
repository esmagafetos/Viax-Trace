import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScreenHeader from "@/components/ScreenHeader";
import { streamSSE } from "@/lib/sse";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { formatBytes, formatMs } from "@/lib/format";
import type { Condominium, CondoResult, CondoResultRow } from "@/lib/types";

type Picked = { uri: string; name: string; size: number };
type Phase = "idle" | "ready" | "running" | "done" | "error";
type FilterMode = "all" | "ordenada" | "sem_condominio" | "nuance";

export default function FerramentaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const [condos, setCondos] = useState<Condominium[]>([]);
  const [loadingCondos, setLoadingCondos] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [stepLog, setStepLog] = useState<string[]>([]);
  const [result, setResult] = useState<CondoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const cancelRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ condominios: Condominium[] }>("/condominium/list");
        setCondos(r.condominios ?? []);
      } catch (e: any) {
        show(e?.message ?? "Falha ao carregar condomínios.", "error");
      } finally {
        setLoadingCondos(false);
      }
    })();
  }, [show]);

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
      if (ext !== "xlsx" && ext !== "csv") { show("Use .xlsx ou .csv.", "error"); return; }
      if ((a.size ?? 0) > 10 * 1024 * 1024) { show("Acima de 10MB.", "error"); return; }
      setFile({ uri: a.uri, name: a.name ?? "arquivo", size: a.size ?? 0 });
      setResult(null); setErrorMsg(null); setStep(""); setStepLog([]); setProgress(0);
      setPhase(selected ? "ready" : "idle");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      show(e?.message ?? "Falha ao selecionar arquivo.", "error");
    }
  };

  const choose = (id: string) => {
    setSelected(id);
    setPhase(file ? "ready" : "idle");
    void Haptics.selectionAsync();
  };

  const start = () => {
    if (!file || !selected) return;
    setPhase("running"); setProgress(0); setStep("Enviando arquivo..."); setStepLog([]); setResult(null); setErrorMsg(null);
    cancelRef.current = streamSSE({
      path: "/condominium/process",
      fileUri: file.uri,
      fileName: file.name,
      fields: { condominioId: selected },
      handlers: {
        onStep: (d) => {
          setStep(d.step);
          setStepLog((prev) => [...prev.slice(-40), d.step]);
          if (typeof d.progress === "number") setProgress(d.progress);
        },
        onResult: (d) => {
          const payload: CondoResult = (d?.result ?? d) as CondoResult;
          setResult(payload);
          setProgress(1);
          setPhase("done");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          show("Rota gerada!", "success");
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

  const cancel = () => { cancelRef.current?.cancel(); setPhase(file && selected ? "ready" : "idle"); };
  const reset = () => { setFile(null); setResult(null); setErrorMsg(null); setPhase("idle"); setStep(""); setStepLog([]); setProgress(0); setFilter("all"); };

  const exportCsv = async () => {
    if (!result) return;
    const header = ["Ordem", "Linha", "Endereço Original", "Quadra", "Lote", "Classificação", "Instrução", "Motivo"].join(";");
    const rows = result.detalhes.map((r) => [
      r.ordem ?? "",
      r.linha,
      csvEscape(r.enderecoOriginal),
      r.quadra ?? "",
      r.lote ?? "",
      csvEscape(r.classificacao),
      csvEscape(r.instrucao ?? ""),
      csvEscape(r.motivo ?? ""),
    ].join(";"));
    const csv = [header, ...rows].join("\n");
    const path = `${FileSystem.cacheDirectory}viax-rota-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar rota" });
    }
  };

  const filteredRows = useMemo<CondoResultRow[]>(() => {
    if (!result) return [];
    if (filter === "ordenada") return result.detalhes.filter((r) => r.classificacao === "ordenada");
    if (filter === "sem_condominio") return result.detalhes.filter((r) => r.classificacao === "encontrada_sem_condominio");
    if (filter === "nuance") return result.detalhes.filter((r) => r.classificacao === "nuance");
    return result.detalhes;
  }, [result, filter]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 96 }}>
      <ScreenHeader title="Ferramenta de rotas" subtitle="Otimize entregas em condomínios suportados" />

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Condomínio" subtitle="Selecione o destino" />
        {loadingCondos ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}><ActivityIndicator color={t.accent} /></View>
        ) : condos.length === 0 ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, textAlign: "center", paddingVertical: 12 }}>
            Nenhum condomínio disponível.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {condos.map((c) => {
              const isSel = selected === c.id;
              const dev = c.status !== "ativo";
              return (
                <Pressable
                  key={c.id}
                  disabled={dev}
                  onPress={() => choose(c.id)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: isSel ? t.accent : t.borderStrong,
                    backgroundColor: isSel ? t.accentDim : t.surface2,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    opacity: dev ? 0.55 : pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: isSel ? t.accent : t.surface, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="business" size={18} color={isSel ? "#fff" : t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }}>{c.nome}</Text>
                    <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 1 }}>
                      {c.totalLotes ? `${c.totalLotes} lotes` : "—"}
                    </Text>
                  </View>
                  <Pill label={dev ? "Em breve" : "Ativo"} tone={dev ? "neutral" : "ok"} />
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Planilha" subtitle='Coluna "Destination Address" obrigatória' />
        <Pressable onPress={pick} disabled={phase === "running"} style={({ pressed }) => ({
          borderColor: t.borderStrong, borderWidth: 1, borderStyle: "dashed", borderRadius: radii.lg,
          paddingVertical: 24, paddingHorizontal: 18, alignItems: "center", justifyContent: "center",
          backgroundColor: file ? t.surface2 : "transparent", opacity: pressed ? 0.7 : 1, gap: 8,
        })}>
          <Ionicons name={file ? "document-attach" : "document-outline"} size={28} color={file ? t.accent : t.textFaint} />
          {file ? (
            <>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: t.text }} numberOfLines={1}>{file.name}</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{formatBytes(file.size)}</Text>
            </>
          ) : (
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.textMuted }}>Selecionar arquivo</Text>
          )}
        </Pressable>

        <View style={{ marginTop: 14 }}>
          {phase === "running" ? (
            <Button label="Cancelar" variant="outline" fullWidth onPress={cancel} />
          ) : (
            <Button label={phase === "done" ? "Nova rota" : "Gerar rota"} variant="primary" fullWidth disabled={(!file || !selected) && phase !== "done"} onPress={phase === "done" ? reset : start} />
          )}
        </View>
      </Card>

      {phase === "running" && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ alignItems: "center", paddingVertical: 8, gap: 10 }}>
              <ActivityIndicator color={t.accent} />
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.text, textAlign: "center" }} numberOfLines={2}>{step || "Processando..."}</Text>
              <View style={{ height: 6, backgroundColor: t.surface2, borderRadius: 999, width: "100%", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.max(2, Math.min(100, Math.round(progress * 100)))}%`, backgroundColor: t.accent }} />
              </View>
            </View>
            {stepLog.length > 1 && (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: t.surface2, maxHeight: 100 }}>
                <ScrollView>
                  {stepLog.slice(-6).map((s, i) => (
                    <Text key={i} style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginBottom: 2 }} numberOfLines={1}>{s}</Text>
                  ))}
                </ScrollView>
              </View>
            )}
          </Card>
        </Animated.View>
      )}

      {phase === "error" && errorMsg && (
        <Card style={{ marginBottom: 14, borderColor: t.accent, backgroundColor: t.accentDim }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
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
            <CardHeader title={`Rota — ${result.condominio?.nome ?? ""}`} right={<Pill label="Concluído" tone="ok" />} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ColorStat label="Total" value={result.totalLinhas} color={t.text} bg={t.surface2} />
              <ColorStat label="Ordenadas" value={result.totalOrdenadas} color={t.ok} bg={t.okDim} />
              <ColorStat label="Sem Condomínio" value={result.totalSemCondominio} color="#1565c0" bg="rgba(21,101,192,0.12)" />
              <ColorStat label="Nuances" value={result.totalNuances} color={t.accent} bg={t.accentDim} />
            </View>
            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>
                Tempo: {formatMs(result.metricas?.tempo_ms ?? 0)}
              </Text>
              <Pressable onPress={exportCsv} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="download-outline" size={14} color={t.accent} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.accent }}>Exportar CSV</Text>
              </Pressable>
            </View>
          </Card>

          <Card padded={false} style={{ marginBottom: 14, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                Sequência ({filteredRows.length})
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 12 }}>
              {([
                { v: "all" as const, l: `Todos (${result.detalhes.length})` },
                { v: "ordenada" as const, l: `Ordenadas (${result.totalOrdenadas})` },
                { v: "sem_condominio" as const, l: `S/Cond. (${result.totalSemCondominio})` },
                { v: "nuance" as const, l: `Nuances (${result.totalNuances})` },
              ]).map((f) => {
                const sel = filter === f.v;
                return (
                  <Pressable key={f.v} onPress={() => { setFilter(f.v); void Haptics.selectionAsync(); }}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: sel ? t.accent : t.borderStrong, backgroundColor: sel ? t.accent : "transparent" }}>
                    <Text numberOfLines={1} style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: sel ? "#fff" : t.textMuted }}>{f.l}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
              {filteredRows.slice(0, 60).map((r) => <RouteRow key={`${r.linha}`} row={r} />)}
              {filteredRows.length > 60 && (
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 8 }}>
                  +{filteredRows.length - 60} linhas no CSV exportado
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
  const s = String(v ?? "").replace(/"/g, '""');
  return /[;"\n]/.test(s) ? `"${s}"` : s;
}

function ColorStat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  const t = useTheme();
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, padding: 12, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: t.border }}>
      <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 22, color, lineHeight: 24, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 9, color: t.textFaint, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function RouteRow({ row }: { row: CondoResultRow }) {
  const t = useTheme();
  const map = {
    ordenada: { color: t.ok, bg: t.okDim, label: "Ordenada" },
    encontrada_sem_condominio: { color: "#1565c0", bg: "rgba(21,101,192,0.12)", label: "Sem condomínio" },
    nuance: { color: t.accent, bg: t.accentDim, label: "Nuance" },
  } as Record<string, { color: string; bg: string; label: string }>;
  const m = map[row.classificacao] ?? { color: t.textMuted, bg: t.surface2, label: row.classificacao };

  return (
    <View style={{ padding: 10, backgroundColor: t.surface2, borderRadius: radii.md, borderLeftWidth: 3, borderLeftColor: m.color }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {row.ordem != null && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 12, color: "#fff" }}>{row.ordem}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: t.textFaint }}>L{row.linha}</Text>
            {row.quadra && <Pill label={`Q${row.quadra}`} tone="neutral" />}
            {row.lote && <Pill label={`L${row.lote}`} tone="neutral" />}
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: m.bg }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 9, color: m.color, letterSpacing: 0.4 }}>{m.label.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.text }} numberOfLines={2}>{row.enderecoOriginal}</Text>
      {row.instrucao && (
        <View style={{ marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: t.surface, borderLeftWidth: 2, borderLeftColor: t.accent }}>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textMuted, fontStyle: "italic", lineHeight: 15 }}>
            ↳ {row.instrucao}
          </Text>
        </View>
      )}
      {row.motivo && !row.instrucao && (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 10, color: t.textFaint, marginTop: 4 }}>{row.motivo}</Text>
      )}
    </View>
  );
}
