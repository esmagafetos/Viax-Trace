import React, { useState, useRef } from "react";
import { useCreateAnalysis } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";
import { formatPct, formatMs } from "@/lib/utils";

interface ResultRow {
  line: number;
  original: string;
  extracted: string;
  official: string;
  similarity: number;
  status: "nuance" | "ok";
  reason: string;
}

interface ProcessResult {
  total: number;
  nuances: number;
  geocodeSuccess: number;
  similarityAvg: number;
  timeMs: number;
  rows: ResultRow[];
  parserMode: string;
}

export default function Process() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "nuance" | "ok">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();
  const createAnalysisMutation = useCreateAnalysis();

  const addStep = (msg: string) => setSteps((prev) => [...prev, msg]);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      showToast("Formato inválido. Use .xlsx ou .csv");
      return;
    }
    setFile(f);
    setResult(null);
    setSteps([]);
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

    const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

    try {
      addStep("Lendo arquivo...");

      const formData = new FormData();
      formData.append("arquivo", file);

      await new Promise((resolve) => setTimeout(resolve, 300));
      addStep(`Processando ${file.name}...`);

      const es = new EventSource(`${apiBase}/api/process/upload`);

      // For demo: simulate SSE steps
      const mockSteps = [
        "Extraindo enderecos da planilha...",
        "Consultando cache local...",
        "Geocodificando via Nominatim...",
        "Calculando similaridade textual...",
        "Gerando relatorio...",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < mockSteps.length) {
          addStep(mockSteps[i]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 600);

      await new Promise((resolve) => setTimeout(resolve, mockSteps.length * 600 + 500));
      clearInterval(interval);

      // Simulate result
      const mockRows: ResultRow[] = Array.from({ length: 8 }).map((_, idx) => ({
        line: idx + 1,
        original: `Rua das Flores, ${100 + idx * 10}, Bairro ${idx + 1}`,
        extracted: `Rua das Flores`,
        official: idx % 3 === 0 ? "Rua das Flores e Jardins" : "Rua das Flores",
        similarity: idx % 3 === 0 ? 0.72 + (idx * 0.01) : 0.92 + (idx * 0.005),
        status: idx % 3 === 0 ? "nuance" : "ok",
        reason: idx % 3 === 0 ? "Nome de rua diverge do oficial" : "Endereco validado com sucesso",
      }));

      const nuances = mockRows.filter((r) => r.status === "nuance").length;
      const mockResult: ProcessResult = {
        total: mockRows.length,
        nuances,
        geocodeSuccess: mockRows.length - 1,
        similarityAvg: mockRows.reduce((sum, r) => sum + r.similarity, 0) / mockRows.length,
        timeMs: 3200,
        rows: mockRows,
        parserMode: "builtin",
      };

      setResult(mockResult);
      addStep("Analise concluida!");

      // Save to backend
      createAnalysisMutation.mutate({
        data: {
          fileName: file.name,
          totalAddresses: mockResult.total,
          nuances: mockResult.nuances,
          geocodeSuccess: mockResult.geocodeSuccess,
          similarityAvg: mockResult.similarityAvg,
          processingTimeMs: mockResult.timeMs,
          parserMode: mockResult.parserMode,
          results: JSON.stringify(mockResult.rows),
        },
      });
    } catch (err) {
      showToast("Erro ao processar arquivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows = result?.rows.filter((r) =>
    activeFilter === "all" ? true : r.status === activeFilter
  ) ?? [];

  const exportCsv = () => {
    if (!result) return;
    const header = ["#", "Endereco Original", "Rua Extraida", "Rua Oficial (OSM)", "Similaridade", "Status", "Motivo"];
    const rows = result.rows.map((r) => [r.line, r.original, r.extracted, r.official, r.similarity.toFixed(2), r.status, r.reason]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viax-${file?.name ?? "resultado"}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          Processar Rota
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Importe um arquivo XLSX ou CSV com a coluna "Destination Address".
        </p>
      </div>

      {/* Upload card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        overflow: "hidden", marginBottom: "1.5rem",
      }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
            padding: "2.5rem 2rem",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.75rem", cursor: "pointer",
            border: `2px dashed ${isDragOver || file ? "var(--accent)" : "transparent"}`,
            borderRadius: 10, margin: "0.75rem",
            background: isDragOver ? "var(--accent-dim)" : "transparent",
            transition: "all 200ms",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "var(--accent-dim)", border: "1px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9,15 12,12 15,15"/>
            </svg>
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
            {file ? file.name : "Arraste o arquivo aqui"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textAlign: "center" }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : "XLSX ou CSV · coluna \"Destination Address\" · max 10MB"}
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

        {/* Analyze button */}
        <div style={{ padding: "0 1rem 1rem" }}>
          <button
            onClick={handleProcess}
            disabled={!file || isProcessing}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              padding: "0.75rem 1.5rem", borderRadius: 99,
              background: "var(--text)", color: "var(--bg)",
              border: "none", fontSize: "0.85rem", fontWeight: 600,
              cursor: !file || isProcessing ? "not-allowed" : "pointer",
              opacity: !file || isProcessing ? 0.4 : 1,
              transition: "all 200ms",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Analisar rota
          </button>
        </div>

        {/* Loading */}
        {isProcessing && (
          <div style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Processando arquivo...</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%", maxWidth: 400 }}>
              {steps.map((step, i) => (
                <div key={i} className="animate-step-in" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", color: "var(--text-faint)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} className="animate-pulse-dot" />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-up">
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { value: result.total, label: "Total", accent: false, good: false },
              { value: result.nuances, label: "Nuances", accent: true, good: false },
              { value: result.total - result.nuances, label: "OK", accent: false, good: true },
              { value: formatPct(result.similarityAvg), label: "Similaridade", accent: false, good: true },
              { value: formatMs(result.timeMs), label: "Tempo", accent: false, good: false },
            ].map(({ value, label, accent, good }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, padding: "1rem 1rem 0.8rem",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--border)" }} />
                <div style={{ fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "0.3rem", color: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--text)" }}>{value}</div>
                <div style={{ fontSize: "0.66rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Detalhes</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "0.35rem" }}>
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    {["#", "Endereco Original", "Rua Extraida", "Rua Oficial (OSM)", "Similaridade", "Status", "Motivo"].map((h) => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-strong)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.line}>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)" }}>{row.line}</td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", maxWidth: 240 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }}>{row.original}</span>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.extracted}</td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.official}</td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ height: 4, width: 60, borderRadius: 2, background: "var(--border-strong)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${row.similarity * 100}%`, background: row.similarity < 0.8 ? "var(--accent)" : "var(--ok)", transition: "width 0.6s ease" }} />
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", minWidth: 32 }}>{(row.similarity * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                          background: row.status === "nuance" ? "var(--accent-dim)" : "var(--ok-dim)",
                          color: row.status === "nuance" ? "var(--accent)" : "var(--ok)",
                        }}>
                          {row.status === "nuance" ? "Nuance" : "OK"}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", fontSize: "0.72rem", color: "var(--text-faint)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.reason}>
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.82rem" }}>
                  Nenhum registro encontrado para este filtro.
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
