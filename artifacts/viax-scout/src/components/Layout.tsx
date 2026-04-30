import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ViaXLogo, { LogoIcon } from "@/components/ViaXLogo";

const SUN_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MOON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  "/process": (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.75V16h8v-1.25A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  "/tool": (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  "/history": (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  "/docs": (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
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
  const [loc, setLocation] = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/process", label: "Processar" },
    { href: "/tool", label: "Ferramenta" },
    { href: "/history", label: "Histórico" },
    { href: "/docs", label: "Docs" },
  ];

  // Índice da aba ativa (-1 quando estamos numa rota fora das abas, ex.: /settings)
  const navIndex = navLinks.findIndex(
    (l) => loc === l.href || (l.href !== "/dashboard" && loc.startsWith(l.href)),
  );

  // Refs e estado para o indicador laranja deslizante (desktop + mobile)
  const desktopTabRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mobileTabRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [desktopInd, setDesktopInd] = useState<{ left: number; width: number } | null>(null);
  const [mobileInd, setMobileInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (navIndex < 0) {
      setDesktopInd(null);
      setMobileInd(null);
      return;
    }
    const measure = () => {
      const d = desktopTabRefs.current[navIndex];
      if (d) setDesktopInd({ left: d.offsetLeft, width: d.offsetWidth });
      const m = mobileTabRefs.current[navIndex];
      if (m) setMobileInd({ left: m.offsetLeft, width: m.offsetWidth });
    };
    measure();
    // Re-mede em resize (responsivo) e nos próximos frames (após fontes carregarem)
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [loc, navIndex]);

  // Swipe horizontal entre abas (mobile)
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const onSwipeStart = (e: React.TouchEvent) => {
    if (navIndex === -1) return;
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || navIndex === -1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    // Gesto válido: horizontal forte, vertical pequeno, rápido
    if (Math.abs(dx) < 70 || Math.abs(dy) > 60 || dt > 600) return;
    const nextIdx = dx < 0 ? navIndex + 1 : navIndex - 1;
    if (nextIdx >= 0 && nextIdx < navLinks.length) {
      setLocation(navLinks[nextIdx].href);
    }
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setProfileMenuOpen(false); }, [loc]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {showNav && (
        <header className="header-glass" style={{
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.25rem" }}>
            <div className="header-top-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

              {/* Brand */}
              <Link href="/dashboard">
                <div style={{ cursor: "pointer", flexShrink: 0 }}>
                  <ViaXLogo size="sm" dark={dark} showTagline />
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="desktop-nav" style={{ position: "relative", display: "flex", gap: "0.25rem", alignItems: "center", flex: 1, justifyContent: "center" }}>
                {desktopInd && (
                  <span
                    aria-hidden
                    className="viax-tab-indicator"
                    style={{
                      position: "absolute",
                      left: desktopInd.left,
                      width: desktopInd.width,
                      top: "50%",
                      transform: "translateY(-50%)",
                      height: 34,
                      background: "var(--accent-dim)",
                      border: "1px solid rgba(212,82,26,0.35)",
                      borderRadius: 99,
                      transition: "left 320ms cubic-bezier(0.4,0,0.2,1), width 320ms cubic-bezier(0.4,0,0.2,1)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}
                {navLinks.map((link, i) => {
                  const isActive = i === navIndex;
                  return (
                    <Link key={link.href} href={link.href}>
                      <span
                        ref={(el) => { desktopTabRefs.current[i] = el; }}
                        className={`nav-link ${isActive ? "active" : ""}`}
                        style={{
                          position: "relative", zIndex: 1,
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.45rem 0.9rem",
                          borderRadius: 99,
                          fontSize: "0.82rem",
                          fontWeight: isActive ? 600 : 500,
                          cursor: "pointer",
                          transition: "color 0.2s ease",
                          color: isActive ? "var(--accent)" : "var(--text-muted)",
                          background: "transparent",
                        }}
                      >
                        {NAV_ICONS[link.href]}
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={toggle}
                  aria-label="Alternar tema"
                  className="icon-btn"
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
                  }}
                >
                  {dark ? SUN_SVG : MOON_SVG}
                </button>

                {user && (
                  <div ref={profileRef} style={{ position: "relative" }}>
                    <button
                      onClick={() => setProfileMenuOpen((o) => !o)}
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "var(--accent-dim)",
                        border: `2px solid ${profileMenuOpen ? "var(--accent)" : "transparent"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)",
                        overflow: "hidden", cursor: "pointer", transition: "all 0.2s", padding: 0,
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
                        minWidth: 210, zIndex: 100, overflow: "hidden",
                        animation: "fadeDown 150ms ease",
                      }}>
                        <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                        </div>
                        <div style={{ padding: "0.3rem" }}>
                          {[
                            { href: "/settings", icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>, label: "Configurações" },
                            { href: "/docs", icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, label: "Documentação" },
                          ].map(item => (
                            <Link key={item.href} href={item.href}>
                              <div className="dropdown-item" style={{ padding: "0.55rem 0.75rem", fontSize: "0.82rem", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", borderRadius: 8 }}>
                                {item.icon}{item.label}
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div style={{ padding: "0.3rem", borderTop: "1px solid var(--border)" }}>
                          <button
                            onClick={logout}
                            className="dropdown-item logout"
                            style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.82rem", color: "var(--destructive)", cursor: "pointer", background: "none", border: "none", textAlign: "left", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-sans)", borderRadius: 8 }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Nav */}
            <div className="mobile-nav-scroll" style={{ display: "none" }}>
              <nav style={{ position: "relative", display: "flex", gap: "0.4rem", padding: "0 0 0.6rem 0", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {mobileInd && (
                  <span
                    aria-hidden
                    className="viax-tab-indicator"
                    style={{
                      position: "absolute",
                      left: mobileInd.left,
                      width: mobileInd.width,
                      top: 0,
                      height: "calc(100% - 0.6rem)",
                      background: "var(--accent-dim)",
                      border: "1px solid rgba(212,82,26,0.35)",
                      borderRadius: 99,
                      transition: "left 320ms cubic-bezier(0.4,0,0.2,1), width 320ms cubic-bezier(0.4,0,0.2,1)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}
                {navLinks.map((link, i) => {
                  const isActive = i === navIndex;
                  return (
                    <Link key={link.href} href={link.href}>
                      <span
                        ref={(el) => { mobileTabRefs.current[i] = el; }}
                        className={`nav-link ${isActive ? "active" : ""}`}
                        style={{
                          position: "relative", zIndex: 1,
                          display: "flex", alignItems: "center", gap: "0.35rem",
                          padding: "0.45rem 0.8rem", borderRadius: 99, fontSize: "0.82rem",
                          fontWeight: isActive ? 600 : 500, cursor: "pointer", transition: "color 0.2s ease",
                          color: isActive ? "var(--accent)" : "var(--text-muted)",
                          background: isActive ? "transparent" : "var(--surface-2)",
                          whiteSpace: "nowrap", flexShrink: 0,
                        }}
                      >
                        {NAV_ICONS[link.href]}{link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>
      )}

      <main
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
        style={{ maxWidth: 1200, margin: "0 auto", padding: showNav ? "2rem 1.25rem 3rem" : 0, touchAction: "pan-y" }}
      >
        {children}
      </main>

      {/* Animação sutil de pulso laranja sobre a aba ativa */}
      <style>{`
        @keyframes viax-tab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,82,26,0.0), 0 0 12px -2px rgba(212,82,26,0.18); }
          50%      { box-shadow: 0 0 0 2px rgba(212,82,26,0.08), 0 0 18px -2px rgba(212,82,26,0.32); }
        }
        .viax-tab-indicator {
          animation: viax-tab-pulse 2.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .viax-tab-indicator { animation: none; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
