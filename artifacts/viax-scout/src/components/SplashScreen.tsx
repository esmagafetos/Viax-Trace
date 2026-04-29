import { useEffect, useState } from "react";
import ViaXLogo from "@/components/ViaXLogo";

/**
 * Branded boot splash shown during the initial `/api/auth/me` round-trip.
 *
 * The Render free-tier backend can sleep — when it wakes from cold start the
 * first request can take 30-60 seconds. Instead of flashing the login form
 * and then jumping straight to the dashboard, we hold this screen for as
 * long as the bootstrap is in flight and progressively reveal a friendlier
 * "waking the server" copy after a few seconds so the wait feels intentional.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2500);
    const t2 = setTimeout(() => setPhase(2), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const status =
    phase === 0
      ? "Conectando…"
      : phase === 1
        ? "Acordando o servidor…"
        : "Quase lá — o servidor estava em repouso";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.75rem",
        padding: "2rem",
        animation: "viax-splash-fade 320ms ease",
      }}
    >
      <style>{`
        @keyframes viax-splash-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes viax-splash-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes viax-splash-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.85rem",
          animation: "viax-splash-pulse 1.6s ease-in-out infinite",
        }}
      >
        <ViaXLogo size="xl" showTagline />
      </div>

      <div
        style={{
          width: 180,
          height: 3,
          borderRadius: 99,
          background: "var(--surface-2)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "60%",
            background:
              "linear-gradient(90deg, transparent, var(--accent), transparent)",
            animation: "viax-splash-bar 1.4s ease-in-out infinite",
          }}
        />
      </div>

      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          letterSpacing: "0.02em",
          textAlign: "center",
          maxWidth: 320,
          minHeight: "1.2em",
          transition: "opacity 200ms ease",
        }}
      >
        {status}
      </div>
    </div>
  );
}
