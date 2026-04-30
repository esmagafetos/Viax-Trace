# ViaX:Trace

## Overview
ViaX:Trace is a full SaaS logistics auditing platform for validating delivery route XLSX/CSV files against GPS coordinates. It is a pnpm workspace monorepo comprising a React+Vite web frontend, an Express 5 API backend, and a Flutter Android app. The platform's core purpose is to provide a robust solution for logistics companies to audit and verify their delivery routes, ensuring accuracy and efficiency in their operations.

## User Preferences
I prefer clear, concise explanations and a direct communication style. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. Ensure all explanations are in Brazilian Portuguese. I prefer to maintain the current design language with warm amber/orange to purple gradients and Poppins font.

## System Architecture
ViaX:Trace employs a monorepo structure managed by pnpm workspaces. The system is designed for a mobile-first experience, offering a consistent UI/UX across both web and native mobile platforms.

**UI/UX Decisions:**
- **Design Language:** Consistent warm amber/orange to purple gradient palette (`#d4521a` → `#9333ea` accent), Poppins font, glassmorphism blur effects, and 14px radius cards.
- **Responsiveness:** Mobile-first design with a frosted-glass header, horizontal mobile navigation, responsive grids, and CSS helpers for conditional element visibility.
- **Branding:** "ViaX:Trace" brand name, with a distinct logo (`ViaXLogo`, `LogoIcon`, `AppIcon`) and a tagline "AUDITORIA DE ROTAS".

**Technical Implementations & Features:**
- **Authentication:** Session-based using `express-session` and `bcryptjs`.
- **Route Processing:** XLSX/CSV upload via Server-Sent Events (SSE) with a limit of 500 addresses and 10MB file size.
- **Geocoder Pipeline:**
    - Coordinate-first validation: Photon (primary) → Overpass API (secondary, multi-mirror, radius 40m→90m) → Nominatim (last resort).
    - Forward geocoding is Photon-first.
    - Premium Google Maps option available.
    - Advanced parser hardening and nuance auditing (`geocoder.ts`, `process.ts`) for improved address matching accuracy, including adaptive tolerance, quadra/lote parsing, compound address detection, duplicate GPS deduplication, and homonym grouping.
