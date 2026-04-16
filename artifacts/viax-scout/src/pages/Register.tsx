import React, { useState } from "react";
import { useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/Layout";

export default function Register() {
  const [, navigate] = useLocation();
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const { showToast, ToastComponent } = useToast();
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { data: { name, email, password, birthDate: birthDate || null } },
      {
        onSuccess: (data: any) => {
          setUser(data.user);
          navigate("/setup");
        },
        onError: (err: any) => {
          showToast(err?.data?.error ?? "Erro ao criar conta.");
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
        {dark ? "Claro" : "Escuro"}
      </button>

      <div style={{
        width: "100%", maxWidth: 440,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.09)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <span style={{ fontFamily: "Poppins", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>ViaX Scout</span>
            <span style={{ fontSize: "0.6rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.15rem 0.5rem", borderRadius: 4, letterSpacing: "0.06em", fontWeight: 600 }}>v7.0</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem 2rem 2rem" }}>
          {[
            { label: "Nome completo", type: "text", value: name, setter: setName, placeholder: "Seu nome", required: true },
            { label: "Email", type: "email", value: email, setter: setEmail, placeholder: "seu@email.com", required: true },
            { label: "Senha", type: "password", value: password, setter: setPassword, placeholder: "Mínimo 8 caracteres", required: true },
          ].map(({ label, type, value, setter, placeholder, required }) => (
            <div key={label} style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required={required}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "0.65rem 0.9rem",
                  borderRadius: 8, border: "1px solid var(--border-strong)",
                  background: "var(--surface-2)", color: "var(--text)",
                  fontSize: "0.85rem", outline: "none",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.4rem" }}>
              Data de nascimento <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
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
            disabled={registerMutation.isPending}
            style={{
              width: "100%", padding: "0.75rem",
              borderRadius: 99, border: "none",
              background: "var(--accent)", color: "#fff",
              fontSize: "0.85rem", fontWeight: 600,
              cursor: registerMutation.isPending ? "not-allowed" : "pointer",
              opacity: registerMutation.isPending ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
          </button>

          <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)" }}>
            Já tem conta?{" "}
            <a
              href="/login"
              onClick={(e) => { e.preventDefault(); navigate("/login"); }}
              style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              Entrar
            </a>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  );
}
