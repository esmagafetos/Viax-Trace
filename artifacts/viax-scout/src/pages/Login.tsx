import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/Layout";

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showToast, ToastComponent } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data: any) => {
          setUser(data.user);
          navigate("/dashboard");
        },
        onError: (err: any) => {
          showToast(err?.data?.error ?? "Credenciais inválidas.");
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
      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={{
          position: "fixed", top: "1.25rem", right: "1.25rem",
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.4rem 0.85rem", borderRadius: 99,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)", color: "var(--text-muted)",
          fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
        }}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
        {dark ? "Claro" : "Escuro"}
      </button>

      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <span style={{ fontFamily: "Poppins", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>ViaX Scout</span>
            <span style={{ fontSize: "0.6rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.15rem 0.5rem", borderRadius: 4, letterSpacing: "0.06em", fontWeight: 600 }}>v7.0</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>Acesse sua conta para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem 2rem 2rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{
                width: "100%", padding: "0.65rem 0.9rem",
                borderRadius: 8, border: "1px solid var(--border-strong)",
                background: "var(--surface-2)", color: "var(--text)",
                fontSize: "0.85rem", outline: "none",
                transition: "border-color 200ms",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", padding: "0.65rem 0.9rem",
                borderRadius: 8, border: "1px solid var(--border-strong)",
                background: "var(--surface-2)", color: "var(--text)",
                fontSize: "0.85rem", outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%", padding: "0.75rem",
              borderRadius: 99, border: "none",
              background: "var(--accent)", color: "#fff",
              fontSize: "0.85rem", fontWeight: 600,
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              opacity: loginMutation.isPending ? 0.7 : 1,
              transition: "all 200ms",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {loginMutation.isPending ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin-ring" />
                Entrando...
              </>
            ) : "Entrar"}
          </button>

          <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)" }}>
            Ainda nao tem conta?{" "}
            <a
              href="/register"
              onClick={(e) => { e.preventDefault(); navigate("/register"); }}
              style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              Criar conta
            </a>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  );
}
