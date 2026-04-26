# ViaX:Scout — Mobile (Flutter)

Native Android/iOS mirror of the **viax-scout** web app.

Built with Flutter — every screen and API integration mirrors the web 1:1:
Login · Register · Setup · Dashboard · Process · Tool · History · Settings · Docs.

## Architecture

- **Theme**: Poppins font, exact CSS variable mirror (light + dark, accent `#d4521a`).
- **State**: `provider` for auth and settings.
- **Routing**: `go_router` with public/protected guards.
- **API**: `dio` + `cookie_jar` for cookie-based session auth (mirrors `credentials: include`).
- **SSE**: raw `http` streaming for `/api/process/upload` and `/api/condominium/process`.
- **Charts**: `fl_chart` for the financial cycle chart.
- **File picking**: `file_picker` (xlsx/csv) and `image_picker` (avatar).

## API base URL

The API base is configurable at build time via `--dart-define`:

```sh
flutter build apk --release --dart-define=API_BASE=https://your-api.example.com
```

If not provided, defaults to `https://viax-scout.replit.app` (your Replit deployment).

## Local dev

```sh
flutter pub get
flutter run --dart-define=API_BASE=http://10.0.2.2:8080
```

(`10.0.2.2` reaches your laptop's localhost from the Android emulator.)

## CI

- **Android APK**: `.github/workflows/mobile-release.yml` — Ubuntu runner, no EAS, no quotas.
- **iOS unsigned IPA**: `.github/workflows/mobile-ios.yml` — macOS runner, `--no-codesign`.

Both regenerate platform scaffolding via `flutter create .` before building.
