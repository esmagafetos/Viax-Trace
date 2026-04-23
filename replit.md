# ViaX:Trace

## Overview

Full SaaS web application for validating delivery route XLSX/CSV files against GPS coordinates.
pnpm workspace monorepo with React+Vite frontend and Express API backend.

## Project

**ViaX:Trace** (v8.0) — Brazilian Portuguese SaaS logistics auditing platform.
- Auth: session-based (express-session + bcryptjs)
- Design: warm amber/orange→purple gradient palette (`#d4521a` → `#9333ea` accent), Poppins font, glassmorphism blur, 14px radius cards
- UI language: Brazilian Portuguese throughout
- Features: Login/Register, Dashboard stats, Route Processing (XLSX/CSV upload via SSE), History, 6-tab Settings (Perfil + Financeiro + Instâncias + Parser + Tolerância + **Sobre**)
- Mobile-first design: frosted-glass header, horizontal mobile nav, responsive grids, hide-mobile/show-mobile CSS helpers
- Profile dropdown in nav: Configurações / Perfil / Sair + avatar picker from device gallery
- Geocoder: coordinate-first validation — reverse geocode spreadsheet GPS with **Photon (primary) → Overpass API (secondary, multi-mirror, radius 40m→90m) → Nominatim (last resort)**; forward geocoding also Photon-first. Google Maps available as premium option via `instanceMode: "googlemaps"`.
- Process: SSE-based XLSX/CSV upload (fetch + ReadableStream), max 500 addresses, 10MB file limit
- Avatar: stored as base64 data URL in DB, uploaded via multipart POST

## Branding

- **Brand name**: ViaX:Trace (replaces "ViaX: System")
- **Logo component**: `artifacts/viax-scout/src/components/ViaXLogo.tsx`
  - `ViaXLogo` — Horizontal wordmark with icon + "ViaX:Trace" + "AUDITORIA DE ROTAS" tagline
  - `LogoIcon` — Standalone SVG mark: start dot + bezier curve + orange endpoint pin
  - `AppIcon` — Square app icon (light/dark) 
  - `GitHubBanner` — Full project banner used in Docs page
- **Design exports**: `design-exports/` — Screenshots of logo variants (showcase, light, dark, github banner)
- **Accent**: `#d4521a` orange → warm dark browns for gradients
- **Color gradient**: `linear-gradient(135deg, #1a0e08 0%, #2d1408 40%, #3d1c0c 70%, #1f0a18 100%)`

## Artifacts

1. **API Server** (`artifacts/api-server`) — Express 5, port 8080
   - Routes: `/api/auth/*`, `/api/users/*`, `/api/analyses/*`, `/api/dashboard/*`, `/api/process/upload`
   - `lib/geocoder.ts` — address parser + coordinate-first Photon/Overpass/Nominatim/BrasilAPI/Google Maps validation pipeline
2. **ViaX Scout** (`artifacts/viax-scout`) — React+Vite frontend, port 5173
   - Proxy: `/api/*` → `http://localhost:8080` (Vite proxy config)
   - Pages: Login, Register, Setup, Dashboard, Process, History, Settings
