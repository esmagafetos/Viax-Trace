import React, { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";

interface CondoSummary {
  id: string;
  nome: string;
  status: "ativo" | "em_desenvolvimento";
  totalLotes?: number;
}

interface DeliveryRow {
  linha: number;
  enderecoOriginal: string;
  quadra: number | null;
  lote: number | null;
  classificacao: "ordenada" | "encontrada_sem_condominio" | "nuance";
  motivo: string;
  ordem?: number;
  instrucao?: string;
}

interface RouteResult {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  detalhes: DeliveryRow[];
  metricas: { tempo_ms: number };
}

type Filter = "all" | "ordenada" | "encontrada_sem_condominio" | "nuance";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Todos",
  ordenada: "Ordenadas",
  encontrada_sem_condominio: "Sem condomínio",
  nuance: "Nuances",
};

const CLASS_COLOR: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "var(--ok)",
  encontrada_sem_condominio: "#7c3aed",
  nuance: "var(--accent)",
};

const CLASS_LABEL: Record<DeliveryRow["classificacao"], string> = {
  ordenada: "Ordenada",
  encontrada_sem_condominio: "Sem condomínio",
  nuance: "Nuance",
};

export default function Tool() {
  const [condos, setCondos] = useState<CondoSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("bougainville-iii");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    fetch(`${base}/api/condominium/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCondos(d.condominios ?? []))
      .catch(() => setCondos([]));
  }, [base]);

  const selected = condos.find((c) => c.id === selectedId);
  const canProcess = !!file && !isProcessing && selected?.status === "ativo";

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file || !selected) return;
    if (selected.status !== "ativo") {
      showToast("Este condomínio ainda está em desenvolvimento.");
      return;
    }
    setIsProcessing(true);
    setSteps([]);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("condominioId", selected.id);
      const response = await fetch(`${base}/api/condominium/process`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!response.ok || !response.body) {
        showToast("Erro ao processar arquivo.");
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
            if (eventType === "step" && parsed.step) addStep(parsed.step);
            else if (eventType === "result" && parsed.result) {
              setResult(parsed.result);
              addStep("✓ Sequência logística pronta!");
            } else if (eventType === "error" && parsed.error) {
              showToast(parsed.error);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      showToast("Erro de conexão: " + (err.message ?? String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows = result?.detalhes.filter((r) =>
    activeFilter === "all" ? true : r.classificacao === activeFilter
  ) ?? [];

  const exportCsv = () => {
    if (!result) return;
    const header = ["Ordem", "Linha", "Quadra", "Lote", "Classificação", "Endereço", "Instrução", "Motivo"];
    const rows = result.detalhes.map((r) => [
      r.ordem ?? "", r.linha, r.quadra ?? "", r.lote ?? "",
      CLASS_LABEL[r.classificacao], r.enderecoOriginal,
      r.instrucao ?? "", r.motivo,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viax-${result.condominio.id}-${file?.name ?? "rota"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          Ferramenta de Condomínios
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Rastreamento interno de entregas em condomínios fechados — Nova Califórnia (Tamoios).
        </p>
      </div>

      {/* Selector */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        overflow: "hidden", marginBottom: "1.25rem",
      }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Selecionar Condomínio
          </span>
        </div>
        <div style={{
          padding: "1rem", display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.6rem",
        }}>
          {condos.map((c) => {
            const isActive = c.id === selectedId;
            const isAvail = c.status === "ativo";
            return (
              <button
                key={c.id}
                onClick={() => isAvail && setSelectedId(c.id)}
                disabled={!isAvail}
                style={{
                  textAlign: "left", padding: "0.75rem 0.85rem",
                  borderRadius: 10,
                  border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border-strong)"}`,
                  background: isActive ? "var(--accent-dim)" : "var(--surface-2)",
                  cursor: isAvail ? "pointer" : "not-allowed",
                  opacity: isAvail ? 1 : 0.6,
                  transition: "all 0.2s",
                  display: "flex", flexDirection: "column", gap: "0.3rem",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                  {c.nome}
                </div>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: isAvail ? "var(--ok)" : "var(--text-faint)",
                }}>
                  {isAvail ? `Disponível${c.totalLotes ? ` · ${c.totalLotes} lotes` : ""}` : "Em desenvolvimento"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        overflow: "hidden", marginBottom: "1.5rem",
      }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Importar Rota — {selected?.nome ?? "—"}
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
            {file ? file.name : "Arraste a planilha aqui"}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
            {isProcessing ? "Processando..." : "Gerar sequência logística"}
          </button>
        </div>

        {isProcessing && (
          <div style={{ padding: "1.5rem 1.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Processando arquivo...</div>
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
          {/* Stats */}
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { value: result.totalLinhas, label: "Total", color: "var(--text)" },
              { value: result.totalOrdenadas, label: "Ordenadas", color: "var(--ok)" },
              { value: result.totalSemCondominio, label: "Sem condomínio", color: "#7c3aed" },
              { value: result.totalNuances, label: "Nuances", color: "var(--accent)" },
            ].map(({ value, label, color }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border-strong)",
                borderRadius: 14, padding: "1rem 0.9rem 0.8rem",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: color }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "0.3rem", color }}>{value}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Filters + Export */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => {
                const isActive = activeFilter === f;
                const count = f === "all" ? result.detalhes.length :
                  result.detalhes.filter((r) => r.classificacao === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: "0.4rem 0.85rem", borderRadius: 99,
                      fontSize: "0.75rem", fontWeight: 600,
                      background: isActive ? "var(--accent)" : "var(--surface-2)",
                      color: isActive ? "#fff" : "var(--text-muted)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border-strong)"}`,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {FILTER_LABEL[f]} <span style={{ opacity: 0.7 }}>({count})</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={exportCsv}
              style={{
                padding: "0.45rem 0.9rem", borderRadius: 99,
                fontSize: "0.75rem", fontWeight: 600,
                background: "var(--surface-2)", color: "var(--text)",
                border: "1px solid var(--border-strong)", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Exportar CSV
            </button>
          </div>

          {/* Sequence list */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Sequência de Entregas — {result.condominio.nome}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredRows.length === 0 && (
                <div style={{ padding: "2rem 1.5rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.8rem" }}>
                  Nenhum item para este filtro.
                </div>
              )}
              {filteredRows.map((r, idx) => (
                <div key={`${r.linha}-${idx}`} style={{
                  padding: "0.9rem 1.25rem",
                  borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                  display: "flex", gap: "0.9rem", alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${CLASS_COLOR[r.classificacao]}18`,
                    color: CLASS_COLOR[r.classificacao],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "0.8rem",
                  }}>
                    {r.ordem ?? "—"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                        {r.quadra !== null ? `Quadra ${r.quadra}` : "Quadra ?"} {r.lote !== null ? `· Lote ${r.lote}` : ""}
                      </span>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                        padding: "0.15rem 0.55rem", borderRadius: 99,
                        background: `${CLASS_COLOR[r.classificacao]}18`,
                        color: CLASS_COLOR[r.classificacao],
                      }}>
                        {CLASS_LABEL[r.classificacao]}
                      </span>
                    </div>
                    {r.instrucao && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem", lineHeight: 1.5 }}>
                        ➜ {r.instrucao}
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginBottom: "0.15rem", wordBreak: "break-word" }}>
                      {r.enderecoOriginal}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", fontStyle: "italic" }}>
                      {r.motivo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ToastComponent />
    </Layout>
  );
}
