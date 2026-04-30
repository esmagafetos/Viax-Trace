import React, { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";
import { formatPct, formatMs } from "@/lib/utils";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";

interface ResultRow {
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
}

interface ProcessResult {
  total_enderecos: number;
  total_nuances: number;
  percentual_problema: number;
  detalhes: ResultRow[];
  metricas_tecnicas: {
    tempo_processamento_ms: number;
    taxa_geocode_sucesso: number;
    instancia: string;
  };
}

export default function Process() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "nuance" | "ok">("all");
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const { data: settingsData } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const settings = settingsData as any;
  const instanceMode: string = settings?.instanceMode ?? "builtin";
  const googleMapsApiKey: string = settings?.googleMapsApiKey ?? "";

  const configWarning: { type: "error" | "warn" | "info"; message: string; action?: string } | null = (() => {
    if (instanceMode === "googlemaps" && !googleMapsApiKey) {
      return {
        type: "error",
        message: "Motor Google Maps selecionado, mas nenhuma chave de API foi configurada.",
        action: "Adicione sua chave em Configurações → Instâncias para continuar.",
      };
    }
    if (instanceMode === "geocodebr") {
      return {
        type: "info",
        message: "Motor GeocodeR BR (CNEFE/IBGE) ativo.",
        action: "Certifique-se de que o microserviço R está rodando localmente na porta 8002.",
      };
    }
    return null;
  })();

  const canProcess = !!file && !isProcessing && !(configWarning?.type === "error");

  const addStep = (msg: string) => setSteps((prev) => [...prev.slice(-20), msg]);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      showToast("Formato inválido. Use .xlsx ou .csv");
      return;
    }
    setFile(f);
    setResult(null);
    setSteps([]);
    setProgress(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSteps([]);
    setResult(null);
    setProgress(null);

    const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

    try {
      const formData = new FormData();
      formData.append("arquivo", file);

      const response = await fetch(`${base}/api/process/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "");
        showToast("Erro ao processar arquivo. " + errText);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);

            if (eventType === "job_id" && parsed.job_id) {
              setProgress({ processed: 0, total: parsed.total ?? 0 });
            } else if (eventType === "step" && parsed.step) {
              addStep(parsed.step);
              // Extrai N de "[N/M] ..." para atualizar barra de progresso
              const m = (parsed.step as string).match(/^\[(\d+)\/(\d+)\]/);
              if (m) {
                setProgress({ processed: parseInt(m[1], 10), total: parseInt(m[2], 10) });
              }
            } else if (eventType === "result" && parsed.result) {
              const r = parsed.result as ProcessResult;
              setResult(r);
              setProgress(null);
              addStep("✓ Análise concluída!");
            } else if (eventType === "error" && parsed.error) {
              setProgress(null);
              showToast(parsed.error);
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    } catch (err: any) {
      setProgress(null);
      showToast("Erro de conexão: " + (err.message ?? String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows = result?.detalhes.filter((r) =>
    activeFilter === "all" ? true : activeFilter === "nuance" ? r.is_nuance : !r.is_nuance
  ) ?? [];

  const exportCsv = () => {
    if (!result) return;
    const header = ["#", "Endereço Original", "Rua Extraída", "Rua Oficial", "Similaridade", "Nuance", "Motivo", "POI"];
    const rows = result.detalhes.map((r) => [
      r.linha, r.endereco_original, r.nome_rua_extraido ?? "", r.nome_rua_oficial ?? "",
      r.similaridade !== null ? (r.similaridade * 100).toFixed(1) + "%" : "N/A",
      r.is_nuance ? "Sim" : "Não", r.motivo, r.poi_estruturado ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viax-${file?.name ?? "resultado"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          Processar Rota
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Importe um arquivo XLSX ou CSV com a coluna "Destination Address".
        </p>
      </div>

      {/* Config warning banner */}
      {configWarning && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.75rem",
          padding: "0.9rem 1.1rem", borderRadius: 10, marginBottom: "1rem",
          background: configWarning.type === "error"
            ? "rgba(212,82,26,0.08)"
            : configWarning.type === "warn"
            ? "rgba(234,179,8,0.08)"
            : "rgba(124,58,237,0.07)",
          border: `1px solid ${configWarning.type === "error" ? "rgba(212,82,26,0.3)" : configWarning.type === "warn" ? "rgba(234,179,8,0.3)" : "rgba(124,58,237,0.25)"}`,
        }}>
          {configWarning.type === "error" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          ) : configWarning.type === "warn" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          <div>
            <div style={{
              fontSize: "0.78rem", fontWeight: 600,
              color: configWarning.type === "error" ? "var(--accent)" : configWarning.type === "warn" ? "#ca8a04" : "#7c3aed",
              marginBottom: configWarning.action ? "0.2rem" : 0,
            }}>
              {configWarning.message}
            </div>
            {configWarning.action && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", lineHeight: 1.5 }}>
                {configWarning.action}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        overflow: "hidden", marginBottom: "1.5rem",
      }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Importar Rota
          </span>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "2rem 1.5rem",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.75rem", cursor: "pointer",
            border: `2px dashed ${isDragOver || file ? "var(--accent)" : "transparent"}`,
            borderRadius: 10, margin: "0.75rem",
            background: isDragOver ? "var(--accent-dim)" : "transparent",
            transition: "all 200ms",
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: "var(--accent-dim)", border: "1px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9,15 12,12 15,15"/>
            </svg>
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", textAlign: "center" }}>
            {file ? file.name : "Arraste o arquivo aqui"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textAlign: "center" }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'XLSX ou CSV · coluna "Destination Address" · máx 10MB'}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.55rem 1.25rem", borderRadius: 99,
              background: "var(--accent)", color: "#fff",
              fontSize: "0.8rem", fontWeight: 600, border: "none",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(212,82,26,0.3)",
            }}
          >
            {file ? "Trocar arquivo" : "Selecionar arquivo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div style={{ padding: "0 1rem 1rem" }}>
          <button
            onClick={handleProcess}
            disabled={!canProcess}
            className="btn-full-mobile"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              padding: "0.75rem 1.5rem", borderRadius: 99,
              background: "var(--text)", color: "var(--bg)",
              border: "none", fontSize: "0.85rem", fontWeight: 600,
              cursor: !canProcess ? "not-allowed" : "pointer",
              opacity: !canProcess ? 0.4 : 1,
              transition: "all 200ms",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {isProcessing ? "Processando..." : "Iniciar"}
          </button>
        </div>

        {isProcessing && (
          <div style={{ padding: "1.5rem 1.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Processando arquivo...</div>

            {/* Barra de progresso — aparece assim que job_id é recebido */}
            {progress && progress.total > 0 && (
              <div style={{ width: "100%", maxWidth: 420 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", fontWeight: 500 }}>Endereços processados</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--border-strong)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: "var(--accent)",
                    width: `${Math.round((progress.processed / progress.total) * 100)}%`,
                    transition: "width 0.35s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </div>
                <div style={{ textAlign: "right", marginTop: "0.25rem", fontSize: "0.68rem", color: "var(--text-faint)" }}>
                  {Math.round((progress.processed / progress.total) * 100)}%
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%", maxWidth: 420 }}>
              {steps.map((step, i) => (
                <div key={i} className="animate-step-in" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.72rem", color: "var(--text-faint)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} className="animate-pulse-dot" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="animate-fade-up">
          {/* Summary stats */}
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { value: result.total_enderecos, label: "Total", accent: false, good: false },
              { value: result.total_nuances, label: "Nuances", accent: true, good: false },
              { value: result.total_enderecos - result.total_nuances, label: "OK", accent: false, good: true },
              { value: `${result.percentual_problema}%`, label: "Taxa Nuance", accent: result.percentual_problema > 20, good: result.percentual_problema <= 20 },
              { value: `${result.metricas_tecnicas.taxa_geocode_sucesso}%`, label: "Geocode OK", accent: false, good: true },
              { value: formatMs(result.metricas_tecnicas.tempo_processamento_ms), label: "Tempo", accent: false, good: false },
            ].map(({ value, label, accent, good }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, padding: "1rem 0.9rem 0.8rem",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--border)" }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "0.3rem", color: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--text)" }}>{value}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Instance badge */}
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 500 }}>Processado via</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}>
              {result.metricas_tecnicas.instancia}
            </span>
          </div>

          {/* ── Analytics chart ── */}
          {(() => {
            const total = result.total_enderecos;
            const nuances = result.total_nuances;
            const ok = total - nuances;
            const pctNuance = total > 0 ? (nuances / total) * 100 : 0;
            const pctOk = 100 - pctNuance;

            // tipo_endereco breakdown
            const tipoMap: Record<string, { label: string; color: string }> = {
              rodovia:       { label: "Rodovias",       color: "#f97316" },
              comercio:      { label: "Comércios",      color: "#a855f7" },
              via_secundaria:{ label: "Via Secundária", color: "#3b82f6" },
              avenida_extensa:{ label: "Av. Extensas",  color: "#eab308" },
              residencial:   { label: "Residencial",    color: "#22c55e" },
            };
            const tipoCounts: Record<string, number> = {};
            for (const row of result.detalhes) {
              const t = row.tipo_endereco || "residencial";
              tipoCounts[t] = (tipoCounts[t] || 0) + 1;
            }

            // SVG donut
            const R = 42, cx = 56, cy = 56, stroke = 14;
            const circ = 2 * Math.PI * R;
            const nuanceDash = (pctNuance / 100) * circ;
            const okDash = (pctOk / 100) * circ;

            return (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, marginBottom: "1.5rem", overflow: "hidden",
              }}>
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Análise Visual da Rota
                  </span>
                </div>
                <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexWrap: "wrap", gap: "2.5rem", alignItems: "flex-start" }}>

                  {/* Donut - Nuances vs OK */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", minWidth: 130 }}>
                    <svg width={112} height={112} viewBox="0 0 112 112">
                      {/* OK segment */}
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ok)" strokeWidth={stroke}
                        strokeDasharray={`${okDash} ${circ}`}
                        strokeDashoffset={0}
                        transform={`rotate(-90 ${cx} ${cy})`} />
                      {/* Nuance segment */}
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--accent)" strokeWidth={stroke}
                        strokeDasharray={`${nuanceDash} ${circ}`}
                        strokeDashoffset={-okDash}
                        transform={`rotate(-90 ${cx} ${cy})`} />
                      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={16} fontWeight={800} fill="var(--text)">{Math.round(pctNuance)}%</text>
                      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="var(--text-faint)">Nuances</text>
                    </svg>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)", flexShrink: 0 }} />
                        Nuances ({nuances})
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--ok)", flexShrink: 0 }} />
                        OK ({ok})
                      </div>
                    </div>
                  </div>

                  {/* Bar chart - tipos */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
                      Distribuição por Tipo
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {Object.entries(tipoMap).map(([tipo, { label, color }]) => {
                        const count = tipoCounts[tipo] || 0;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={tipo}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                              <span style={{ fontSize: "0.73rem", color: "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>
                                {count} <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span>
                              </span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "var(--border-strong)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 99,
                                width: `${pct}%`,
                                background: color,
                                transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Nuance por tipo */}
                    <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                        Nuances por Tipo
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {Object.entries(tipoMap).map(([tipo, { label, color }]) => {
                          const count = result.detalhes.filter(r => (r.tipo_endereco || "residencial") === tipo && r.is_nuance).length;
                          if (count === 0) return null;
                          return (
                            <div key={tipo} style={{
                              display: "inline-flex", alignItems: "center", gap: "0.4rem",
                              padding: "0.25rem 0.65rem", borderRadius: 99,
                              background: `${color}18`, border: `1px solid ${color}44`,
                              fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500,
                            }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                              {label}: {count}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Results table */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Detalhes</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {(["all", "nuance", "ok"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      style={{
                        padding: "0.3rem 0.7rem", borderRadius: 99,
                        border: `1px solid ${activeFilter === f ? "var(--accent)" : "var(--border)"}`,
                        background: activeFilter === f ? "var(--accent-dim)" : "transparent",
                        color: activeFilter === f ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "0.72rem", cursor: "pointer",
                      }}
                    >
                      {f === "all" ? "Todos" : f === "nuance" ? "Nuances" : "OK"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={exportCsv}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.4rem 0.9rem", borderRadius: 99,
                    border: "1px solid var(--border-strong)",
                    background: "transparent", color: "var(--text-muted)",
                    fontSize: "0.75rem", cursor: "pointer",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Exportar CSV
                </button>
              </div>
            </div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    {["#", "Endereço Original", "Rua Extraída", "Rua Oficial", "Similaridade", "Status", "Motivo"].map((h) => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-strong)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.linha}>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)" }}>{row.linha}</td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", maxWidth: 220 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }} title={row.endereco_original}>{row.endereco_original}</span>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.nome_rua_extraido ?? <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>não extraída</span>}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.nome_rua_oficial ?? <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>não encontrada</span>}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        {row.similaridade !== null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <div style={{ height: 4, width: 60, borderRadius: 2, background: "var(--border-strong)", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 2, width: `${row.similaridade * 100}%`, background: row.similaridade < 0.8 ? "var(--accent)" : "var(--ok)", transition: "width 0.6s ease" }} />
                            </div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", minWidth: 32 }}>{(row.similaridade * 100).toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                          background: row.is_nuance ? "var(--accent-dim)" : "var(--ok-dim)",
                          color: row.is_nuance ? "var(--accent)" : "var(--ok)",
                        }}>
                          {row.is_nuance ? "Nuance" : "OK"}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", fontSize: "0.72rem", color: "var(--text-faint)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.motivo}>
                        {row.motivo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.82rem" }}>
                  Nenhum registro para este filtro.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </Layout>
  );
}
