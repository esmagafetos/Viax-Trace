<div align="center">

<!-- Banner: ViaX:Trace — docs/banner.png (947x245px) -->
<img src="docs/banner.png" alt="ViaX:Trace — Auditoria Inteligente de Rotas Logísticas" width="100%" />

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)

**Valide planilhas XLSX/CSV contra coordenadas GPS reais em tempo real**

[Funcionalidades](#-funcionalidades) · [Arquitetura](#-arquitetura) · [Instalação](#-instalação) · [App Android](#-app-nativo-android) · [Configuração](#️-configuração) · [Screenshots](#-screenshots) · [Contribuindo](#-contribuindo)

</div>

---

## Sobre

**ViaX:Trace** é uma plataforma SaaS de auditoria logística que valida automaticamente planilhas de rotas de entrega (XLSX/CSV) comparando os endereços registrados com coordenadas GPS coletadas em campo.

O sistema detecta **nuances** — divergências entre o endereço informado e o ponto GPS real — e gera relatórios detalhados, ajudando gestores a identificar fraudes, erros de digitação e pontos de entrega incorretos em segundos, com resultados transmitidos em tempo real via SSE.

```
Planilha XLSX/CSV  →  Parser de endereço  →  Geocodificação reversa  →  Comparação  →  Relatório
        ↓                      ↓                        ↓                     ↓
 Endereço + GPS          Rua extraída            Nome oficial da via     Similaridade + distância
```

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Upload XLSX / CSV** | Planilhas com endereço, lat/lon, cidade, bairro e CEP — até 10 MB |
| **Parser embutido** | Regex calibrado para português BR — extrai logradouro, número, POI, travessa e CEP |
| **Parser via IA** | Alternativa com OpenAI, Anthropic ou Google Gemini para endereços complexos |
| **Geocodificação BR** | BrasilAPI v2 (IBGE/Correios) + AwesomeAPI CEP como fontes primárias |
| **Geocodificação global** | Photon (sem rate limit) → Overpass API → Nominatim (OSM) |
| **GeocodeR BR (CNEFE/IBGE)** | Microserviço R opcional — precisão máxima via base CNEFE do IBGE |
| **Google Maps premium** | Integração opcional para máxima precisão global |
| **Detecção de nuances** | Similaridade bigram Jaccard + distância Haversine configurável por conta |
| **Streaming em tempo real** | Progresso linha a linha via Server-Sent Events (SSE) |
| **Dashboard** | Visão geral de análises, nuances, distâncias e controle financeiro |
| **Histórico completo** | Listagem e download de relatórios CSV de todas as análises |
| **Ferramenta de Condomínios** | Ordenação inteligente de rotas dentro de condomínios mapeados (Quadra/Lote) — disponível na aba *Ferramenta* |
| **Autenticação segura** | Sessões com bcrypt, avatar e perfil de usuário |
| **Tema escuro / claro** | Preferência salva com alternância instantânea |

---

## Arquitetura

```
viax-scout/                          ← raiz do monorepo (pnpm workspaces)
│
├── artifacts/
│   ├── api-server/                  ← Express 5 · porta 8080
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
│   └── viax-scout/                  ← React 19 + Vite 7 · porta 5173
│       └── src/
│           ├── pages/               ← Login, Register, Setup, Dashboard,
│           │                           Process, History, Tool, Settings, Docs
│           ├── components/          ← Layout, ViaXLogo, UI primitives
│           └── contexts/            ← AuthContext
│
└── lib/
    ├── db/                          ← Drizzle ORM · schema PostgreSQL
    ├── api-spec/                    ← openapi.yaml + orval.config (codegen)
    ├── api-zod/                     ← schemas Zod gerados automaticamente
    └── api-client-react/            ← hooks TanStack Query gerados automaticamente
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
  Similaridade Jaccard bigram (limiar padrão: 68%) + distância Haversine
  Normalização: siglas (Av./Avenida), POIs, vias secundárias (Travessa, Passagem)
```

---

## Screenshots

### Login
| Claro | Escuro |
|:---:|:---:|
| ![Login claro](docs/screenshots/login.jpg) | ![Login escuro](docs/screenshots/login-dark.jpg) |

### Dashboard
| Claro | Escuro |
|:---:|:---:|
| ![Dashboard claro](docs/screenshots/dashboard.jpg) | ![Dashboard escuro](docs/screenshots/dashboard-dark.jpg) |

### Processar Rota
| Claro | Escuro |
|:---:|:---:|
| ![Processar claro](docs/screenshots/processing.jpg) | ![Processar escuro](docs/screenshots/processing-dark.jpg) |

### Histórico de Análises
| Claro | Escuro |
|:---:|:---:|
| ![Histórico claro](docs/screenshots/history.jpg) | ![Histórico escuro](docs/screenshots/history-dark.jpg) |

### Configurações
| Claro | Escuro |
|:---:|:---:|
| ![Config claro](docs/screenshots/settings.jpg) | ![Config escuro](docs/screenshots/settings-dark.jpg) |

---

## Pré-requisitos

| Dependência | Versão mínima |
|---|---|
| Node.js | 20 |
| pnpm | 9 |
| PostgreSQL | 14 |

---

## Instalação

### Automática (recomendada)

**Linux / macOS**
```bash
curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.sh | bash
```

**Windows (PowerShell — Executar como Administrador)**
```powershell
iwr -useb https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.ps1 | iex
```

**Android — Termux**
```bash
curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-termux.sh | bash
```

> **GeocodeR BR (opcional):** Para precisão máxima via CNEFE/IBGE, instale o microserviço R após a instalação principal:
> ```bash
> bash ~/viax-system/install-geocodebr-termux.sh
> # Após instalar, inicie com:
> bash ~/viax-system/start-geocodebr.sh
> ```
> O instalador usa `proot-distro` para criar um ambiente Ubuntu isolado dentro do Termux (sem root). Na primeira execução, o geocodebr baixa os dados do CNEFE (~1–2 GB).

---

### Manual

```bash
# 1. Clone o repositório
git clone https://github.com/esmagafetos/Viax-Scout.git
cd Viax-Scout

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com as credenciais do banco de dados

# 4. Aplique o schema no banco
pnpm --filter @workspace/db run push

# 5. Inicie em modo de desenvolvimento
pnpm run dev
```

Após iniciar:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:8080

---

### Docker

```bash
docker compose up -d
docker compose logs -f api
```

---

## Atualização

Sempre que novas funcionalidades forem publicadas no repositório (por exemplo, a **Ferramenta de Condomínios**, novas rotas da API ou alterações no banco), use o script de atualização gerado pelo instalador. Ele faz `git pull`, reinstala dependências, aplica o schema e recompila a API automaticamente.

**Linux / macOS**
```bash
bash ~/viax-system/update.sh
bash ~/viax-system/start.sh
```

**Android — Termux**
```bash
bash ~/viax-system/update.sh
bash ~/viax-system/start.sh
```

> O `start.sh` também detecta automaticamente quando o código-fonte é mais recente que o build da API e recompila antes de iniciar — útil quando a aba *Ferramenta* aparece sem condomínios listados depois de um `git pull`.

**Manual**
```bash
git pull
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
```

---

## App Nativo Android

Além do frontend web, o ViaX:Trace conta com um **aplicativo Android nativo** (`artifacts/viax-mobile`) construído em React Native + Expo. Ele oferece a mesma experiência do web (login, dashboard, processamento de planilhas, histórico, configurações) e adiciona uma seção exclusiva **"Configurar servidor"** para apontar o app para uma API rodando localmente no próprio celular via **Termux**.

### Por que existe
O backend pode rodar dentro do Termux no mesmo aparelho (ou em outro celular/PC da rede). O app nativo permite ao usuário operar o sistema **inteiramente offline** ou em rede privada, sem depender de servidor remoto.

### Como instalar o APK (usuário final)
1. Acesse a página de [Releases](https://github.com/esmagafetos/Viax-Scout/releases) e baixe o `viax-trace-vX.Y.Z.apk` mais recente.
2. No Android, habilite **"Instalar de fontes desconhecidas"** para o app de arquivos/navegador.
3. Toque no APK baixado e confirme a instalação.
4. Abra o app, faça login (mesma conta do web) e na primeira execução vá em **Setup → Configurar servidor** para colar a URL do seu servidor Termux (ex.: `http://127.0.0.1:8080` ou `http://192.168.0.10:8080`).

### Como rodar em modo de desenvolvimento
Pré-requisito: o app **Expo Go** instalado no seu Android (Play Store).

```bash
# A partir da raiz do monorepo
pnpm --filter @workspace/viax-mobile run start
# Ou já com tunnel (necessário se o celular estiver em outra rede)
cd artifacts/viax-mobile && pnpm exec expo start --tunnel
```

Escaneie o QR code que aparece no terminal com o Expo Go. Hot reload funciona instantaneamente.

### Build de produção (EAS)
O CI publica automaticamente um APK de release a cada push em `main` via GitHub Actions:

- Workflow: `.github/workflows/mobile-release.yml`
- Profile: `production` (definido em `artifacts/viax-mobile/eas.json`)
- Versionamento: `versionCode` é incrementado automaticamente pelo EAS (`appVersionSource: remote`)
- Publica o APK em uma GitHub Release com notas de build

Para disparar uma build manualmente:
```bash
cd artifacts/viax-mobile
pnpm exec eas build --platform android --profile production
```

> Requer o segredo `EXPO_TOKEN` configurado no repositório (Settings → Secrets and variables → Actions).

### Stack do app nativo
| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 |
| Roteamento | expo-router 6 (typed routes) |
| Storage seguro | expo-secure-store (URL do servidor) |
| Data fetching | TanStack Query 5 |
| Tipografia | Poppins (`@expo-google-fonts/poppins`) |
| Build & deploy | EAS Build + GitHub Actions |

---

## Configuração

Crie um arquivo `.env` na raiz do projeto (ou copie `.env.example`):

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

### Modos de geocodificação (configuráveis via interface)

| Modo | Fonte | Indicado para |
|---|---|---|
| `builtin` | Photon + Overpass + Nominatim (OSM) | Uso geral — gratuito, sem rate limit |
| `geocodebr` | GeocodeR BR (CNEFE/IBGE via R) | Máxima precisão para endereços brasileiros |
| `googlemaps` | Google Maps API | Precisão máxima global, pay-per-use |

---

## Formato da planilha

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
| Monorepo | pnpm workspaces | 9+ |
| Linguagem | TypeScript | 5.9 |
| **Frontend** | React + Vite | 19 + 7 |
| Roteamento | Wouter | — |
| Data fetching | TanStack Query | 5 |
| Estilo | Tailwind CSS | 4 |
| Animações | Framer Motion | — |
| **Backend** | Express | 5 |
| Logger | Pino | — |
| Upload | Multer | — |
| Parsing XLSX | xlsx | — |
| **Banco de dados** | PostgreSQL | 14+ |
| ORM | Drizzle ORM | — |
| Validação | Zod | 3 |
| Auth | express-session + bcryptjs | — |
| **Geocod. BR** | BrasilAPI v2 + AwesomeAPI CEP | — |
| **Geocod. global** | Photon + Overpass + Nominatim | — |
| **GeocodeR BR** | geocodebr (IPEA) + Plumber + R | 4.4+ |
| API codegen | Orval | — |
| **App Android** | Expo SDK + React Native | 54 / 0.81 |
| Roteamento mobile | expo-router | 6 |
| Build mobile | EAS Build + GitHub Actions | — |

---

## Contribuindo

Contribuições são bem-vindas! Leia o [guia de contribuição](.github/CONTRIBUTING.md) antes de começar.

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
- Versão do Node.js e sistema operacional

---

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">

Desenvolvido por [esmagafetos](https://github.com/esmagafetos) · [Releases](https://github.com/esmagafetos/Viax-Scout/releases) · [Issues](https://github.com/esmagafetos/Viax-Scout/issues)

</div>

