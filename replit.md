# ViaX: System

## Overview

Full SaaS web application for validating delivery route XLSX/CSV files against OpenStreetMap/Nominatim.
pnpm workspace monorepo with React+Vite frontend and Express API backend.

## Project

**ViaX: System** (v8.0) — Brazilian Portuguese SaaS route analysis tool.
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

- **Logo mark**: "V-route mark" — two filled waypoint dots at top connected by lines to a validation reticle (ring + crosshair) at the apex; gradient background orange→purple
- **Header tagline**: "v8.0" in accent color (replaced "Validação de Rotas")
- **Color gradient**: `linear-gradient(145deg, #D4521A 0%, #9333ea 100%)`

## Artifacts

1. **API Server** (`artifacts/api-server`) — Express 5, port 8080
   - Routes: `/api/auth/*`, `/api/users/*`, `/api/analyses/*`, `/api/dashboard/*`, `/api/process/upload`
   - `lib/geocoder.ts` — address parser + coordinate-first Photon/Overpass/Nominatim/BrasilAPI/Google Maps validation pipeline
2. **ViaX Scout** (`artifacts/viax-scout`) — React+Vite frontend, port 5173
   - Proxy: `/api/*` → `http://localhost:8080` (Vite proxy config)
   - Pages: Login, Register, Setup, Dashboard, Process, History, Settings

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Frontend**: React 19, Vite 7, TanStack Query, Wouter router, Tailwind CSS v4

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
- `install.ps1` — Windows PowerShell (winget/chocolatey, creates `start.bat`)
- `docker-compose.yml` + `Dockerfile.api` + `Dockerfile.web` + `nginx.conf` — Docker full-stack deployment

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
