# ViaX Scout

## Overview

Full SaaS web application for validating delivery route XLSX/CSV files against OpenStreetMap/Nominatim.
pnpm workspace monorepo with React+Vite frontend and Express API backend.

## Project

**ViaX Scout** — Brazilian Portuguese SaaS route analysis tool.
- Auth: session-based (express-session + bcryptjs)
- Design: warm amber/orange palette (`#d4521a` accent), Poppins font, glassmorphism blur, 14px radius cards
- UI language: Brazilian Portuguese throughout
- Features: Login/Register, Dashboard stats, Route Processing (XLSX/CSV upload via SSE), History, 4-tab Settings (Perfil + Instâncias + Parser + Tolerância)
- Mobile-first design: hamburger nav, responsive grids, hide-mobile/show-mobile CSS helpers
- Profile dropdown in nav: Configurações / Perfil / Sair + avatar picker from device gallery
- Geocoder: coordinate-first validation — reverse geocode spreadsheet GPS with Nominatim/Photon or Google Maps, compare returned official street against spreadsheet street, then use forward geocoding and BrasilAPI only as support
- Process: SSE-based XLSX/CSV upload (fetch + ReadableStream), max 500 addresses, 10MB file limit
- Avatar: stored as base64 data URL in DB, uploaded via multipart POST

## Artifacts

1. **API Server** (`artifacts/api-server`) — Express 5, port 8080
   - Routes: `/api/auth/*`, `/api/users/*`, `/api/analyses/*`, `/api/dashboard/*`, `/api/process/upload`
   - `lib/geocoder.ts` — address parser + coordinate-first Nominatim/Photon/BrasilAPI/Google Maps validation pipeline
2. **ViaX Scout** (`artifacts/viax-scout`) — React+Vite frontend
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

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
