import React, { useState } from "react";
import { useListAnalyses, useDeleteAnalysis, getListAnalysesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";
import { formatDate, formatPct, formatMs } from "@/lib/utils";

export default function History() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const limit = 10;

  const { data, isLoading } = useListAnalyses(
    { page, limit },
    { query: { queryKey: getListAnalysesQueryKey({ page, limit }) } }
  );

  const deleteMutation = useDeleteAnalysis();

  const handleDelete = (id: number) => {
    if (!confirm("Excluir esta análise?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          showToast("Análise excluída.", "success");
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        },
        onError: () => showToast("Erro ao excluir."),
      }
    );
  };

  const d = data as any;
  const items = d?.items ?? [];
  const total = d?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          Historico de Analises
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          {total > 0 ? `${total} analise${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}` : "Nenhuma analise ainda."}
        </p>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Analises
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "3rem", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 36, height: 36, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.82rem" }}>
            Nenhuma analise encontrada. Processe uma rota para começar.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["#", "Arquivo", "Enderecos", "Nuances", "Geocode", "Similaridade", "Tempo", "Parser", "Status", "Data", ""].map((h) => (
                    <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-strong)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)" }}>{a.id}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.fileName}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{a.totalAddresses}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                        background: a.nuances > 0 ? "var(--accent-dim)" : "var(--ok-dim)",
                        color: a.nuances > 0 ? "var(--accent)" : "var(--ok)",
                      }}>{a.nuances}</span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{a.geocodeSuccess}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{(a.similarityAvg * 100).toFixed(1)}%</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>{formatMs(a.processingTimeMs)}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                        background: "var(--surface-2)", color: "var(--text-faint)",
                      }}>{a.parserMode}</span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                        background: a.status === "done" ? "var(--ok-dim)" : "var(--accent-dim)",
                        color: a.status === "done" ? "var(--ok)" : "var(--accent)",
                      }}>{a.status === "done" ? "Concluido" : a.status}</span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                      {formatDate(a.createdAt)}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: "0.2rem", transition: "color 200ms" }}
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
              Pagina {page} de {totalPages}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "0.4rem 0.85rem", borderRadius: 99, border: "1px solid var(--border-strong)",
                  background: "transparent", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer",
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "0.4rem 0.85rem", borderRadius: 99, border: "1px solid var(--border-strong)",
                  background: "transparent", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer",
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>

      {ToastComponent}
    </Layout>
  );
}
