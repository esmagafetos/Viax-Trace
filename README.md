<div align="center">

# ViaX: System

**Auditoria inteligente de rotas de entrega — valide planilhas XLSX/CSV contra coordenadas GPS reais**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-blue?logo=pnpm)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?logo=postgresql)](https://postgresql.org)

[Funcionalidades](#-funcionalidades) · [Instalação](#-instalação) · [Configuração](#️-configuração) · [Uso](#-uso) · [Arquitetura](#-arquitetura) · [Contribuindo](#-contribuindo)

</div>

---

## Sobre o projeto

O **ViaX: System** é uma plataforma SaaS de auditoria logística que verifica automaticamente se os endereços registrados em planilhas de rotas de entrega correspondem às coordenadas GPS coletadas em campo. O sistema detecta **nuances** — divergências entre o endereço informado e o local real de coleta — e gera relatórios operacionais para análise.

### Problema que resolve

Gestores de logística frequentemente recebem planilhas de rota onde o endereço digitado pelo entregador não confere com o GPS do dispositivo. Isso pode indicar fraude, erro de digitação, ou ponto de coleta incorreto. O ViaX automatiza essa auditoria para centenas ou milhares de linhas em segundos.

### Como funciona

```
Planilha XLSX/CSV → Parser de endereço → Geocodificação reversa → Comparação → Relatório de nuances
       ↓                    ↓                      ↓                  ↓
  Endereço + GPS     Rua extraída          Nome oficial da rua   Similaridade + distância
```

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Upload XLSX / CSV** | Suporte a planilhas com colunas de endereço, latitude, longitude, cidade, bairro e CEP |
| **Parser embutido** | Extrai logradouro, número, travessa, POI e CEP via regex adaptado ao português brasileiro |
| **Parser via IA** | Alternativa ao parser embutido usando OpenAI, Anthropic ou Google Gemini |
| **Geocodificação brasileira** | BrasilAPI v2 (IBGE/Correios) + AwesomeAPI CEP como fontes primárias para endereços BR |
| **Geocodificação global** | Photon (sem rate limit), Overpass API e Nominatim como fallback |
| **Google Maps premium** | Integração opcional com Google Maps API para máxima precisão |
| **Detecção de nuances** | Similaridade de string (bigram Jaccard) + distância Haversine configurável |
| **Tolerância configurável** | Raio de tolerância em metros ajustável por conta |
| **Dashboard** | Visão geral de análises realizadas, nuances detectadas e estatísticas de custo |
| **Histórico completo** | Listagem e download de relatórios CSV de todas as análises anteriores |
| **Autenticação segura** | Sessões com bcrypt, suporte a avatar e perfil de usuário |
| **Modo escuro / claro** | Tema automático com preferência salva |

---

## Screenshots

> O sistema suporta modo claro e escuro com alternância instantânea.

### Login
| Claro | Escuro |
|-------|--------|
| ![Login claro](docs/screenshots/login.jpg) | ![Login escuro](docs/screenshots/login-dark.jpg) |

### Cadastro
| Claro | Escuro |
|-------|--------|
| ![Cadastro claro](docs/screenshots/register.jpg) | ![Cadastro escuro](docs/screenshots/register-dark.jpg) |

### Dashboard
| Claro | Escuro |
|-------|--------|
| ![Dashboard claro](docs/screenshots/dashboard.jpg) | ![Dashboard escuro](docs/screenshots/dashboard-dark.jpg) |

### Processar Rota
| Claro | Escuro |
|-------|--------|
| ![Processar claro](docs/screenshots/processing.jpg) | ![Processar escuro](docs/screenshots/processing-dark.jpg) |

### Histórico de Análises
| Claro | Escuro |
|-------|--------|
| ![Histórico claro](docs/screenshots/history.jpg) | ![Histórico escuro](docs/screenshots/history-dark.jpg) |

### Configurações
| Claro | Escuro |
|-------|--------|
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

O sistema usa uma cadeia de fallback para garantir máxima cobertura, priorizando fontes especializadas para o Brasil:

```
CEP detectado?
  ├─ SIM → BrasilAPI v2 (IBGE/Correios) → AwesomeAPI CEP
  │         ↓ retorna rua + lat/lon quando disponível
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
- **pnpm** 9 ou superior (`npm install -g pnpm`)
- **PostgreSQL** 14 ou superior

---

## Instalação

### Instalação automática (recomendada)

Scripts de instalação automática estão disponíveis para todos os sistemas operacionais. Cada script instala as dependências, configura o banco de dados e inicia o sistema completo.

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

### Instalação manual

```bash
# 1. Clone o repositório
git clone https://github.com/esmagafetos/Viax-Scout.git
cd Viax-Scout

# 2. Instale as dependências (todas as packages do monorepo)
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com as credenciais do seu banco de dados

# 4. Aplique o schema no banco de dados
pnpm --filter @workspace/db run push

# 5. Inicie o servidor de desenvolvimento
pnpm run dev
```

O sistema estará disponível em:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:8080

---

### Docker

```bash
# Subir toda a stack com Docker Compose
docker compose up -d

# Verificar logs
docker compose logs -f api
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados (obrigatório)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/viax_scout

# Sessão (obrigatório — use uma string longa e aleatória)
SESSION_SECRET=sua_chave_secreta_aqui

# Google Maps API (opcional — para modo premium)
# Obtenha em: https://console.cloud.google.com
GOOGLE_MAPS_API_KEY=

# Parser via IA (opcional — configure nas Configurações da interface)
# Suportado: openai, anthropic, google
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
```

### Configurações da interface

Acesse **Configurações → Instâncias** para selecionar o modo de geocodificação:

| Modo | Custo | Precisão | Indicado para |
|---|---|---|---|
| `builtin` | Gratuito | Alta para Brasil (CEP) | Uso geral |
| `googlemaps` | Pay-per-use | Máxima | Operações críticas |

Acesse **Configurações → Parser** para alternar entre parser embutido e parser via IA.

Acesse **Configurações → Tolerância** para ajustar o raio de aceitação em metros.

---

## Uso

### 1. Criar conta

Acesse a interface, clique em **Criar conta** e preencha os dados. O primeiro usuário registrado não requer aprovação.

### 2. Preparar a planilha

O sistema aceita arquivos `.xlsx` ou `.csv` com as seguintes colunas (nomes flexíveis):

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `endereco` / `address` | texto | Sim | Endereço completo da entrega |
| `lat` / `latitude` | número | Não | Latitude do GPS coletado |
| `lon` / `lng` / `longitude` | número | Não | Longitude do GPS coletado |
| `cidade` / `city` | texto | Não | Cidade (melhora a precisão) |
| `bairro` / `neighborhood` | texto | Não | Bairro (melhora a precisão) |
| `cep` / `zipcode` | texto | Não | CEP — ativa geocodificação brasileira |

### 3. Processar

Vá até **Processar**, faça o upload da planilha e aguarde. O processamento ocorre em tempo real via streaming (SSE), com progresso linha por linha.

### 4. Analisar o relatório

Cada linha retorna:

- **Status:** `ok` ou `nuance`
- **Rua extraída:** o que o sistema entendeu do campo de endereço
- **Rua oficial:** o nome retornado pelo geocodificador
- **Similaridade:** índice de 0 a 1 (1 = idêntico)
- **Distância:** metros entre o endereço informado e o GPS coletado
- **Motivo:** descrição da divergência quando detectada

O relatório completo pode ser baixado em CSV no **Histórico**.

---

## Desenvolvimento

### Comandos úteis

```bash
# Iniciar todos os serviços em modo desenvolvimento
pnpm run dev

# Typecheck de todo o monorepo
pnpm run typecheck

# Build completo
pnpm run build

# Regenerar API hooks e schemas Zod a partir do openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Aplicar alterações de schema no banco (desenvolvimento)
pnpm --filter @workspace/db run push

# Executar apenas o servidor API
pnpm --filter @workspace/api-server run dev

# Executar apenas o frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/viax-scout run dev
```

### Adicionar um novo endpoint

1. Atualize `lib/api-spec/openapi.yaml` com o novo endpoint
2. Execute `pnpm --filter @workspace/api-spec run codegen` para gerar os tipos e hooks
3. Implemente a rota em `artifacts/api-server/src/routes/`
4. Registre a rota em `artifacts/api-server/src/index.ts`
5. Use o hook gerado no frontend via `@workspace/api-client-react`

### Alterar o schema do banco

1. Edite o schema em `lib/db/src/schema/`
2. Execute `pnpm --filter @workspace/db run push`
3. Se necessário, atualize os tipos Zod correspondentes

---

## Stack tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 20+ |
| Gerenciador de pacotes | pnpm workspaces | 9+ |
| Linguagem | TypeScript | 5.9 |
| **Frontend** | React | 19 |
| Build tool | Vite | 7 |
| Roteamento | Wouter | — |
| Data fetching | TanStack Query | 5 |
| Estilo | Tailwind CSS | 4 |
| Animações | Framer Motion | — |
| **Backend** | Express | 5 |
| Logger | Pino | — |
| **Banco de dados** | PostgreSQL | 14+ |
| ORM | Drizzle ORM | — |
| Validação | Zod | 3 |
| Autenticação | express-session + bcryptjs | — |
| Upload | Multer | — |
| Parsing de planilhas | xlsx | — |
| **Geocodificação BR** | BrasilAPI v2 (IBGE/Correios) | — |
| **Geocodificação BR** | AwesomeAPI CEP | — |
| Geocodificação global | Photon (Komoot) | — |
| Geocodificação global | Overpass API + Nominatim | — |
| **API codegen** | Orval | — |

---

## Contribuindo

Contribuições são bem-vindas. Siga os passos abaixo:

1. Faça um fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feat/nome-da-feature`
3. Implemente suas alterações seguindo o padrão do projeto
4. Execute o typecheck: `pnpm run typecheck`
5. Faça commit usando [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: descrição da feature"`
6. Abra um Pull Request descrevendo o que foi feito e por quê

### Reportar bugs

Abra uma [issue](https://github.com/esmagafetos/Viax-Scout/issues) com:
- Descrição do problema
- Passos para reproduzir
- Comportamento esperado vs. observado
- Versão do sistema e sistema operacional

---

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

Desenvolvido por [esmagafetos](https://github.com/esmagafetos) · Veja também o [Changelog](https://github.com/esmagafetos/Viax-Scout/releases)

</div>
