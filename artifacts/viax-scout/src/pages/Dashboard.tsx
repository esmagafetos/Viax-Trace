import React from "react";
import { Link } from "wouter";
import { useGetDashboardSummary, useGetRecentAnalyses } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { formatDate, formatPct } from "@/lib/utils";

function StatTile({ value, label, accent, good }: { value: string | number; label: string; accent?: boolean; good?: boolean }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border-strong)",
      borderRadius: 14, padding: "1.1rem 1.1rem 0.9rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      position: "relative", overflow: "hidden",
      transition: "transform 200ms, box-shadow 200ms",
    }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--border)",
      }} />
      <div style={{
        fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1,
        marginBottom: "0.3rem",
        color: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--text)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "0.66rem", color: "var(--text-faint)", letterSpacing: "0.05em", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: recent, isLoading: recLoading } = useGetRecentAnalyses();

  const s = summary as any;
  const r = (recent as any[]) ?? [];

  return (
    <Layout>
      {/* Welcome */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          Bem-vindo, {user?.name?.split(" ")[0] ?? "usuario"}.
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Aqui esta o resumo das suas analises de rotas.
        </p>
      </div>

      {/* Stats */}
      {sumLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div style={{ width: 36, height: 36, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
        </div>
      ) : s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
          <StatTile value={s.totalAnalyses} label="Total de Analises" />
          <StatTile value={s.totalAddressesProcessed.toLocaleString("pt-BR")} label="Enderecos Processados" good />
          <StatTile value={formatPct(s.avgNuanceRate / Math.max(s.totalAddressesProcessed, 1) || 0)} label="Taxa de Nuances" accent />
          <StatTile value={formatPct(s.avgSimilarity || 0)} label="Similaridade Media" good />
          <StatTile value={s.analysesThisMonth} label="Analises este Mes" />
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <Link href="/process">
          <button style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.65rem 1.5rem", borderRadius: 99,
            background: "var(--accent)", color: "#fff",
            border: "none", fontSize: "0.82rem", fontWeight: 600,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(212,82,26,0.3)",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,12 15,15"/></svg>
            Nova Analise
          </button>
        </Link>
        <Link href="/history">
          <button style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.65rem 1.25rem", borderRadius: 99,
            background: "transparent", color: "var(--text-muted)",
            border: "1px solid var(--border-strong)", fontSize: "0.82rem", fontWeight: 500,
            cursor: "pointer",
          }}>
            Ver Historico Completo
          </button>
        </Link>
      </div>

      {/* Recent analyses */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Analises Recentes
          </span>
          <Link href="/history">
            <span style={{ fontSize: "0.72rem", color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Ver todas</span>
          </Link>
        </div>

        {recLoading ? (
          <div style={{ padding: "3rem", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
          </div>
        ) : r.length === 0 ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.82rem" }}>
            Nenhuma analise ainda.{" "}
            <Link href="/process">
              <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>Processar primeira rota</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Arquivo", "Enderecos", "Nuances", "Status", "Data"].map((h) => (
                    <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-strong)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.map((a: any) => (
                  <tr key={a.id} style={{ transition: "background 200ms" }}>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.fileName}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{a.totalAddresses}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.3rem",
                        padding: "0.2rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 500,
                        background: a.nuances > 0 ? "var(--accent-dim)" : "var(--ok-dim)",
                        color: a.nuances > 0 ? "var(--accent)" : "var(--ok)",
                      }}>
                        {a.nuances}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", padding: "0.2rem 0.55rem", borderRadius: 99,
                        fontSize: "0.68rem", fontWeight: 500,
                        background: a.status === "done" ? "var(--ok-dim)" : "var(--accent-dim)",
                        color: a.status === "done" ? "var(--ok)" : "var(--accent)",
                      }}>
                        {a.status === "done" ? "Concluido" : a.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
