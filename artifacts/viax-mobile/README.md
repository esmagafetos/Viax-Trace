# ViaX:Trace Mobile (Android)

Aplicativo Android nativo (Expo / React Native) com a mesma identidade visual e fluxo do ViaX:Trace web.

## Estrutura

```
app/
  _layout.tsx           # Provedores raiz (auth, query, fontes) + init API URL
  index.tsx             # Login (mostra "Configurar servidor" se URL não estiver definida)
  register.tsx          # Cadastro
  setup.tsx             # NOVO — Configuração inicial (servidor + parser + motor + tolerância)
  (tabs)/_layout.tsx    # Bottom tabs
  (tabs)/dashboard.tsx
  (tabs)/process.tsx    # Upload XLSX/CSV via SSE
  (tabs)/history.tsx
  (tabs)/settings.tsx   # Atalhos para editar API server e demais ajustes
components/             # UI compartilhada (Card, Button, Input, etc.)
constants/colors.ts     # Tokens de cor (light/dark) sincronizados com viax-scout
hooks/useColors.ts
lib/api.ts              # Cliente HTTP + URL dinâmica + sessão (expo-secure-store)
lib/auth.tsx            # AuthContext
```

## Fluxo de configuração da API

A URL do backend é **definida pelo próprio usuário dentro do app** e armazenada de forma segura em
`expo-secure-store`. Não é mais necessário fazer build com `EXPO_PUBLIC_API_URL` fixo.

1. Após instalar o APK, o app detecta que não há servidor configurado.
2. A tela de login mostra o card "Configurar servidor" → leva à página **Setup**.
3. Em **Setup → Configurar servidor** o usuário segue 5 passos para instalar o ViaX:Trace
   no próprio celular via **Termux** e cola a URL gerada (ex.: `http://192.168.0.10:8080`)
   no campo **API Server**.
4. O botão **Testar conexão** valida o endpoint `/api/healthz`.
5. **Salvar** persiste a URL — todas as requisições passam a usar esse host.

> Para sobrescrever via build (opcional), use `EXPO_PUBLIC_API_URL` no momento do `eas build`.

## Adaptação vs versão web

Toda a UX/UI espelha o `viax-scout` (cores, raio, Poppins, fluxo Login → Cadastro → **Setup** → Painel).
A única adaptação mobile é a seção **Configurar servidor** dentro de Setup — necessária porque o
backend roda no próprio celular do usuário.

## Build local (dev)

```bash
pnpm --filter @workspace/viax-mobile run start
```

## Build de release (APK)

O build é feito **na nuvem do Expo (EAS)** via GitHub Actions:

1. Faça commit/push para `main`.
2. O workflow `.github/workflows/mobile-release.yml` dispara automaticamente.
3. EAS gera o APK e o workflow publica um **GitHub Release** com o `.apk` anexado.

Pode-se também disparar manualmente via *workflow_dispatch* escolhendo `preview` ou `production`.

### Pré-requisitos (uma vez)

- Secret `EXPO_TOKEN` no GitHub Actions.
- O `eas.json` define os profiles `development`, `preview` (APK debuggable) e `production` (APK release com `autoIncrement` de versionCode).
- O `app.json` já contém o `extra.eas.projectId`.

## Permissões Android

- `INTERNET`, `ACCESS_NETWORK_STATE` — chamadas HTTP ao servidor (incluindo IPs de LAN do Termux).
- `READ_EXTERNAL_STORAGE` — selecionar planilhas XLSX/CSV.
- `usesCleartextTraffic: true` — necessário para acessar `http://` em IPs locais (Termux).

## Notas

- Padrão de cores e raio idênticos ao web (`viax-scout`).
- Sessão persistida com `expo-secure-store` (cookie `connect.sid`).
- API base URL persistida com `expo-secure-store` e carregada antes do primeiro render.
- Upload via SSE (Server-Sent Events) consumindo o mesmo endpoint do web: `POST /api/process/upload`.
