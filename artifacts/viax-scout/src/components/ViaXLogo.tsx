import React from "react";

interface LogoIconProps {
  size?: number;
  color?: string;
  accentColor?: string;
}

export function LogoIcon({ size = 28, color = "currentColor", accentColor = "#d4521a" }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 7C7 7 7 16 14 18C20 20 21 21 21 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="2.5" fill={color} />
      <circle cx="21" cy="21" r="4.5" fill={accentColor} />
      <circle cx="21" cy="21" r="1.8" fill="white" />
    </svg>
  );
}

interface AppIconProps {
  size?: number;
  dark?: boolean;
}

export function AppIcon({ size = 40, dark = false }: AppIconProps) {
  const bg = dark ? "#121110" : "#ffffff";
  const fg = dark ? "#f0ede8" : "#1a1917";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="9" fill={bg} />
      <path
        d="M10 10C10 10 10 20 17 22C23 24 24 25 24 25"
        stroke={fg}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="3" fill={fg} />
      <circle cx="30" cy="30" r="5.5" fill="#d4521a" />
      <circle cx="30" cy="30" r="2.2" fill="white" />
    </svg>
  );
}

interface ViaXLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 18, name: "0.85rem", tagline: "0.5rem", gap: "0.4rem" },
  md: { icon: 24, name: "1.05rem", tagline: "0.55rem", gap: "0.55rem" },
  lg: { icon: 32, name: "1.4rem", tagline: "0.65rem", gap: "0.7rem" },
  xl: { icon: 48, name: "2rem", tagline: "0.8rem", gap: "1rem" },
};

export default function ViaXLogo({
  size = "md",
  dark = false,
  showTagline = true,
}: ViaXLogoProps) {
  const s = SIZES[size];
  const textColor = dark ? "#f0ede8" : "#1a1917";
  const mutedColor = dark ? "rgba(240,237,232,0.4)" : "rgba(26,25,23,0.4)";
  const taglineColor = dark ? "rgba(240,237,232,0.45)" : "rgba(26,25,23,0.4)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      <LogoIcon size={s.icon} color={textColor} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: s.name,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: textColor,
          lineHeight: showTagline ? 1.15 : 1,
        }}>
          ViaX<span style={{ color: mutedColor, fontWeight: 400 }}>:</span>Trace
        </div>
        {showTagline && (
          <div style={{
            fontSize: s.tagline,
            color: taglineColor,
            letterSpacing: "0.12em",
            fontWeight: 600,
            textTransform: "uppercase",
            fontFamily: "'Poppins', sans-serif",
            marginTop: "0.05em",
          }}>
            Auditoria de Rotas
          </div>
        )}
      </div>
    </div>
  );
}

export function GitHubBanner() {
  return (
    <a
      href="https://github.com/esmagafetos/Viax-Scout"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none" }}
    >
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
          transition: "box-shadow 200ms, transform 200ms",
          cursor: "pointer",
          lineHeight: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 48px rgba(0,0,0,0.5)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 32px rgba(0,0,0,0.35)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        <img
          src="/github-banner.png"
          alt="ViaX:Trace — Auditoria de Rotas"
          style={{
            width: "100%",
            display: "block",
            objectFit: "contain",
            background: "#0d0d0d",
          }}
        />
      </div>
    </a>
  );
}