3. **ViaX Mobile** (`artifacts/viax-mobile`) — Expo (React Native) Android app, brand-matched to web
   - Stack: Expo SDK 54 + expo-router (file-based routing) + TanStack Query + Poppins fonts
   - Screens: Login, Register, **Setup**, Tabs (Dashboard, Processar, Histórico, Ajustes)
   - **Visual parity with web** — same warm amber palette (`#d4521a`), Poppins typography, 14px-radius cards with shadow, 99px pill buttons, uppercase letter-spaced labels, accent focus ring on inputs, eye toggle on PasswordInput, 4-segment PasswordStrength meter, floating top-right ThemeToggle pill
   - Theme: `lib/theme.tsx` ThemeProvider (light/dark) persisted in `expo-secure-store` (key `viax_theme_mode`); `useColors()` reads from it
   - Brand assets: real PNGs from `design-exports/` copied to `assets/brand/` (light, dark, banner, showcase); `components/ViaXLogo.tsx` exposes `LogoMark`, `ViaXLogo`, `GitHubBanner`, `FlatLogo`
   - Shared UI primitives in `components/ui.tsx`: `Card`, `CardHeader`, `CardBody`, `H1/H2`, `Label`, `Input`, `PasswordInput`, `PasswordStrength`, `Button` (primary/ghost/dark, optional `iconRight`), `Pill`, `ThemeToggle`, `FieldError`
   - **Mirrors the web Setup flow** (parser mode + geocoding instance + tolerance preset chips) and adds a mobile-only **"Configurar servidor"** section with step-by-step Termux install instructions, copyable command blocks, and a validated **API Server** URL field
   - Register: client-side validators (email regex, password 8+/letra/número), live PasswordStrength bar, sends `{ name, email, password, birthDate }` matching the API's `RegisterBody` schema
   - Auth: session cookie persisted in `expo-secure-store` (key `viax_session_cookie`); login uses `{ email, password }` (matches API's `LoginBody`)
   - Build: EAS Build profiles `development`, `preview` (APK debuggable) and `production` (APK release with `autoIncrement` of `versionCode`)
   - Release: GitHub Actions workflow `.github/workflows/mobile-release.yml` runs typecheck then builds APK on EAS and publishes a GitHub Release with the APK asset (uses `EXPO_TOKEN` secret). Supports `workflow_dispatch` with profile choice.
   - Android permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE`; `usesCleartextTraffic: true` so it can talk to local Termux servers over `http://` LAN IPs.
   - **Authenticated screens (Wave 2)** mirror the web 1:1 — shared `components/AppHeader.tsx` (logo + theme toggle + avatar) above every tab; Dashboard with HeroBanner gradient, 5-stat tile grid, FinancialPanel (receita/despesas/lucro + meta progress + 20-day MiniBarChart), recent analyses list; Process with Card+CardHeader pattern, dropzone, SSE-driven progress bar; History with paginated list + delete confirmation; Settings as full 6-tab (Perfil / Financeiro / Instâncias / Parser / Tolerância / Sobre) using `lib/format.ts` helpers (`formatBRL`, `formatPct`, `formatMs`, `formatDate`).

## Stack

- **Monorepo tool**: pnpm workspaces (catalog + minimumReleaseAge=1440 supply-chain guard)
- **Node.js version**: 24
- **Package manager**: pnpm 10.26.1 (pinned via `packageManager` field)
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Frontend**: React 19.1.0 (pinned for Expo compat), Vite 7, TanStack Query, Wouter router, Tailwind CSS v4
- **Mobile**: Expo SDK 54 + React Native 0.81 + expo-router 6 (`artifacts/viax-mobile`)
- **Geocoder microservice**: R 4.5 + Plumber + geocodebr (IPEA/CNEFE) (`artifacts/geocodebr-service`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Design Tokens

- Light: `--bg: #f4f3ef`, `--accent: #d4521a`, surface with blur(12px)
- Dark: `--bg: #121110`, `--accent: #e8703a`
- Font: Poppins (Google Fonts)
- Border radius: 14px cards, 99px pill buttons

## Installers (root of repo)

- `install.sh` — Linux & macOS (auto-installs Node, pnpm, PostgreSQL, configures DB, builds, creates `start.sh`)
- `install-termux.sh` — Android via Termux (pkg install, pg_ctl setup, creates start/stop scripts)
- `install-geocodebr-termux.sh` — Standalone installer for the **GeocodeR BR** microservice on Termux. Uses `proot-distro` Ubuntu Noble + R 4.5 from CRAN apt repo + **r-universe ARM64 prebuilt binaries** (arrow, duckdb, sf, plumber, geocodebr) — zero C++ compilation, ~10–25 min total
- `install.ps1` — Windows PowerShell (winget/chocolatey, creates `start.bat`)
- `docker-compose.yml` + `Dockerfile.api` + `Dockerfile.web` + `nginx.conf` — Docker full-stack deployment

## GitHub Project Structure

- `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md` + `config.yml` — issue forms
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template with Conventional Commits checklist
- `.github/dependabot.yml` — weekly npm + monthly github-actions updates, grouped by ecosystem
- `.github/workflows/ci.yml` — CI: typecheck + build + shellcheck on push/PR to main
- `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` · `SECURITY.md` · `LICENSE` (MIT)
- Banner image: `docs/banner.png` (README) and `artifacts/viax-scout/public/github-banner.png` (Docs page) — both share the same source asset

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Engineering Notes

- `artifacts/viax-scout/vite.config.ts` defaults `PORT=5173` and `BASE_PATH=/` during `vite build` so production builds work in CI without env vars; `vite dev`/`vite preview` still require `PORT` explicitly.
- `artifacts/api-server/src/lib/condo-maps/index.ts` — `cursor` is explicitly typed as `{x:number;y:number}` so the nearest-neighbor loop can hold either `condo.entrada` or a `Quadra` without TS inference clashes.
- Mobile version is the single source of truth in `artifacts/viax-mobile/app.json` (`1.1.0`); `package.json` is kept in sync because the GitHub release tag reads it.
- CI (`.github/workflows/ci.yml`) runs typecheck + builds **both** api-server and viax-scout on every push/PR to `main`.
- Mobile release (`.github/workflows/mobile-release.yml`) requires `EXPO_TOKEN` GitHub secret and is independent of CI.
