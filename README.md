<div align="center">

<img src="docs/banner.png" alt="ViaX:Trace — Auditoria Inteligente de Rotas" width="100%" style="border-radius:12px;display:block;" />

<br />
<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)

**Auditoria inteligente de rotas de entrega — valide planilhas XLSX/CSV contra coordenadas GPS reais**

[Funcionalidades](#-funcionalidades) · [Screenshots](#-screenshots) · [Instalação](#-instalação) · [Configuração](#️-configuração) · [Arquitetura](#-arquitetura) · [Contribuindo](#-contribuindo)

</div>

---

## Sobre o projeto

O **ViaX: System** é uma plataforma SaaS de auditoria logística que verifica automaticamente se os endereços registrados em planilhas de rotas de entrega correspondem às coordenadas GPS coletadas em campo.

O sistema detecta **nuances** — divergências entre o endereço informado e o local real de coleta — e gera relatórios operacionais detalhados, ajudando gestores de logística a identificar fraudes, erros de digitação e pontos de coleta incorretos em segundos.

```
Planilha XLSX/CSV → Parser de endereço → Geocodificação reversa → Comparação → Relatório
       ↓                    ↓                      ↓                  ↓
  Endereço + GPS     Rua extraída          Nome oficial da rua   Similaridade + distância
```

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Upload XLSX / CSV** | Suporte a planilhas com endereço, latitude, longitude, cidade, bairro e CEP |
| **Parser embutido** | Extrai logradouro, número, travessa, POI e CEP via regex adaptado ao português BR |
| **Parser via IA** | Alternativa usando OpenAI, Anthropic ou Google Gemini |
| **Geocodificação brasileira** | BrasilAPI v2 (IBGE/Correios) + AwesomeAPI CEP como fontes primárias |
| **Geocodificação global** | Photon (sem rate limit), Overpass API e Nominatim como fallback |
| **Google Maps premium** | Integração opcional para máxima precisão |
| **Detecção de nuances** | Similaridade bigram Jaccard + distância Haversine configurável |
| **Tolerância configurável** | Raio de aceitação em metros ajustável por conta |
| **Dashboard** | Visão geral de análises, nuances detectadas e controle financeiro |
| **Histórico completo** | Listagem e download de relatórios CSV de todas as análises |
| **Autenticação segura** | Sessões com bcrypt, avatar e perfil de usuário |
| **Modo escuro / claro** | Tema automático com preferência salva |

---

## Screenshots

### Login
| Claro | Escuro |
|:-----:|:------:|
| ![Login claro](docs/screenshots/login.jpg) | ![Login escuro](docs/screenshots/login-dark.jpg) |

### Cadastro
| Claro | Escuro |
|:-----:|:------:|
| ![Cadastro claro](docs/screenshots/register.jpg) | ![Cadastro escuro](docs/screenshots/register-dark.jpg) |

### Dashboard
| Claro | Escuro |
|:-----:|:------:|
| ![Dashboard claro](docs/screenshots/dashboard.jpg) | ![Dashboard escuro](docs/screenshots/dashboard-dark.jpg) |

### Processar Rota
| Claro | Escuro |
|:-----:|:------:|
| ![Processar claro](docs/screenshots/processing.jpg) | ![Processar escuro](docs/screenshots/processing-dark.jpg) |

### Histórico de Análises
| Claro | Escuro |
|:-----:|:------:|
| ![Histórico claro](docs/screenshots/history.jpg) | ![Histórico escuro](docs/screenshots/history-dark.jpg) |

### Configurações
| Claro | Escuro |
|:-----:|:------:|
| ![Config claro](docs/screenshots/settings.jpg) | ![Config escuro](docs/screenshots/settings-dark.jpg) |

---

## Arquitetura

```
viax-scout/                          ← raiz do monorepo (pnpm workspaces)
│
├── artifacts/
│   ├── api-server/                  ← Express 5 · porta 8080
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── geocoder.ts      ← pipeline completo de geocodificação
│   │       │   └── logger.ts        ← pino logger
│   │       └── routes/
│   │           ├── auth.ts          ← /api/auth/*
│   │           ├── process.ts       ← /api/process/upload (SSE streaming)
│   │           ├── analyses.ts      ← /api/analyses/*
│   │           ├── dashboard.ts     ← /api/dashboard/*
│   │           └── users.ts         ← /api/users/*
│   │
│   └── viax-scout/                  ← React 19 + Vite 7 · porta 5173
│       └── src/
│           ├── pages/               ← Login, Register, Dashboard, Process, History, Settings
│           ├── components/          ← Layout, Toast, UI primitives
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
CEP detectado?
  ├─ SIM → BrasilAPI v2 (IBGE/Correios) → AwesomeAPI CEP
  └─ NÃO → continua no fluxo global

GPS fornecido? → Geocodificação reversa:
  Photon (Komoot) → Overpass API → Nominatim OSM

Sem GPS ou reverso inconclusivo → Geocodificação direta:
  Photon → Nominatim (rate-limited 1 req/s)

Modo premium:
  Google Maps API (reverso + direto, máxima precisão)
```

---

## Pré-requisitos

- **Node.js** 20 ou superior
- **pnpm** 9 ou superior — `npm install -g pnpm`
- **PostgreSQL** 14 ou superior

---

## Instalação

### Automática (recomendada)

**Linux / macOS**
```bash
curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.sh | bash
```

**Windows (PowerShell — executar como Administrador)**
```powershell
iwr -useb https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.ps1 | iex
```

**Android — Termux**
```bash
curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-termux.sh | bash
```

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

# 4. Aplique o schema no banco de dados
pnpm --filter @workspace/db run push

# 5. Inicie em modo de desenvolvimento
pnpm run dev
```

Após iniciar, o sistema estará disponível em:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:8080

---

### Docker

```bash
docker compose up -d
docker compose logs -f api
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados (obrigatório)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/viax_scout

# Sessão (obrigatório — use uma string longa e aleatória)
SESSION_SECRET=sua_chave_secreta_aqui

# Google Maps API (opcional — para modo premium)
GOOGLE_MAPS_API_KEY=

# Parser via IA (opcional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
```

### Configurações da interface

| Seção | Opção | Descrição |
|---|---|---|
| **Instâncias** | `builtin` | Geocodificação gratuita — alta precisão para BR |
| **Instâncias** | `googlemaps` | Google Maps API — máxima precisão, pay-per-use |
| **Parser** | `embutido` | Regex otimizado para português BR |
| **Parser** | `ia` | LLM para endereços complexos ou ambíguos |
| **Tolerância** | raio em metros | Define o limiar de detecção de nuances |

---

## Uso

### 1. Criar conta

Acesse a interface e clique em **Criar conta**. O primeiro usuário registrado não requer aprovação.

### 2. Preparar a planilha

O sistema aceita `.xlsx` ou `.csv` com as seguintes colunas:

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `endereco` / `address` | texto | Sim | Endereço completo da entrega |
| `lat` / `latitude` | número | Não | Latitude do GPS coletado |
| `lon` / `lng` / `longitude` | número | Não | Longitude do GPS coletado |
| `cidade` / `city` | texto | Não | Cidade (melhora a precisão) |
| `bairro` / `neighborhood` | texto | Não | Bairro (melhora a precisão) |
| `cep` / `zipcode` | texto | Não | CEP — ativa geocodificação brasileira |

### 3. Processar

Vá até **Processar**, faça o upload e acompanhe o progresso linha a linha em tempo real via streaming.

### 4. Analisar o relatório

Cada linha retorna:

| Campo | Descrição |
|---|---|
| `status` | `ok` ou `nuance` |
| `rua_extraida` | O que o sistema interpretou do campo de endereço |
| `rua_oficial` | O nome retornado pelo geocodificador |
| `similaridade` | Índice de 0 a 1 (1 = idêntico) |
| `distancia` | Metros entre endereço informado e GPS coletado |
| `motivo` | Descrição da divergência quando detectada |

O relatório completo pode ser baixado em CSV no **Histórico**.

---

## Desenvolvimento

### Comandos úteis

```bash
# Iniciar todos os serviços
pnpm run dev

# Typecheck de todo o monorepo
pnpm run typecheck

# Build completo
pnpm run build

# Regenerar hooks e schemas a partir do openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Aplicar alterações de schema no banco
pnpm --filter @workspace/db run push

# Executar apenas o servidor API
pnpm --filter @workspace/api-server run dev

# Executar apenas o frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/viax-scout run dev
```

### Adicionar um novo endpoint

1. Atualize `lib/api-spec/openapi.yaml` com o novo endpoint
2. Execute `pnpm --filter @workspace/api-spec run codegen` para gerar tipos e hooks
3. Implemente a rota em `artifacts/api-server/src/routes/`
4. Registre-a em `artifacts/api-server/src/routes/index.ts`
5. Use o hook gerado no frontend via `@workspace/api-client-react`

### Alterar o schema do banco

1. Edite os arquivos em `lib/db/src/schema/`
2. Execute `pnpm --filter @workspace/db run push`

---

## Stack tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 20+ |
| Gerenciador | pnpm workspaces | 9+ |
| Linguagem | TypeScript | 5.9 |
| **Frontend** | React + Vite | 19 + 7 |
| Roteamento | Wouter | — |
| Data fetching | TanStack Query | 5 |
| Estilo | Tailwind CSS | 4 |
| Animações | Framer Motion | — |
| **Backend** | Express | 5 |
| Logger | Pino | — |
| **Banco de dados** | PostgreSQL | 14+ |
| ORM | Drizzle ORM | — |
| Validação | Zod | 3 |
| Auth | express-session + bcryptjs | — |
| Upload | Multer | — |
| Parsing XLSX | xlsx | — |
| **Geocodificação BR** | BrasilAPI v2 + AwesomeAPI | — |
| **Geocodificação global** | Photon + Overpass + Nominatim | — |
| API codegen | Orval | — |

---

## Contribuindo

Contribuições são bem-vindas. Siga os passos:

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/nome-da-feature`
3. Implemente suas alterações seguindo o padrão do projeto
4. Execute o typecheck: `pnpm run typecheck`
5. Faça commit seguindo [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: descrição"`
6. Abra um Pull Request descrevendo o que foi feito e por quê

### Reportar bugs

Abra uma [issue](https://github.com/esmagafetos/Viax-Scout/issues) com:
- Descrição do problema e passos para reproduzir
- Comportamento esperado vs. observado
- Versão do sistema e sistema operacional

---

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">

Desenvolvido por [esmagafetos](https://github.com/esmagafetos) · [Releases](https://github.com/esmagafetos/Viax-Scout/releases) · [Issues](https://github.com/esmagafetos/Viax-Scout/issues)

</div>
