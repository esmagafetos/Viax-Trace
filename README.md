<div align="center">

# ViaX:Trace

**Auditoria automatizada de rotas logísticas — XLSX/CSV vs. coordenadas GPS reais**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://viax-trace-api.onrender.com)
[![Mobile](https://img.shields.io/badge/Mobile-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://github.com/esmagafetos/Viax-Scout/releases)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Flutter](https://img.shields.io/badge/Flutter-3.24-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)

[Sobre](#sobre) · [Comece em 2 minutos](#comece-em-2-minutos) · [App Android](#app-android) · [Funcionalidades](#funcionalidades) · [Arquitetura](#arquitetura) · [Self-host](#self-host-opcional) · [Desenvolvimento](#desenvolvimento) · [Contribuindo](#contribuindo)

</div>

---

## Sobre

**ViaX:Trace** é uma plataforma SaaS de auditoria logística que valida automaticamente planilhas de rotas de entrega (XLSX/CSV) comparando os endereços registrados com as coordenadas GPS coletadas em campo.

O sistema detecta **nuances** — divergências entre o endereço informado e o ponto GPS real — e gera relatórios detalhados, ajudando gestores a identificar fraudes, erros de digitação e pontos de entrega incorretos em segundos, com resultados transmitidos em tempo real via Server-Sent Events (SSE).

```
Planilha XLSX/CSV  →  Parser de endereço  →  Geocodificação reversa  →  Comparação  →  Relatório
        ↓                      ↓                        ↓                     ↓
 Endereço + GPS          Rua extraída            Nome oficial da via     Similaridade + distância
```

### Por que existe

Operações logísticas urbanas frequentemente recebem planilhas de roteirização com endereços incorretos, GPS imprecisos ou pontos de entrega fora da quadra correta. Auditar manualmente uma rota de 200 paradas é inviável. O ViaX:Trace automatiza essa validação cruzada em segundos, com pipeline de geocodificação resiliente e métrica configurável de tolerância por conta.

### Stack resumida

- **Backend:** Express 5 + TypeScript + PostgreSQL 16 + Drizzle ORM, hospedado no Render
- **Frontend web:** React 19 + Vite 7 + Tailwind CSS 4
- **App Android:** Flutter 3.24 + Dart 3.4 (1:1 com a web)
- **Geocodificação:** BrasilAPI (CEP) + Photon + Overpass + Nominatim (OSM); GeocodeR BR (CNEFE/IBGE) e Google Maps como opcionais

### Status do projeto

| Componente | Estado | Notas |
|---|---|---|
| Backend | **Em produção** | `https://viax-trace-api.onrender.com` (Render + Postgres 16 gerenciado) |
| Frontend web | **Estável** | Self-host via Docker ou instaladores assistidos |
| App Android | **Estável** | APKs publicados em [Releases](https://github.com/esmagafetos/Viax-Scout/releases) |
| App iOS | **Beta** | Build não-assinado disponível em CI artifacts |
| GeocodeR BR (microserviço) | **Em planejamento** | Próxima etapa: hospedagem dedicada conectada ao backend |

---

## Comece em 2 minutos

Para usuários finais o caminho é direto: **baixar o app e fazer login**. Nenhuma configuração de servidor, IP ou porta é necessária — o backend oficial já vem embutido.

1. Acesse a página de [**Releases**](https://github.com/esmagafetos/Viax-Scout/releases) e baixe o `viax-trace-vX.Y.Z.apk` mais recente.
2. No Android, autorize a instalação de **fontes desconhecidas** quando solicitado.
3. Abra o app, toque em **Criar conta** ou **Entrar** — pronto.

| Quero… | Vá para |
|---|---|
| Usar agora pelo celular Android | [Releases](https://github.com/esmagafetos/Viax-Scout/releases) |
| Usar pelo navegador (web) | [Self-host — Docker](#docker-recomendado) |
| Subir minha própria instância | [Self-host opcional](#self-host-opcional) |
| Contribuir com o código | [Contribuindo](#contribuindo) |

---

## App Android

O app nativo (`artifacts/viax-mobile/`) é construído em **Flutter 3.24** e oferece a experiência completa do ViaX:Trace direto do celular: dashboard, processamento de planilhas com barra de progresso em primeiro plano, histórico, ferramenta de condomínios e configurações.

**Como instalar (usuário final):**

1. Baixe o APK mais recente em [Releases](https://github.com/esmagafetos/Viax-Scout/releases).
2. Instale e abra — o backend oficial já vem configurado.
3. Faça login com a mesma conta usada na web (ou crie uma na hora).

**Stack:**

| Camada | Tecnologia |
|---|---|
| Framework | Flutter 3.24 + Dart 3.4 |
| Roteamento | go_router 14 |
| HTTP & sessão | Dio 5 + cookie_jar |
| Estado | Provider 6 |
| Background tasks | flutter_foreground_task |
| Tipografia | Poppins (`google_fonts`) |
| Build & deploy | GitHub Actions + Flutter `apk --release` |

> Build local: `cd artifacts/viax-mobile && flutter pub get && flutter run`. Para apontar para outro backend (ex.: instância local em emulador): `flutter run --dart-define=API_BASE=http://10.0.2.2:8080`.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Upload XLSX / CSV | Planilhas com endereço, lat/lon, cidade, bairro e CEP — até 10 MB |
| Parser embutido | Regex calibrado para português BR — extrai logradouro, número, POI, travessa e CEP |
| Parser via IA | Alternativa com OpenAI, Anthropic ou Google Gemini para endereços complexos |
| Geocodificação BR | BrasilAPI v2 (IBGE/Correios) + AwesomeAPI CEP como fontes primárias |
| Geocodificação global | Photon (sem rate limit) → Overpass API → Nominatim (OSM) |
| GeocodeR BR (CNEFE/IBGE) | Microserviço R opcional — precisão máxima via base CNEFE do IBGE |
| Google Maps premium | Integração opcional para máxima precisão global |
| Detecção de nuances | Similaridade bigram Jaccard + distância Haversine configuráveis por conta |
| Streaming em tempo real | Progresso linha a linha via Server-Sent Events (SSE) |
| Dashboard | Visão geral de análises, nuances, distâncias e controle financeiro |
| Histórico completo | Listagem e download de relatórios CSV de todas as análises |
| Ferramenta de Condomínios | Ordenação inteligente de rotas dentro de condomínios mapeados (Quadra/Lote) |
| Autenticação segura | Sessões com bcrypt, avatar e perfil de usuário |
| Tema escuro / claro | Preferência salva com alternância instantânea |

---

## Arquitetura

```
viax-scout/                          ← raiz do monorepo (pnpm workspaces)
│
├── artifacts/
│   ├── api-server/                  ← Express 5 · porta 8080 (prod: Render)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── geocoder.ts      ← pipeline completo de geocodificação multi-camada
│   │       │   └── logger.ts        ← pino (JSON estruturado)
│   │       ├── middlewares/         ← auth, session, error handler
│   │       └── routes/
│   │           ├── auth.ts          ← /api/auth/*  (login, register, logout, me)
│   │           ├── process.ts       ← /api/process/upload (SSE streaming)
│   │           ├── analyses.ts      ← /api/analyses/*
│   │           ├── dashboard.ts     ← /api/dashboard/*
│   │           ├── condominium.ts   ← /api/condominium/*  (ordenação Quadra/Lote)
│   │           └── users.ts         ← /api/users/*  (perfil, avatar)
│   │
│   ├── viax-scout/                  ← Frontend web — React 19 + Vite 7 · porta 5000
│   │   └── src/
│   │       ├── pages/               ← Login, Register, Setup, Dashboard, Process,
│   │       │                           History, Tool, Settings, Docs
│   │       ├── components/          ← Layout, ViaXLogo, UI primitives
│   │       └── contexts/            ← AuthContext
│   │
│   └── viax-mobile/                 ← App Android — Flutter 3.24 (mesma UX da web)
│       └── lib/
│           ├── api/                 ← ApiClient (Dio + cookie jar) — backend hardcoded
│           ├── screens/             ← Login, Register, Dashboard, Process,
│           │                           Tool, History, Settings, Docs
│           ├── state/               ← AuthProvider, SettingsProvider, ThemeProvider
│           └── widgets/             ← Layout, BrandMark, Toast
│
├── lib/
│   ├── db/                          ← Drizzle ORM · schema PostgreSQL
│   ├── api-spec/                    ← openapi.yaml + orval.config (codegen)
│   ├── api-zod/                     ← schemas Zod gerados automaticamente
│   └── api-client-react/            ← hooks TanStack Query gerados automaticamente
│
├── render.yaml                      ← Blueprint de deploy (Render — Postgres + API)
└── Dockerfile.api                   ← Imagem multi-stage usada pelo Render
```

### Pipeline de Geocodificação

```
Endereço recebido
  │
  ├─ CEP detectado? ──► BrasilAPI v2 (IBGE/Correios) → AwesomeAPI CEP
  │
  └─ GPS fornecido? ──► Geocodificação reversa (GPS → nome de via):
                          1. Photon (Komoot) — rápido, sem rate limit
                          2. Overpass API   — consulta OSM, raio 40 m → 90 m
                          3. Nominatim      — fallback OSM completo
                        │
                        └─ Geocodificação direta (endereço → coordenada):
                             4. Photon
                             5. Nominatim (1 req/s)
                             6. GeocodeR BR — CNEFE/IBGE (se GEOCODEBR_URL definido)
                             7. Google Maps API — fallback premium (se GOOGLE_MAPS_API_KEY)

Comparação final:
  Similaridade Jaccard bigram (limiar padrão: 68 %) + distância Haversine
  Normalização: siglas (Av./Avenida), POIs, vias secundárias (Travessa, Passagem)
```

### Deploy em produção

O backend roda no **Render** via blueprint declarativo (`render.yaml`):

- **Web service Docker** (Dockerfile.api multi-stage com pnpm 10) · health check em `/api/healthz`
- **PostgreSQL 16 gerenciado** (free tier) · `DATABASE_URL` injetado automaticamente
- **Auto-deploy** a cada push em `main` · `SESSION_SECRET` gerado pelo Render
- **Migrações** aplicadas no boot (`pnpm --filter @workspace/db run push` antes do start)

---

## Self-host (opcional)

A maioria dos usuários **não precisa** instalar nada além do app. Esta seção é para quem quer rodar a própria instância (frontend web + backend) na infraestrutura local.

### Pré-requisitos

| Dependência | Versão mínima |
|---|---|
| Node.js | 20 |
| pnpm | 10 |
| PostgreSQL | 14 |

### Docker (recomendado)

```bash
docker compose up -d
docker compose logs -f api
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:8080

### Manual

```bash
# 1. Clone
git clone https://github.com/esmagafetos/Viax-Scout.git
cd Viax-Scout

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite o .env com DATABASE_URL e SESSION_SECRET

# 4. Aplique o schema do banco
pnpm --filter @workspace/db run push

# 5. Inicie em modo dev (API + Web em paralelo)
pnpm run dev
```

### Atalho — instaladores assistidos

| Plataforma | Comando |
|---|---|
| Linux / macOS | `curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.sh \| bash` |
| Windows (PowerShell admin) | `iwr -useb https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.ps1 \| iex` |

### Configuração

Crie `.env` na raiz (ou copie de `.env.example`):

```env
# ── Obrigatório ─────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://usuario:senha@localhost:5432/viax_scout
SESSION_SECRET=sua_chave_secreta_longa_e_aleatoria

# ── Geocodificação premium (opcional) ───────────────────────────────────────
GOOGLE_MAPS_API_KEY=

# ── GeocodeR BR — microserviço R/CNEFE (opcional) ───────────────────────────
GEOCODEBR_URL=

# ── Parser via IA (opcional) ─────────────────────────────────────────────────
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
```

### Modos de geocodificação (configuráveis pelo usuário)

| Modo | Fonte | Indicado para |
|---|---|---|
| `builtin` | Photon + Overpass + Nominatim (OSM) | Uso geral — gratuito, sem rate limit |
| `geocodebr` | GeocodeR BR (CNEFE/IBGE via R) | Máxima precisão para endereços brasileiros |
| `googlemaps` | Google Maps API | Precisão máxima global, pay-per-use |

### Formato da planilha

| Coluna | Tipo | Obrigatório | Aliases aceitos |
|---|---|---|---|
| Endereço | texto | **Sim** | `endereco`, `endereço`, `address` |
| Latitude | número | Não | `lat`, `latitude` |
| Longitude | número | Não | `lon`, `lng`, `longitude` |
| Cidade | texto | Não | `cidade`, `city` |
| Bairro | texto | Não | `bairro`, `neighborhood` |
| CEP | texto | Não | `cep`, `zipcode` — ativa fontes brasileiras |

---

## Desenvolvimento

```bash
# Todos os serviços em paralelo
pnpm run dev

# Typecheck completo do monorepo
pnpm run typecheck

# Build de produção
pnpm run build

# Regenerar hooks e schemas a partir do openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Aplicar alterações de schema no banco
pnpm --filter @workspace/db run push
```

### Adicionando um novo endpoint

1. Atualize `lib/api-spec/openapi.yaml` com a definição do endpoint
2. Execute `pnpm --filter @workspace/api-spec run codegen` para gerar tipos e hooks
3. Implemente a rota em `artifacts/api-server/src/routes/`
4. Registre-a em `artifacts/api-server/src/routes/index.ts`
5. Consuma o hook gerado via `@workspace/api-client-react` no frontend

### Alterando o schema do banco

1. Edite os arquivos em `lib/db/src/schema/`
2. Execute `pnpm --filter @workspace/db run push`

---

## Stack tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 20+ |
| Monorepo | pnpm workspaces | 10+ |
| Linguagem | TypeScript | 5.9 |
| **Frontend web** | React + Vite | 19 + 7 |
| Roteamento | Wouter | — |
| Data fetching | TanStack Query | 5 |
| Estilo | Tailwind CSS | 4 |
| Animações | Framer Motion | — |
| **Backend** | Express | 5 |
| Logger | Pino | — |
| Upload | Multer | — |
| Parsing XLSX | xlsx | — |
| **Banco de dados** | PostgreSQL | 14+ (16 em produção) |
| ORM | Drizzle ORM | — |
| Validação | Zod | 3 |
| Auth | express-session + bcryptjs | — |
| **Geocodificação BR** | BrasilAPI v2 + AwesomeAPI CEP | — |
| **Geocodificação global** | Photon + Overpass + Nominatim (OSM) | — |
| **GeocodeR BR** | geocodebr (IPEA) + Plumber + R | 4.5+ |
| API codegen | Orval | — |
| **App Android** | Flutter + Dart | 3.24 / 3.4 |
| Roteamento mobile | go_router | 14 |
| HTTP mobile | Dio + cookie_jar | 5 / 4 |
| Hosting (API) | Render Web Service + Postgres 16 | — |

---

## Roadmap

- **GeocodeR BR hospedado** — subir o microserviço R (`artifacts/geocodebr-service`) em hosting dedicado e conectá-lo ao backend de produção via `GEOCODEBR_URL`.
- **App iOS assinado** — distribuir IPA assinado via TestFlight quando uma conta Apple Developer estiver disponível.
- **Exportação avançada** — relatórios em PDF e integração com webhooks externos.

---

## Contribuindo

Contribuições são bem-vindas. Leia o [guia de contribuição](.github/CONTRIBUTING.md) antes de começar.

```bash
# Fork → clone → branch
git checkout -b feat/nome-da-feature

# Implemente, então valide
pnpm run typecheck

# Commit seguindo Conventional Commits
git commit -m "feat: descrição curta da mudança"

# Abra um Pull Request usando o template em .github/PULL_REQUEST_TEMPLATE.md
```

### Reportar bugs

Abra uma [issue](https://github.com/esmagafetos/Viax-Scout/issues/new?template=bug_report.md) descrevendo:

- Passos para reproduzir
- Comportamento esperado vs. observado
- Versão do app (Android) ou Node.js + sistema operacional (self-host)

### Código de Conduta

Ao participar deste projeto você concorda com o nosso [Código de Conduta](CODE_OF_CONDUCT.md). Vulnerabilidades de segurança devem ser reportadas conforme a [Política de Segurança](SECURITY.md).

---

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">

Desenvolvido por [esmagafetos](https://github.com/esmagafetos) · [Releases](https://github.com/esmagafetos/Viax-Scout/releases) · [Issues](https://github.com/esmagafetos/Viax-Scout/issues) · [Backend ao vivo](https://viax-trace-api.onrender.com)

</div>