- **Data Retention:** History feature retains processed analysis data for 3 days, with detailed views available.
- **Avatar Management:** User avatars are stored as base64 data URLs in the database.
- **Mobile Application:** A native Flutter application (`artifacts/viax-mobile`) mirrors the web frontend's functionality, UI, and SSE processing flow. It includes support for Android foreground services for background processing, **local notifications fired on processing completion** (success/error) that deep-link to `/history/:id` (or `/history` for the list, or the original returnPath for non-process kinds) via `flutter_local_notifications` + a global `GoRouter` reference kept in `CompletionNotifications.router`, and adheres to strict network security configurations.
- **Geocoder false-positive guard (Apr 2026):** The "GPS within tolerance ⇒ pass" shortcut for `is_comercio` and `is_condominio` now requires either similarity ≥ `MIN_SIMILARIDADE_PASS_GPS` (0.15) OR strong contextual confirmation (recognizable POI / quadra+lote both present). Without this, addresses where Photon/Nominatim returned a totally different nearby street were silently approved — typical in Brazilian loteamentos where OSM only maps the trunk avenue. Now those cases emit an explicit nuance with the two diverging street names.
- **GeocodeR BR self-host on Android:** `install-geocodebr-termux.sh` + generated `start-geocodebr.sh` mitigate the four known Termux 2025/26 killers — Phantom Process Killer (Android 12+, requires one-time ADB toggle), Doze/wake lock (auto-acquired via `termux-wake-lock` if Termux:API present), proot-distro DNS reset (issue #264, re-applied on every start), and battery optimization. Optional autostart configured via Termux:Boot. Full operator guide at `docs/TERMUX-GEOCODEBR.md`.
- **GeocodeR BR start.R wd fix (Apr 2026):** `pr("plumber.R")` resolves relative to the working directory; calling `Rscript /root/viax-geocodebr/start.R` from `/root` (proot default) crashed with `File does not exist: plumber.R`. Fixed in two layers: (1) `start.R` now self-detects its directory via `commandArgs(--file=)` and `setwd()` before `pr(...)`; (2) generated `start-geocodebr.sh` does `cd /root/viax-geocodebr` before `Rscript`.
- **HF Space `viaxgeocoder` build fix (Apr 30 2026):** Space was stuck in `BUILD_ERROR` because `rocker/r-ver:4.4.1` ships with a P3M snapshot that predates `geocodebr` and `duckspatial` in CRAN — `library(geocodebr)` failed with `package 'geocodebr' is not available for this version of R`. Bumped Dockerfile to `rocker/r-ver:4.5.1` (snapshot includes `geocodebr 0.3.0`, `enderecobr 0.4.1`) and slimmed install list to just `plumber + future + geocodebr` (deps pulled transitively). Build now goes BUILDING→APP_STARTING→RUNNING in ~2:50 min.
- **HF Space wired into apps (Apr 30 2026):** `artifacts/api-server/src/lib/geocoder.ts` now defines `DEFAULT_GEOCODEBR_URL = "https://viaxtrace-viaxgeocoder.hf.space"` and helpers `geocodebrAuthHeaders()` (sends `Authorization: Bearer $GEOCODEBR_HF_TOKEN` + `X-API-Key: $GEOCODEBR_API_KEY`) and `httpGetWithHeaders()`. Resolution order for the URL: explicit arg → `GEOCODEBR_URL` env → default. Same default+auth pattern was applied to `/api/diag` and `/api/diag/providers` in `routes/health.ts` (provider label renamed to "GeocodeR BR (hospedado)"). The manual URL input was removed from both `viax-scout/src/pages/Settings.tsx` and `viax-mobile/lib/screens/settings.dart` — selecting `geocodebr` mode now shows an info card explaining the endpoint is hosted by ViaX:Trace; the `geocodebrUrl` column remains in the DB schema for back-compat. Validated: `curl /api/diag` returns `{geocodebr:{configured:true,reachable:true,status:200}}`.

**System Design Choices:**
- **Monorepo:** Facilitates code sharing and consistent development across frontend, backend, and mobile applications.
- **Microservice Integration:** GeocodeR BR microservice (R + Plumber) is integrated as a private Render service for specialized geocoding.
- **Containerization:** Docker for API and web services, with `render.yaml` for Render deployment and `docker-compose.yml` for local self-hosting.
- **Database:** PostgreSQL with Drizzle ORM.
- **API Definition:** OpenAPI specification (`lib/api-spec/openapi.yaml`) with Orval for client code generation.

## External Dependencies
- **Production Backend Host:** Render Web Service (for API and GeocodeR BR microservice)
- **Database:** PostgreSQL (managed by Render for production, built-in Replit Postgres for dev)
- **Geocoder Services:**
    - Photon
    - Overpass API
    - Nominatim
    - GeocodeR BR (custom R-based microservice)
    - Google Maps API (premium option)
- **Development Tools:**
    - Node.js 24
    - pnpm 10.26.1
    - TypeScript 5.9
    - Vite 7
- **Frontend Libraries:**
    - React 19.1.0
    - TanStack Query
    - Wouter router
    - Tailwind CSS v4
    - Google Fonts (Poppins)
- **Mobile Libraries (Flutter):**
    - Dart 3.4
    - `go_router`
    - `provider`
    - `dio`, `cookie_jar`, `dio_cookie_manager`
    - `flutter_foreground_task` (background SSE)
    - `flutter_local_notifications` + `timezone` (completion alerts)
    - `fl_chart`
    - `file_picker`
    - `image_picker`
    - `google_fonts`
    - `intl`
    - `flutter_foreground_task`
- **Backend Libraries:**
    - Express 5
    - Drizzle ORM
    - Zod, `drizzle-zod`
    - `express-session`
    - `bcryptjs`
- **CI/CD & Deployment:**
    - GitHub Actions
    - Docker
    - `render.yaml` (Render Blueprint)