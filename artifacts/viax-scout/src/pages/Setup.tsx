import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";

export default function Setup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [parserMode, setParserMode] = useState<"builtin" | "ai">("builtin");
  const [toleranceMeters, setToleranceMeters] = useState(300);
  const { showToast, ToastComponent } = useToast();
  const updateSettingsMutation = useUpdateSettings();

  const handleContinue = () => {
    updateSettingsMutation.mutate(
      { data: { parserMode, toleranceMeters } },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: () => {
          showToast("Erro ao salvar configurações, mas você pode configurar depois.");
          navigate("/dashboard");
        },
      }
    );
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{
        width: "100%", maxWidth: 520,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        animation: "fadeUp 0.4s ease",
      }}>
        <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.2rem 0.6rem", borderRadius: 99, fontWeight: 600, letterSpacing: "0.08em" }}>
              CONFIGURAÇÃO INICIAL
            </span>
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
            Bem-vindo, {user?.name?.split(" ")[0] ?? "usuario"}!
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
            Configure como o ViaX Scout deve processar seus enderecos.
          </p>
        </div>

        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Parser mode */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.75rem" }}>
              Modo de Parser
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {[
                { value: "builtin", label: "Parser Embutido", desc: "Rapido, offline, sem custos extras" },
                { value: "ai", label: "Inteligencia Artificial", desc: "Maior precisao com IA externa" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setParserMode(opt.value as "builtin" | "ai")}
                  style={{
                    flex: 1, padding: "0.85rem", borderRadius: 10,
                    border: `1px solid ${parserMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`,
                    background: parserMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 200ms",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: parserMode === opt.value ? "var(--accent)" : "var(--text)", marginBottom: "0.25rem" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tolerance */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.75rem" }}>
              <span>Tolerancia de Coordenadas</span>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>{toleranceMeters}m</span>
            </label>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={toleranceMeters}
              onChange={(e) => setToleranceMeters(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "0.3rem" }}>
              <span>100m (rigoroso)</span>
              <span>5000m (flexivel)</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: "0.5rem" }}>
              Distancia maxima entre a coordenada GPS e o endereco oficial para aceitar como correto.
            </p>
          </div>

          <button
            onClick={handleContinue}
            disabled={updateSettingsMutation.isPending}
            style={{
              width: "100%", padding: "0.75rem",
              borderRadius: 99, border: "none",
              background: "var(--text)", color: "var(--bg)",
              fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", transition: "all 200ms",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {updateSettingsMutation.isPending ? "Salvando..." : "Continuar para o Dashboard"}
          </button>

          <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-faint)" }}
            >
              Pular por agora
            </button>
          </div>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
