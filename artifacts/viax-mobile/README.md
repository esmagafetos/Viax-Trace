# ViaX:Trace — Mobile (Flutter)

App nativo Android/iOS que espelha 1:1 a experiência da web do **ViaX:Trace**.

Construído em Flutter — todas as telas e integrações de API replicam a versão web:
Login · Register · Dashboard · Process · Tool · History · Settings · Docs.

## Arquitetura

- **Tema:** Poppins, espelho exato das CSS variables (light + dark, accent `#d4521a`).
- **Estado:** `provider` para auth e settings.
- **Roteamento:** `go_router` com guards públicos/protegidos.
- **API:** `dio` + `cookie_jar` para auth de sessão por cookie (espelha o `credentials: include` da web).
- **SSE:** streaming via `http` cru para `/api/process/upload` e `/api/condominium/process`.
- **Charts:** `fl_chart` para o gráfico de ciclo financeiro.
- **File picking:** `file_picker` (xlsx/csv) e `image_picker` (avatar).
- **Background:** `flutter_foreground_task` mantém o processamento vivo com notificação persistente.

## Backend

A URL do backend é fixada no app — usuário final não configura nada. Padrão: o backend oficial em
`https://viax-trace-api.onrender.com`.

Para builds de desenvolvimento ou self-host, sobrescreva em build time:

```sh
flutter build apk --release --dart-define=API_BASE=https://sua-instancia.example.com
```

## Desenvolvimento local

```sh
flutter pub get

# Emulador Android apontando para a API local rodando no host:
flutter run --dart-define=API_BASE=http://10.0.2.2:8080

# Aparelho físico apontando para uma instância pública:
flutter run --dart-define=API_BASE=https://viax-trace-api.onrender.com
```

(`10.0.2.2` é o atalho do emulador Android para o `localhost` da máquina hospedeira.)

## CI

- **Android APK:** `.github/workflows/mobile-release.yml` — Ubuntu runner, sem EAS, sem cotas.
- **iOS unsigned IPA:** `.github/workflows/mobile-ios.yml` — macOS runner, `--no-codesign`.

Ambos os workflows regeneram o scaffolding de plataforma via `flutter create .` antes do build.
