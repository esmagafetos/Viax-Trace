import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const SUN_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MOON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  "/process": (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.75V16h8v-1.25A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  "/history": (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    setProfileMenuOpen(false);
  }, [loc]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {showNav && (
        <header className="header-glass" style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
            <div className="header-top-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
              {/* Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}>ViaX Scout</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>Validação de Rotas</span>
                </div>
              </div>

              {/* Desktop Nav */}
              <nav className="desktop-nav" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flex: 1, justifyContent: "center" }}>
                {navLinks.map((link) => {
                  const isActive = loc === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <span className={`nav-link ${isActive ? "active" : ""}`} style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        borderRadius: 99,
                        fontSize: "0.85rem",
                        fontWeight: isActive ? 600 : 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        background: isActive ? "var(--accent-dim)" : "transparent",
                      }}>
                        {NAV_ICONS[link.href]}
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={toggle}
                  aria-label="Alternar tema"
                  className="icon-btn"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text)",
                    cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {dark ? SUN_SVG : MOON_SVG}
                </button>

                {user && (
                  <div ref={profileRef} style={{ position: "relative" }}>
                    <button
                      onClick={() => setProfileMenuOpen((o) => !o)}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "var(--surface-2)", border: `2px solid ${profileMenuOpen ? "var(--accent)" : "transparent"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.85rem", fontWeight: 700, color: "var(--text)",
                        overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
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
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 12, boxShadow: "var(--shadow-md)",
                        minWidth: 200, zIndex: 100, overflow: "hidden",
                        animation: "fadeDown 150ms ease",
                      }}>
                        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                        </div>
                        <div style={{ padding: "0.25rem" }}>
                          <Link href="/settings">
                            <div className="dropdown-item" style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", borderRadius: 8 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                              Configurações
                            </div>
                          </Link>
                          <Link href="/settings">
                            <div className="dropdown-item" style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", borderRadius: 8 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              Perfil
                            </div>
                          </Link>
                        </div>
                        <div style={{ padding: "0.25rem", borderTop: "1px solid var(--border)" }}>
                          <button
                            onClick={logout}
                            className="dropdown-item logout"
                            style={{
                              width: "100%", padding: "0.6rem 0.75rem",
                              fontSize: "0.85rem", color: "var(--destructive)", cursor: "pointer",
                              background: "none", border: "none", textAlign: "left",
                              display: "flex", alignItems: "center", gap: "0.6rem",
                              fontFamily: "var(--font-sans)", borderRadius: 8,
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Nav Scrollable */}
            <div className="mobile-nav-scroll" style={{ display: "none" }}>
              <nav style={{ display: "flex", gap: "0.5rem", padding: "0 0 0.75rem 0", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                {navLinks.map((link) => {
                  const isActive = loc === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <span className={`nav-link ${isActive ? "active" : ""}`} style={{
                        display: "flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.5rem 0.85rem",
                        borderRadius: 99,
                        fontSize: "0.85rem",
                        fontWeight: isActive ? 600 : 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        background: isActive ? "var(--accent-dim)" : "var(--surface-2)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}>
                        {NAV_ICONS[link.href]}
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>
      )}

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: showNav ? "2rem 1rem 4rem" : 0 }}>
        {children}
      </main>
    </div>
  );
}
