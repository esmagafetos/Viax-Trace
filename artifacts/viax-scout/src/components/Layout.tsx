import React, { useState, useEffect, useRef } from "react";
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

const MENU_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const X_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </svg>
  ),
  "/process": (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.75V16h8v-1.25A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  "/history": (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/process", label: "Processar Rota" },
    { href: "/history", label: "Histórico" },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [loc]);

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
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexShrink: 0 }}>
              <span style={{ fontFamily: "Poppins", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>ViaX Scout</span>
              <span style={{ fontSize: "0.6rem", color: "var(--accent)", background: "var(--accent-dim)", padding: "0.15rem 0.5rem", borderRadius: 4, letterSpacing: "0.06em", fontWeight: 600 }}>v7.0</span>
            </div>

            {/* Desktop Nav links */}
            <nav style={{ display: "flex", gap: "0.15rem", alignItems: "center" }} className="hide-mobile">
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
                    display: "inline-block",
                  }}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right: theme + profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Theme toggle - desktop only */}
              <button
                onClick={toggle}
                className="hide-mobile"
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

              {/* Profile dropdown */}
              {user && (
                <div ref={profileRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "var(--accent-dim)", border: `2px solid ${profileMenuOpen ? "var(--accent)" : "var(--border-strong)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)",
                      overflow: "hidden", cursor: "pointer", transition: "border-color 200ms",
                      padding: 0,
                    }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </button>

                  {profileMenuOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 8px)",
                      background: "var(--surface)", border: "1px solid var(--border-strong)",
                      borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      minWidth: 180, zIndex: 100, overflow: "hidden",
                      animation: "fadeDown 150ms ease",
                    }}>
                      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                      </div>
                      <Link href="/settings">
                        <div style={{ padding: "0.65rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", transition: "background 150ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                          Configurações
                        </div>
                      </Link>
                      <Link href="/settings">
                        <div style={{ padding: "0.65rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", transition: "background 150ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          Perfil
                        </div>
                      </Link>
                      <div style={{ borderTop: "1px solid var(--border)" }}>
                        <button
                          onClick={logout}
                          style={{
                            width: "100%", padding: "0.65rem 1rem",
                            fontSize: "0.82rem", color: "var(--accent)", cursor: "pointer",
                            background: "none", border: "none", textAlign: "left",
                            display: "flex", alignItems: "center", gap: "0.6rem",
                            fontFamily: "Poppins", transition: "background 150ms",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                          Sair
                        </button>
                      </div>

                      {/* Mobile theme toggle inside dropdown */}
                      <div className="show-mobile" style={{ borderTop: "1px solid var(--border)" }}>
                        <button
                          onClick={toggle}
                          style={{
                            width: "100%", padding: "0.65rem 1rem",
                            fontSize: "0.82rem", color: "var(--text-muted)", cursor: "pointer",
                            background: "none", border: "none", textAlign: "left",
                            display: "flex", alignItems: "center", gap: "0.6rem",
                            fontFamily: "Poppins",
                          }}
                        >
                          {dark ? SUN_SVG : MOON_SVG}
                          {dark ? "Modo Claro" : "Modo Escuro"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="show-mobile"
                aria-label={mobileMenuOpen ? "Fechar navegação" : "Abrir navegação"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
                  height: 36, padding: "0 0.75rem", borderRadius: 99,
                  border: `1px solid ${mobileMenuOpen ? "rgba(212,82,26,0.35)" : "var(--border-strong)"}`,
                  background: mobileMenuOpen ? "var(--accent-dim)" : "var(--surface)",
                  color: mobileMenuOpen ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>Menu</span>
                {mobileMenuOpen ? X_SVG : MENU_SVG}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="show-mobile" style={{
              borderTop: "1px solid var(--border-strong)",
              background: "var(--surface)",
              padding: "0.75rem 1rem 1rem",
              boxShadow: "0 14px 34px rgba(0,0,0,0.08)",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.55rem", maxWidth: 520, margin: "0 auto" }}>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div style={{
                    minHeight: 78,
                    padding: "0.75rem 0.5rem",
                    borderRadius: 14,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    color: loc === link.href ? "var(--accent)" : "var(--text-muted)",
                    background: loc === link.href ? "var(--accent-dim)" : "var(--surface-2)",
                    border: `1px solid ${loc === link.href ? "rgba(212,82,26,0.32)" : "var(--border)"}`,
                    transition: "all 150ms",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.45rem",
                    textAlign: "center",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{NAV_ICONS[link.href]}</span>
                    {link.label}
                  </div>
                </Link>
              ))}
              </div>
            </div>
          )}
        </header>
      )}

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: showNav ? "1.5rem 1rem 4rem" : 0 }}>
        {children}
      </main>
    </div>
  );
}
