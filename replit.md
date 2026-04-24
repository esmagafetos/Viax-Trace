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
- **Mobile (Expo SDK 54, expo-router)**: paridade 1:1 com a web — Docs page completa, Toast global (`<ToastProvider>` em `_layout.tsx`), primitivos `Progress`/`Skeleton`/`Accordion`/`SectionCard`, tokens `okDim`/`destructive`/`Shadows`, export CSV real (expo-file-system/legacy + expo-sharing) em Process e Tool, avatar upload via `expo-image-picker` → multipart `/api/users/avatar`

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
3. **ViaX Mobile** (`artifacts/viax-mobile`) — Expo (React Native) Android app, brand-matched to web. **EAS-build-clean** (expo-doctor 17/17): pinned to SDK-54 versions `expo-file-system@~19.0.21`, `expo-image-picker@~17.0.10`, `expo-sharing@~14.0.8`, `@react-native-community/datetimepicker@8.4.4` to avoid duplicate native modules and "Major version mismatches" errors that previously blocked EAS APK builds.
   - Stack: Expo SDK 54 + expo-router (file-based routing) + TanStack Query + Poppins fonts + `expo-linear-gradient` + `react-native-svg`
   - Screens: Login, Register, **Setup**, Tabs (Dashboard, Processar, **Ferramenta**, Histórico, Settings)
   - **AppHeader 1:1 com a web**: linha 1 = ViaX:Trace + theme toggle + avatar (com **dropdown modal** de perfil mostrando nome/email + Configurações + **Perfil** (deep-link `?tab=perfil`) + Documentação + Sair); linha 2 = horizontal pill nav (Dashboard / Processar / Ferramenta / Histórico) com ícones Ionicons + estado ativo accent. Bottom tab bar do expo-router está oculta (`tabBarStyle: { display: 'none' }`). A tela de Settings lê `useLocalSearchParams<{ tab? }>()` para abrir direto na aba pedida.
   - **Hero do Dashboard espelha o web**: `expo-linear-gradient` (135deg, 4 stops `#1a0e08 → #2d1408 → #3d1c0c → #1f0a18`), 2 blobs com `react-native-svg` `RadialGradient`, paths tracejados decorativos no SVG, layout horizontal com logo+divisor+saudação à esquerda e botão "Nova Análise" + close à direita.
   - **Aba Ferramenta** (`app/(tabs)/tool.tsx`) reescrita a partir de `viax-scout/src/pages/Tool.tsx` — seletor de condomínio em cards, dropzone com `expo-document-picker`, processamento SSE (`fetch + ReadableStream`), tiles de estatísticas com strip colorida, chips de filtro, lista de sequência logística colorida por classificação.
   - **Visual parity with web** — same warm amber palette (`#d4521a`), Poppins typography, 14px-radius cards with shadow, 99px pill buttons, uppercase letter-spaced labels, accent focus ring on inputs, eye toggle on PasswordInput, 4-segment PasswordStrength meter, floating top-right ThemeToggle pill
   - Theme: `lib/theme.tsx` ThemeProvider (light/dark) persisted in `expo-secure-store` (key `viax_theme_mode`); `useColors()` reads from it
   - Brand mark: **vector SVG** via `react-native-svg` (port 1:1 of web's `<LogoIcon />` — path + 3 circles), exposed by `components/ViaXLogo.tsx` as `LogoIcon`, `LogoMark`, `AppIcon`, `ViaXLogo`, `FlatLogo`. **No more raster screenshots** — the previous showcase PNGs (1920×1080) were removed in v1.2.0.
   - Responsiveness: `lib/responsive.ts` exposes `useResponsive()` with mobile-first scaling helpers (`rs(size)` clamps a 0.85-1.35× ratio against base 375px width) and breakpoints (`xs`/`sm`/`md`/`lg`) + dynamic stat-grid column count (2/3/4). All central UI helpers in `components/ui.tsx` (Card, CardHeader, CardBody, H1/H2, Muted, Label, Input, Button, Pill, etc.) and `AppHeader` + `dashboard.tsx` are scaled via `rs()`, so process/history/settings inherit responsive sizing automatically.
   - **Safe-area handling**: `AppHeader` itself absorbs `useSafeAreaInsets().top` for its `paddingTop` and computes the profile dropdown anchor as `insets.top + 52 + 6`, so the brand row never sits under the OS status bar (battery/wifi) regardless of device. Tab screens (`dashboard`, `process`, `tool`, `history`, `settings`) wrap with `SafeAreaView edges={['left','right']}` only — top padding is owned by `AppHeader` to avoid double-inset.
   - **EAS Android build** (`.github/workflows/mobile-release.yml`): `expo-linear-gradient` is pinned to `~15.0.8` (SDK 54-compatible). The CI step `npx expo-doctor@latest` runs before `eas build` and would previously fail with a major version mismatch (`^55.0.13` was an erroneously-published package), aborting the workflow before the JS bundling phase.
   - Shared UI primitives in `components/ui.tsx`: `Card`, `CardHeader`, `CardBody`, `H1/H2`, `Label`, `Input`, `PasswordInput`, `PasswordStrength`, `Button` (primary/ghost/dark, optional `iconRight`), `Pill`, `ThemeToggle`, `FieldError`
   - **Mirrors the web Setup flow** (parser mode + geocoding instance + tolerance preset chips) and adds a mobile-only **"Configurar servidor"** section with step-by-step Termux install instructions, copyable command blocks, and a validated **API Server** URL field
   - Register: client-side validators (email regex, password 8+/letra/número), live PasswordStrength bar, sends `{ name, email, password, birthDate }` matching the API's `RegisterBody` schema
   - Auth: session cookie persisted in `expo-secure-store` (key `viax_session_cookie`); login uses `{ email, password }` (matches API's `LoginBody`)
   - Build: EAS Build profiles `development`, `preview` (APK debuggable) and `production` (APK release with `autoIncrement` of `versionCode`)
   - Release: GitHub Actions workflow `.github/workflows/mobile-release.yml` runs typecheck then builds APK on EAS and publishes a GitHub Release with the APK asset (uses `EXPO_TOKEN` secret). Supports `workflow_dispatch` with profile choice.
   - Android permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE`; `usesCleartextTraffic: true` so it can talk to local Termux servers over `http://` LAN IPs.
   - **Authenticated screens (Wave 2)** mirror the web 1:1 — shared `components/AppHeader.tsx` (logo + theme toggle + avatar) above every tab; Dashboard with HeroBanner gradient, 5-stat tile grid, FinancialPanel (receita/despesas/lucro + meta progress + 20-day MiniBarChart), recent analyses list; History with paginated list + delete confirmation; Settings as full 6-tab (Perfil / Financeiro / Instâncias / Parser / Tolerância / Sobre) using `lib/format.ts` helpers (`formatBRL`, `formatPct`, `formatMs`, `formatDate`).
   - **Process screen (Wave 3, full rewrite)** in `app/(tabs)/process.tsx` mirrors web `Process.tsx` 1:1: config warning banner (queries `/api/users/settings` and warns on `instanceMode: 'googlemaps'` without API key, or `'geocodebr'` requiring local microservice on port 8002); upload card with `expo-document-picker` dropzone (XLSX/CSV ≤10MB); dark "Iniciar" button (text-on-bg with magnifying-glass icon); animated steps list during processing (SSE `event:`/`data:` parsing via `fetch + ReadableStream`); 6 stat tiles (Total / Nuances / OK / Taxa Nuance / Geocode OK / Tempo) with colored bottom strip; instance badge ("Processado via …"); **AnalyticsCard with `react-native-svg` donut** (OK vs Nuance two-arc), bar chart for `tipo_endereco` distribution (rodovia/comércio/via_secundaria/avenida_extensa/residencial), pill chips for "Nuances por Tipo"; filter chips Todos/Nuances/OK + Exportar CSV (mobile fallback `Alert`); per-row result cards with linha pill, similarity %, similarity bar, motivo italic.
   - **Wave 4 (polish & resilience)** — global `<OfflineBanner />` mounted in `_layout.tsx` listens via `@react-native-community/netinfo@11.4.1` and animates a red top banner when `isConnected === false || isInternetReachable === false` (treats `null`/unknown as online to avoid cold-start flashes); haptic feedback (`expo-haptics`) wired at user-action peaks: `selectionAsync` on theme toggle and on confirmed file pick (Process + Tool), `impactAsync(Medium)` on "Iniciar" tap, `impactAsync(Light)` when opening the delete confirm, and `notificationAsync(Warning)` at the moment of destructive deletion. All login/register/setup screens are already wrapped in `KeyboardAvoidingView` (iOS `padding`, Android `undefined`) with `keyboardShouldPersistTaps="handled"`. Theme toggle persists via `AsyncStorage` (`viax_theme_mode`, with one-shot SecureStore migration) and pushes the resolved mode into `nativewind.colorScheme` so `dark:` variants resolve from the explicit user choice instead of OS preference.
   - **Wave 5 (production hardening)** — five upgrades that take the app from "1:1 mirror" to "production-grade":
     1. **Root `<ErrorBoundary>`** (`components/ErrorBoundary.tsx`) wraps everything inside `_layout.tsx`. Render-phase exceptions hit a branded fallback with the error name+message, the first 10 stack frames (selectable for copy), and a "Recarregar" button that resets the boundary. Errors are forwarded to `reportError()` automatically.
     2. **Sentry** (`@sentry/react-native@8.8.0`) wired conditionally on `EXPO_PUBLIC_SENTRY_DSN`. The wrapper in `lib/sentry.ts` (`initSentry`, `reportError`, `identifyUser`) is a hard no-op when the DSN is unset — the app builds and runs without a Sentry account. The Expo config plugin (`@sentry/react-native/expo`) is registered in `app.json` so EAS auto-uploads source maps when `SENTRY_AUTH_TOKEN` is provided as an EAS secret. `AuthProvider` calls `identifyUser` on login/logout for breadcrumb attribution.
     3. **Typed errors + 401 interceptor in `lib/api.ts`** — exports `NetworkError` (fetch rejection: offline/DNS/refused, with PT-BR message), `HttpError` (non-2xx response with status+body), and `UnauthorizedError extends HttpError`. Calling code can `if (e instanceof NetworkError)` for offline-specific UX. A global `setUnauthorizedHandler()` registered by `AuthProvider` catches every 401 (stale session cookie etc.), clears `SecureStore`, resets the user to `null`, and `router.replace('/')` — no more half-broken authenticated screens after a backend session expires.
     4. **`lucide-react-native` removed** — was unused (everything goes through `@expo/vector-icons` Ionicons) and had a peer-dep warning against React 19. Bundle and `expo-doctor` are cleaner.
     5. **TanStack Query offline cache** via `@tanstack/react-query-persist-client@5.100.1` + `@tanstack/query-async-storage-persister@5.100.1`. The `QueryClient` now has `gcTime: 24h` and is wrapped in `<PersistQueryClientProvider>` with an `AsyncStorage`-backed persister (key `viax_query_cache_v1`, throttled at 1s, busted at `v1`, max age 24h). Dashboard and history appear instantly on cold start — even fully offline — and `mutations.retry: 0 + networkMode: 'online'` makes user-initiated writes deterministic on flaky networks. On Android, `expo-system-ui.setBackgroundColorAsync(c.bg)` paints the root window to the active theme so the brief gap between native splash and React's first paint isn't a white flash.
   - **Wave 6 (1-day sprint: ship velocity + retention)** — three high-leverage upgrades:
     1. **EAS Update wired end-to-end** — `expo-updates@^55.0.21` installed, `app.json` configured with `runtimeVersion: { policy: "appVersion" }`, `updates.url: https://u.expo.dev/<projectId>`, `updates.checkAutomatically: ON_LOAD`, `updates.fallbackToCacheTimeout: 0` (instant boot from cached bundle, background fetch). `_layout.tsx` runs an explicit fire-and-forget `Updates.checkForUpdateAsync → fetchUpdateAsync → reloadAsync` with a 250ms defer to apply the new bundle in *this* session when one's downloaded within ~3s of mount, plus reports check failures to Sentry via `reportError(e, { source: 'eas-update-check' })`. **To ship a JS hotfix:** `cd artifacts/viax-mobile && eas update --branch production --message "fix: …"` — every running app picks it up on next launch. Bumping the `version` in `app.json` creates a new runtime channel, forcing users to download a new APK.
     2. **`expo-keep-awake@^55.0.6` no Process screen** — `useEffect` ativa wake lock só durante `isProcessing` (chave `viax-process`), libera no fim/erro/unmount. Resolve travamentos do SSE em rotas longas quando o usuário deixa o celular descansar e o Android throttla JS.
     3. **Acessibilidade nos componentes críticos** — `Button`, `ThemeToggle`, `PasswordInput` (toggle olho) ganharam `accessibilityRole`/`Label`/`Hint`/`State` (busy/disabled/checked) no nível do design system, então qualquer chamador herda. `AppHeader`: logo (link), toggle de tema (switch), avatar (button + expanded), tab pills (tab + selected), itens do dropdown (menuitem). `Process screen`: dropzone do arquivo, "Iniciar" (com hint contextual quando faltar arquivo), filter chips (com count vocalizado), botão Exportar CSV. TalkBack agora narra todos os controles principais corretamente — pré-requisito Play Store em algumas categorias.

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
