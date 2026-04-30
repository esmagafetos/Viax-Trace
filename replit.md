# ViaX:Trace

## Overview

Full SaaS application for validating delivery route XLSX/CSV files against GPS coordinates.
pnpm workspace monorepo with React+Vite web frontend, Express 5 API backend, and Flutter Android app.

**Production backend:** `https://viax-trace-api.onrender.com` (Render Web Service + managed Postgres 16, deployed from `render.yaml` blueprint with `Dockerfile.api`). The Flutter app ships with this URL hardcoded — no in-app server-config flow, no Termux backend story for end users. Termux/self-host paths still exist for developers (see `install-geocodebr-termux.sh`).

**GeocodeR BR microservice (April 2026):** `artifacts/geocodebr-service` is wired into the same `render.yaml` blueprint as a **private service** (`type: pserv`, plan `starter`) named `viax-trace-geocodebr`, listening on port 8002, reachable only inside the Render private network. The API service gets `GEOCODEBR_URL=http://viax-trace-geocodebr:8002` injected automatically — no manual env-var config required. `start.R` reads `$PORT` (Render-injected) before falling back to `GEOCODEBR_PORT`. Note: pserv requires a paid plan (no free tier), and the CNEFE cache at `/root/.cache` does not persist between deploys unless a persistent disk is added.

**Replit dev:** Built-in Postgres provisioned (`DATABASE_URL` set automatically). API on port 8080, web on port 5000 (the only externally-visible dev port). Workflow `Start application` runs both in parallel.

**April 2026 cleanup:** README/COMECE-AQUI rewritten with professional tone (no emojis, screenshots removed). Settings pages (web + mobile) no longer push the Termux self-host path; geocodebr instance card now says "instância oficial em breve". `.github/workflows/mobile-release.yml` defaults `API_BASE` to the Render URL (was `viax-scout.replit.app`) and renames release artifacts from `viax-scout-*` to `viax-trace-*`. Android `network_security_config.xml` tightened: cleartext denied globally, allowed only for `localhost` / `127.0.0.1` / `10.0.2.2` (Android emulator → host loopback) for local dev.

