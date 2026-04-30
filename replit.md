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
- **Mobile Application:** A native Flutter application (`artifacts/viax-mobile`) mirrors the web frontend's functionality, UI, and SSE processing flow. It includes support for Android foreground services for background processing and adheres to strict network security configurations.

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