import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const SUN_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const MOON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export function useTheme() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("viax-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "");
    localStorage.setItem("viax-theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [loc] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/process", label: "Processar Rota" },
    { href: "/history", label: "Histórico" },
    { href: "/settings", label: "Configurações" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {showNav && (
        <header style={{
          borderBottom: "1px solid var(--border-strong)",
          background: "var(--surface)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
              <span style={{ fontFamily: "Poppins", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.01em" }}>ViaX Scout</span>
              <span style={{ fontSize: "0.6rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.15rem 0.5rem", borderRadius: 4, letterSpacing: "0.06em", fontWeight: 600 }}>v7.0</span>
            </div>

            {/* Nav links */}
            <nav style={{ display: "flex", gap: "0.15rem", alignItems: "center" }}>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: 99,
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 200ms",
                    color: loc === link.href ? "var(--accent)" : "var(--text-muted)",
                    background: loc === link.href ? "var(--accent-dim)" : "transparent",
                  }}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right: theme + user */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                onClick={toggle}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.35rem 0.75rem", borderRadius: 99,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)", color: "var(--text-muted)",
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  transition: "all 200ms",
                }}
              >
                {dark ? SUN_SVG : MOON_SVG}
                <span>{dark ? "Claro" : "Escuro"}</span>
              </button>
              {user && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "var(--accent-dim)", border: "1px solid var(--border-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)",
                    overflow: "hidden",
                  }}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={logout}
                    style={{
                      padding: "0.35rem 0.75rem", borderRadius: 99,
                      border: "1px solid var(--border-strong)",
                      background: "transparent", color: "var(--text-faint)",
                      fontSize: "0.72rem", cursor: "pointer",
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: showNav ? "2rem 1.25rem 4rem" : 0 }}>
        {children}
      </main>
    </div>
  );
}