**GitHub identity (April 29, 2026):** account renamed `esmagafetos` → `ViaXTrace` and the project repo moved to **`ViaXTrace/Viax-Trace`** (https://github.com/ViaXTrace/Viax-Trace). All in-app links (web Settings, mobile settings, install scripts, README, CONTRIBUTING, SECURITY, COMECE-AQUI, docker-compose comment, viax_logo widget) now point to the new namespace. Local artifact directory names (`artifacts/viax-scout/`, `artifacts/viax-mobile/`) remain unchanged — only repo URLs and display labels were updated.

## Project

**ViaX:Trace** (v8.0) — Brazilian Portuguese SaaS logistics auditing platform.
- Auth: session-based (express-session + bcryptjs)
- Design: warm amber/orange→purple gradient palette (`#d4521a` → `#9333ea` accent), Poppins font, glassmorphism blur, 14px radius cards
- UI language: Brazilian Portuguese throughout
- Features: Login/Register, Dashboard stats, Route Processing (XLSX/CSV upload via SSE), History, 6-tab Settings (Perfil + Financeiro + Instâncias + Parser + Tolerância + **Sobre**)
- Mobile-first design: frosted-glass header, horizontal mobile nav, responsive grids, hide-mobile/show-mobile CSS helpers
- Profile dropdown in nav: Configurações / Perfil / Sair + avatar picker from device gallery
- Geocoder: coordinate-first validation — reverse geocode spreadsheet GPS with **Photon (primary) → Overpass API (secondary, multi-mirror, radius 40m→90m) → Nominatim (last resort)**; forward geocoding also Photon-first. Google Maps available as premium option via `instanceMode: "googlemaps"`.
- **Parser hardening (Apr 2026)**: Audited against real route files in `attached_assets/*.xlsx` (5 routes, 354 rows, 199 unique addresses) using `scripts/src/geocoder-bench.ts` and the regression suite `artifacts/api-server/src/lib/geocoder.test.ts` (15 tests, run via `pnpm exec tsx --test ...`). Fixed: `normalizarAcronimos` Quadra/Lote regex (`\b` between digit and letter is NOT a word boundary in JS), `limparNomeLogradouro` over-aggressive trailing-digit strip on numbered streets ("Rua Apolo 21" preserved), `extrairLogradouroPrincipal` 2-pass with numeric-street fallback ("Avenida 1"), `extrairPOI` requires logradouro keyword + strips city/UF/CEP tail, `extrairNumero` strips casa/lote/quadra prefixes, `removerAnotacoesMotorista` no longer truncates at frente/fundos/esquina. Added: `via_intersecao` (esquina capture, used as fallback match in `verificarNuance`), `bairro_limpo` (strips `(Tamoios)` etc — used in `montarQueryBusca` for forward geocoding), `poi_estruturado` field, inline travessa split ("Rua X travessa B" → rua + via_secundaria), `is_rodovia` set when `km_rodovia` present even without `Rod` keyword. Bench output: `.local/geocoder-bench/{parser-sweep,live-pipeline}.json`.
- Process: SSE-based XLSX/CSV upload (fetch + ReadableStream), max 500 addresses, 10MB file limit
- Avatar: stored as base64 data URL in DB, uploaded via multipart POST
- **Mobile (Flutter, native Android + iOS)**: 1:1 native mirror of the web. The previous Expo/React Native app was deleted and replaced with a Flutter app at `artifacts/viax-mobile/`. Same routes (Setup, Login, Register, Dashboard, Process, Tool, History, Settings, Docs), same color/typography tokens, same SSE flow.

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
3. **ViaX Mobile** (`artifacts/viax-mobile`, v1.0.0) — **Native Flutter app** for Android + iOS (April 2026). The previous Expo/React Native scaffold was deleted entirely and replaced with a clean Flutter project. Stack: Flutter stable + Dart 3.4 + `go_router` (routing) + `provider` (state) + `dio` + `cookie_jar` (session cookie auth, mirrors web `credentials: include`) + `dio_cookie_manager` + raw `http` for SSE multipart streaming + `fl_chart` (financial line chart) + `file_picker` (xlsx/csv) + `image_picker` (avatar gallery) + `google_fonts` (Poppins) + `intl`.
   - **Screens** (`lib/screens/`): `setup.dart` (welcome — Entrar / Criar conta), `login.dart`, `register.dart`, `dashboard.dart`, `process.dart`, `tool.dart`, `history.dart`, `settings.dart` (6 tabs: Perfil, Financeiro, Instâncias, Parser, Tolerância, Sobre), `docs.dart` (5 sections + FAQ + GitHubBanner + quick links).
   - **Routing** (`lib/router.dart`): `go_router` with redirect guards — public (`/setup`, `/login`, `/register`) vs protected (`/dashboard`, `/process`, `/tool`, `/history`, `/settings`, `/docs`).
   - **API** (`lib/api/api_client.dart`): Dio + `PersistCookieJar` storing the Express session cookie under app-documents/.viax_cookies. All endpoints typed: auth/users/dashboard/analyses/condominium.
   - **SSE** (`lib/api/sse_client.dart`): hand-rolled multipart POST that streams `text/event-stream`, parses `event:` / `data:` lines split by `\n\n`, yields `SseEvent` instances. Used by Process + Tool screens for `/api/process/upload` and `/api/condominium/process`.
   - **Theme** (`lib/theme/theme.dart`): exact CSS-variable mirror — light/dark, Poppins via `google_fonts`, accent `#d4521a` (light) / `#e8703a` (dark), ok `#1a7a4a` (light) / `#2ea863` (dark), 14px card radii, pill buttons. `extension AppPalette on BuildContext` for ergonomic `context.text` / `context.accent` etc.
   - **Widgets** (`lib/widgets/`): `AppLayout` (top bar with `ViaXLogo` + avatar PopupMenu, bottom 5-tab nav: Painel/Processar/Condomínios/Histórico/Docs), `CardSection`/`CardHeaderLabel`, `StatTile`, `AppSpinner`, `ViaXLogo`, `GitHubBanner`, `showToast`.
   - **State** (`lib/state/`): `AuthProvider` (bootstrap → `/auth/me`, login/register/logout), `SettingsProvider` (load/save user settings).
   - **API base** is hardcoded to `https://viax-trace-api.onrender.com` in `lib/api/api_client.dart` (constant `kApiBase`). Can be overridden at build time via `--dart-define=API_BASE=...` for staging or self-hosted deployments — never asked from the end user. The previous in-app server-config flow (`/server-setup` screen + `ServerConfig` state + Servidor tab in Settings) was removed in April 2026 once the official Render-hosted backend went live.
   - **Android cleartext** for the LAN backend: `android-overrides/app/src/main/res/xml/network_security_config.xml` whitelists `localhost`, `127.0.0.1`, `10.0.2.2`, `*.local` and the RFC 1918 ranges (`10/8`, `172.16/12`, `192.168/16`); HTTPS-only everywhere else. Applied at CI time by `scripts/apply-android-overrides.sh` (copies the XML, patches `<application>` with `android:networkSecurityConfig` + `android:usesCleartextTraffic`, sets `android:label="ViaX:Trace"`).
   - **App icon / launcher**: brand-aligned SVG masters at `assets/icon/app_icon.svg` (full mark) and `assets/icon/app_icon_foreground.svg` (adaptive foreground), rasterized to 1024×1024 PNGs. `flutter_launcher_icons` config in `pubspec.yaml` generates Android (legacy + adaptive `ic_launcher` with `#ffffff` background) and iOS icons; CI runs `dart run flutter_launcher_icons` after `flutter pub get`.
   - **Android workflow** (`.github/workflows/mobile-release.yml`): Ubuntu + Java 17 + `subosito/flutter-action@v2` (stable). Runs `flutter create --platforms=android,ios .` to regenerate platform scaffolding from pubspec, then `bash scripts/apply-android-overrides.sh` to inject the cleartext network config and label, `dart run flutter_launcher_icons` to generate icons, then `flutter build apk --release` (universal + split-per-abi). Produces tag `mobile-v<version>-<sha>` and attaches universal/arm64-v8a/armeabi-v7a/x86_64 APKs to a GitHub Release.
   - **iOS workflow** (`.github/workflows/mobile-ios.yml`): macos-14 runner + `flutter build ios --release --no-codesign`, packages an unsigned `.ipa` (zips Payload/Runner.app) and uploads as workflow artifact (no signing → no Apple Developer account required).
   - **Old EAS Update workflow** (`mobile-ota.yml`) is kept as a no-op stub (cannot be deleted by the agent), with a `workflow_dispatch`-only trigger that prints a deprecation notice.
   - **Background processing (April 2026)**: the legacy "Executar em segundo plano" toggle was removed from `process.dart` and `tool.dart`. Every job now runs through a true Android foreground service via the `flutter_foreground_task` package (`lib/state/foreground_processing.dart`), which `processing_service.dart` starts/updates/stops alongside the SSE stream — the user sees the live step text in a persistent system notification. Before the first job, the app requests POST_NOTIFICATIONS and opens the system "ignore battery optimization" screen so the OS won't kill the service. `apply-android-overrides.sh` injects the matching permissions (FOREGROUND_SERVICE / FOREGROUND_SERVICE_DATA_SYNC / POST_NOTIFICATIONS / WAKE_LOCK / REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) and the service declaration into the generated AndroidManifest.
   - **History 3-day retention + detail view**: `GET /api/analyses` and `/analyses/:id` filter rows older than 3 days; `analysis_detail.dart` (route `/history/:id`) renders the saved `results` JSON with the same stat-tile + filter UI as the live processing screen, and history rows are tappable with an "expira em N dias" badge.

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
- **Mobile**: Flutter (stable) + Dart 3.4, native Android + iOS (`artifacts/viax-mobile`)
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

## Installers / Deploy artifacts (root of repo)

- `render.yaml` — Render Blueprint: managed Postgres 16 + Web Service Docker, health check `/api/healthz`, autoDeploy from `main`, generated `SESSION_SECRET`, optional API keys with `sync: false`. Source of truth for the production backend at `https://viax-trace-api.onrender.com`.
- `Dockerfile.api` — Multi-stage Docker image used by Render (corepack pnpm 10.26.1; runs `pnpm --filter @workspace/db run push` then starts the bundled API on container boot).
- `docker-compose.yml` + `Dockerfile.api` + `Dockerfile.web` + `nginx.conf` — Self-host full-stack deployment (web + API + Postgres locally).
- `install.sh` — Linux & macOS self-host (auto-installs Node, pnpm, PostgreSQL, configures DB, builds, creates `start.sh`).
- `install.ps1` — Windows PowerShell self-host (winget/chocolatey, creates `start.bat`).
- `install-geocodebr-termux.sh` — Standalone installer for the **GeocodeR BR** microservice on Termux. Uses `proot-distro` Ubuntu Noble + R 4.5 from CRAN apt repo + **r-universe ARM64 prebuilt binaries** (arrow, duckdb, sf, plumber, geocodebr) — zero C++ compilation, ~10–25 min total. Kept while geocodebr deployment is being designed (next milestone).

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
