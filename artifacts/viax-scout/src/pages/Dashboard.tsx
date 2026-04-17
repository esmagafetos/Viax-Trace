import React, { useState } from "react";
import { Link } from "wouter";
import {
  useGetDashboardSummary,
  useGetRecentAnalyses,
  useGetDashboardFinancial,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { formatDate, formatPct } from "@/lib/utils";

function StatTile({ value, label, accent, good, sub }: {
  value: string | number; label: string; accent?: boolean; good?: boolean; sub?: string;
}) {
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
        fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1,
        marginBottom: "0.25rem",
        color: accent ? "var(--accent)" : good ? "var(--ok)" : "var(--text)",
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", marginBottom: "0.2rem" }}>{sub}</div>}
      <div style={{ fontSize: "0.66rem", color: "var(--text-faint)", letterSpacing: "0.05em", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function MiniBarChart({ data, valorPorRota }: {
  data: { data: string; rotas: number; receita: number }[];
  valorPorRota: number | null;
}) {
  const maxRotas = Math.max(...data.map((d) => d.rotas), 1);
  const visibleData = data.slice(-20); // last 20 days

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, padding: "0 0.25rem" }}>
      {visibleData.map((d, i) => {
        const h = Math.max(2, Math.round((d.rotas / maxRotas) * 72));
        const isToday = d.data === new Date().toISOString().substring(0, 10);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
            <div
              title={`${d.data}: ${d.rotas} rota(s)${valorPorRota ? ` · R$ ${d.receita.toFixed(2)}` : ""}`}
              style={{
                width: "100%", height: h,
                background: isToday ? "var(--accent)" : d.rotas > 0 ? "var(--ok)" : "var(--border)",
                borderRadius: "2px 2px 0 0",
                transition: "height 400ms ease",
                opacity: d.rotas > 0 ? 1 : 0.35,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FinancialPanel({ financial }: { financial: any }) {
  const f = financial;
  if (!f) return null;

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const hasMeta = f.metaRotas !== null && f.metaRotas > 0;
  const metaPct = f.percentualMeta ?? 0;
  const cicloLabel = f.cicloPagamentoDias === 7 ? "semanal" : f.cicloPagamentoDias === 14 ? "quinzenal" : "mensal";
  const semConfigurar = f.valorPorRota === null;

  if (semConfigurar) {
    return (
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: "1.5rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text)" }}>
            Controle Financeiro
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", lineHeight: 1.5 }}>
            Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita e controle de despesas.
          </div>
        </div>
        <Link href="/settings">
          <button style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.55rem 1.1rem", borderRadius: 99,
            background: "var(--accent)", color: "#fff",
            border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
          }}>
            Configurar agora
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border-strong)",
      borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      marginBottom: "1.5rem",
    }}>
      <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Ciclo {cicloLabel} · Financeiro
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
          {new Date(f.inicioDoCliclo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} –{" "}
          {new Date(f.fimDoCiclo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>
        {/* Main financial numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Receita Estimada", value: formatBRL(f.receitaEstimada), color: "var(--ok)" },
            { label: "Despesas Fixas", value: formatBRL(f.despesasFixas), color: "var(--accent)" },
            { label: "Lucro Bruto", value: formatBRL(f.lucroBruto), color: f.lucroBruto >= 0 ? "var(--ok)" : "var(--accent)" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "var(--surface-2)", borderRadius: 10,
              padding: "0.85rem 0.9rem", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: item.color, letterSpacing: "-0.01em" }}>{item.value}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "0.2rem", fontWeight: 600 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Routes in cycle + mini chart */}
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "1rem", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Rotas no ciclo
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1 }}>
              {f.rotasCicloAtual}
            </div>
            {f.valorPorRota && (
              <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "0.25rem" }}>
                × {formatBRL(f.valorPorRota)}/rota
              </div>
            )}
            {hasMeta && (
              <div style={{ marginTop: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Meta</span>
                  <span style={{ fontSize: "0.7rem", color: metaPct >= 100 ? "var(--ok)" : "var(--accent)", fontWeight: 700 }}>{metaPct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--border-strong)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: metaPct >= 100 ? "var(--ok)" : "var(--accent)",
                    width: `${Math.min(metaPct, 100)}%`, transition: "width 800ms ease",
                  }} />
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", marginTop: "0.2rem" }}>{f.metaRotas} rotas alvo</div>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Atividade do ciclo
            </div>
            <MiniBarChart data={f.graficoDiario} valorPorRota={f.valorPorRota} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>
                {new Date(f.inicioDoCliclo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
              <span style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>hoje</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: recent, isLoading: recLoading } = useGetRecentAnalyses();
  const { data: financial, isLoading: finLoading } = useGetDashboardFinancial();

  const s = summary as any;
  const r = (recent as any[]) ?? [];
  const f = financial as any;

  return (
    <Layout>
      {/* Welcome */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          Bem-vindo, {user?.name?.split(" ")[0] ?? "usuário"}.
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
          Resumo das suas análises e controle financeiro de rotas.
        </p>
      </div>

      {/* Analysis stats */}
      {sumLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div style={{ width: 36, height: 36, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
        </div>
      ) : s && (
        <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <StatTile value={s.totalAnalyses} label="Análises" />
          <StatTile value={s.totalAddressesProcessed.toLocaleString("pt-BR")} label="Endereços" good />
          <StatTile value={`${Math.round((s.avgNuanceRate / Math.max(s.totalAddressesProcessed, 1)) * 100 || 0)}%`} label="Nuances" accent />
          <StatTile value={`${Math.round((s.avgSimilarity || 0) * 100)}%`} label="Similaridade" good />
          <StatTile value={s.analysesThisMonth} label="Este Mês" />
        </div>
      )}

      {/* Financial panel */}
      {!finLoading && <FinancialPanel financial={f} />}

      {/* Quick actions */}
      <div className="quick-actions" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Link href="/process">
          <button style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.65rem 1.5rem", borderRadius: 99,
            background: "var(--accent)", color: "#fff",
            border: "none", fontSize: "0.82rem", fontWeight: 600,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(212,82,26,0.3)",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,12 15,15"/></svg>
            Nova Análise
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
            Ver Histórico
          </button>
        </Link>
      </div>

      {/* Recent analyses */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", overflow: "hidden",
      }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Análises Recentes
          </span>
          <Link href="/history">
            <span style={{ fontSize: "0.72rem", color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Ver todas →</span>
          </Link>
        </div>

        {recLoading ? (
          <div style={{ padding: "3rem", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
          </div>
        ) : r.length === 0 ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.82rem" }}>
            Nenhuma análise ainda.{" "}
            <Link href="/process">
              <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>Processar primeira rota</span>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Arquivo", "Endereços", "Nuances", "Status", "Data"].map((h) => (
                    <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-strong)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.map((a: any) => (
                  <tr key={a.id} style={{ transition: "background 150ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.fileName}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{a.totalAddresses}</td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "0.18rem 0.55rem", borderRadius: 99, fontSize: "0.68rem", fontWeight: 600,
                        background: a.nuances > 0 ? "var(--accent-dim)" : "var(--ok-dim)",
                        color: a.nuances > 0 ? "var(--accent)" : "var(--ok)",
                      }}>
                        {a.nuances}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-flex", padding: "0.18rem 0.55rem", borderRadius: 99,
                        fontSize: "0.68rem", fontWeight: 600,
                        background: a.status === "done" ? "var(--ok-dim)" : "var(--accent-dim)",
                        color: a.status === "done" ? "var(--ok)" : "var(--accent)",
                      }}>
                        {a.status === "done" ? "Concluído" : a.status}
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
