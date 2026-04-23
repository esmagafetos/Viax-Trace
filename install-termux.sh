#!/usr/bin/env bash
# =============================================================================
#  ViaX: System — Instalador para Android via Termux
#  https://github.com/esmagafetos/Viax-Scout
#
#  Como usar no Termux:
#    curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-termux.sh | bash
#
#  Pré-requisito: Termux instalado do F-Droid (NÃO da Play Store)
#    https://f-droid.org/packages/com.termux/
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/esmagafetos/Viax-Scout.git"
APP_DIR="$HOME/viax-system"
DB_NAME="viax_system"
API_PORT=8080
WEB_PORT=5173

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[aviso]${NC} $*"; }
die()     { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}==> $*${NC}"; }

# Verificar se está no Termux
if [[ -z "${TERMUX_VERSION:-}" ]] && [[ ! -d "/data/data/com.termux" ]]; then
  die "Este script é exclusivo para Android via Termux. Use install.sh para Linux/macOS."
fi

header "ViaX: System v8.0 — Instalador Termux (Android)"
echo -e "  Repositório : ${REPO_URL}"
echo -e "  Diretório   : ${APP_DIR}"
echo ""
warn "Este processo pode demorar 5-15 minutos dependendo da sua conexão."
echo ""

# ---------------------------------------------------------------------------
# 1. ATUALIZAR REPOSITÓRIOS DO TERMUX
# ---------------------------------------------------------------------------
header "Atualizando Termux"
pkg update -y && pkg upgrade -y
success "Termux atualizado"

# ---------------------------------------------------------------------------
# 2. INSTALAR DEPENDÊNCIAS DO TERMUX
# ---------------------------------------------------------------------------
header "Instalando pacotes necessários"
PKGS=(nodejs-lts postgresql git curl openssl)
for pkg in "${PKGS[@]}"; do
  if ! dpkg -l "$pkg" &>/dev/null 2>&1; then
    info "Instalando $pkg..."
    pkg install -y "$pkg"
  else
    info "$pkg já instalado"
  fi
done
success "Pacotes instalados"

# pnpm via npm
if ! command -v pnpm &>/dev/null; then
  info "Instalando pnpm..."
  npm install -g pnpm
fi
success "pnpm $(pnpm --version)"

# ---------------------------------------------------------------------------
# 3. CONFIGURAR POSTGRESQL NO TERMUX
# ---------------------------------------------------------------------------
header "Configurando PostgreSQL"

PG_DATA="$PREFIX/var/lib/postgresql"

if [[ ! -d "$PG_DATA/base" ]]; then
  info "Inicializando banco de dados PostgreSQL..."
  mkdir -p "$PG_DATA"
  initdb "$PG_DATA"
  success "PostgreSQL inicializado"
fi

# Iniciar PostgreSQL (sem systemctl no Termux)
if ! pg_ctl status -D "$PG_DATA" &>/dev/null; then
  info "Iniciando PostgreSQL..."
  pg_ctl start -D "$PG_DATA" -l "$PG_DATA/postgresql.log"
  sleep 2
fi
success "PostgreSQL rodando"

# Criar banco
if ! psql -lqt | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
  info "Criando banco '$DB_NAME'..."
  createdb "$DB_NAME"
fi
success "Banco '$DB_NAME' pronto"

DATABASE_URL="postgresql://$(whoami)@localhost:5432/$DB_NAME"
export DATABASE_URL

# ---------------------------------------------------------------------------
# 4. CLONAR REPOSITÓRIO
# ---------------------------------------------------------------------------
header "Clonando repositório"
if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando repositório existente..."
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
fi
success "Código em: $APP_DIR"

# ---------------------------------------------------------------------------
# 5. ARQUIVO .ENV
# ---------------------------------------------------------------------------
header "Criando .env"
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || date | md5sum | cut -d' ' -f1)
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="${DATABASE_URL}"
SESSION_SECRET="${SESSION_SECRET}"
NODE_ENV=development
PORT=${API_PORT}

# geocodebr microservice (CNEFE/IBGE) — precisao maxima para enderecos BR
# Para ativar localmente no Termux (se R instalado):
#   bash ~/viax-system/start-geocodebr.sh
# Depois defina:
# GEOCODEBR_URL=http://localhost:8002
GEOCODEBR_URL=
EOF
success ".env criado"

# ---------------------------------------------------------------------------
# 6. INSTALAR DEPENDÊNCIAS E MIGRAR BANCO
# ---------------------------------------------------------------------------
header "Instalando dependências"
cd "$APP_DIR"
# Remove ALL overrides that block Android native modules (those overrides are Replit/Linux-only).
# This covers rollup, lightningcss, @tailwindcss/oxide, and esbuild android variants.
sed -i '/android/d' pnpm-workspace.yaml
pnpm install --no-frozen-lockfile
success "Dependências instaladas"

header "Aplicando schema"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push || warn "Falha ao aplicar schema — verifique o PostgreSQL e DATABASE_URL"
success "Schema aplicado"

header "Compilando API"
pnpm --filter @workspace/api-server run build
success "Build concluído"

# ---------------------------------------------------------------------------
# 7. MICROSERVIÇO GEOCODEBR (OPCIONAL — R + CNEFE/IBGE)
# ---------------------------------------------------------------------------
header "Verificando suporte ao GeocodeR BR (opcional)"

GEOCODEBR_AVAILABLE=false

if command -v R &>/dev/null; then
  info "R já instalado: $(R --version | head -1)"
  GEOCODEBR_AVAILABLE=true
else
  info "r-base foi removido do repositório oficial do Termux."
  info "Use o instalador standalone para instalar via proot-distro (Ubuntu):"
  info "  bash $APP_DIR/install-geocodebr-termux.sh"
  warn "O GeocodeR BR não será configurado agora. Execute o instalador acima depois."
fi

# ---------------------------------------------------------------------------
# 8. SCRIPTS DE INICIALIZAÇÃO
# ---------------------------------------------------------------------------
header "Criando scripts de controle"

# start.sh
cat > "$APP_DIR/start.sh" <<'STARTSCRIPT'
#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a; source .env; set +a

PG_DATA="${PREFIX}/var/lib/postgresql"

echo "Iniciando PostgreSQL..."
pg_ctl start -D "$PG_DATA" -l "$PG_DATA/postgresql.log" -w -t 30 2>/dev/null || true

# Auto-rebuild da API se o codigo-fonte for mais recente que o build
# (necessario apos um 'git pull' que adiciona rotas novas, ex.: condominios)
API_DIST="artifacts/api-server/dist/index.mjs"
NEEDS_BUILD=false
if [[ ! -f "$API_DIST" ]]; then
  NEEDS_BUILD=true
else
  NEWEST_SRC=$(find artifacts/api-server/src lib -name '*.ts' -newer "$API_DIST" -print -quit 2>/dev/null)
  [[ -n "$NEWEST_SRC" ]] && NEEDS_BUILD=true
fi
if [[ "$NEEDS_BUILD" == "true" ]]; then
  echo "Detectadas alteracoes — recompilando API..."
  pnpm --filter @workspace/api-server run build || {
    echo "[erro] Falha ao compilar API. Execute: bash update.sh"
    exit 1
  }
  pnpm --filter @workspace/db run push 2>/dev/null || true
fi

echo "Iniciando API..."
PORT=8080 node artifacts/api-server/dist/index.mjs &
API_PID=$!

echo "Iniciando Frontend..."
(cd artifacts/viax-scout && PORT=5173 BASE_PATH=/ pnpm exec vite --host 0.0.0.0) &
WEB_PID=$!

echo ""
echo "ViaX:Trace rodando!"
echo "   Frontend : http://localhost:5173"
echo "   API      : http://localhost:8080"
echo ""
echo "Para ativar GeocodeR BR (precisao maxima): bash ~/viax-system/start-geocodebr.sh"
echo "Acesse pelo navegador: http://127.0.0.1:5173"
echo "Ctrl+C para parar"

trap "kill $API_PID $WEB_PID 2>/dev/null; pg_ctl stop -D \"$PG_DATA\" 2>/dev/null; echo Encerrado." EXIT INT TERM
wait
STARTSCRIPT
chmod +x "$APP_DIR/start.sh"

# start-geocodebr.sh — inicia o microserviço R/CNEFE separadamente
cat > "$APP_DIR/start-geocodebr.sh" <<'GEOCOBRSCRIPT'
#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Iniciador do microserviço GeocodeR BR (CNEFE/IBGE)
#  Porta padrão: 8002
#  Pré-requisito: R e pacotes plumber/geocodebr instalados
#    -> bash ~/viax-system/install-geocodebr-termux.sh
# =============================================================================
cd "$(dirname "$0")"

if ! command -v R &>/dev/null; then
  echo "ERRO: R nao encontrado."
  echo "Execute: bash ~/viax-system/install-geocodebr-termux.sh"
  exit 1
fi

# Verifica se os pacotes necessarios estao instalados
R --no-save --quiet -e "
  pkgs <- c('plumber','geocodebr','future')
  missing <- pkgs[!sapply(pkgs, requireNamespace, quietly=TRUE)]
  if (length(missing)>0) {
    cat('Pacotes ausentes:', paste(missing, collapse=', '), '\n')
    cat('Execute: bash ~/viax-system/install-geocodebr-termux.sh\n')
    quit(status=1)
  }
" || exit 1

GEOCODEBR_PORT="${GEOCODEBR_PORT:-8002}"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================================"
echo " ViaX:Trace — GeocodeR BR Microservice"
echo " Porta   : $GEOCODEBR_PORT"
echo " Fonte   : CNEFE / IBGE (via geocodebr)"
echo "============================================================"
echo ""
echo "IMPORTANTE: No primeiro inicio, o geocodebr baixa os dados"
echo "do CNEFE (~1-2 GB). Isso pode demorar varios minutos."
echo ""
echo "Aguarde a mensagem 'Listening on ...' antes de usar."
echo ""

GEOCODEBR_PORT="$GEOCODEBR_PORT" Rscript "$APP_DIR/artifacts/geocodebr-service/start.R"
GEOCOBRSCRIPT
chmod +x "$APP_DIR/start-geocodebr.sh"

# stop.sh
cat > "$APP_DIR/stop.sh" <<'STOPSCRIPT'
#!/usr/bin/env bash
PG_DATA="${PREFIX}/var/lib/postgresql"
pkill -f "viax-system" 2>/dev/null || true
pkill -f "api-server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "plumber" 2>/dev/null || true
pkill -f "geocodebr" 2>/dev/null || true
pg_ctl stop -D "$PG_DATA" 2>/dev/null && echo "PostgreSQL parado" || true
echo "ViaX:Trace encerrado."
STOPSCRIPT
chmod +x "$APP_DIR/stop.sh"

# update.sh — sincroniza com a ultima versao do repositorio (git pull + rebuild)
cat > "$APP_DIR/update.sh" <<'UPDATESCRIPT'
#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Atualizador (Termux)
#  Use sempre que houver novas funcionalidades no repositorio,
#  por exemplo: ferramenta de condominios, novas rotas da API, etc.
# =============================================================================
set -e
cd "$(dirname "$0")"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${CYAN}==> Parando servicos em execucao...${NC}"
bash ./stop.sh 2>/dev/null || true

echo -e "${CYAN}==> Atualizando codigo (git pull)...${NC}"
git fetch origin
git reset --hard origin/main

# Reaplica os overrides Android no pnpm-workspace.yaml apos o pull
sed -i '/android/d' pnpm-workspace.yaml 2>/dev/null || true

echo -e "${CYAN}==> Iniciando PostgreSQL...${NC}"
PG_DATA="${PREFIX}/var/lib/postgresql"
pg_ctl start -D "$PG_DATA" -l "$PG_DATA/postgresql.log" -w -t 30 2>/dev/null || true

echo -e "${CYAN}==> Instalando dependencias atualizadas...${NC}"
pnpm install --no-frozen-lockfile

echo -e "${CYAN}==> Aplicando alteracoes do schema do banco...${NC}"
set -a; source .env; set +a
pnpm --filter @workspace/db run push || echo -e "${YELLOW}[aviso] push do schema falhou${NC}"

echo -e "${CYAN}==> Recompilando API...${NC}"
pnpm --filter @workspace/api-server run build

echo ""
echo -e "${GREEN}Atualizacao concluida! Inicie com: bash start.sh${NC}"
UPDATESCRIPT
chmod +x "$APP_DIR/update.sh"

success "Scripts criados"

# ---------------------------------------------------------------------------
# RESULTADO FINAL
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ViaX:Trace instalado com sucesso! (Termux)    ║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Para iniciar:"
echo -e "  ${CYAN}${BOLD}bash ~/viax-system/start.sh${NC}"
echo ""
echo -e "  Para parar:"
echo -e "  ${CYAN}bash ~/viax-system/stop.sh${NC}"
echo ""
echo -e "  Para atualizar (puxar ultima versao + recompilar):"
echo -e "  ${CYAN}bash ~/viax-system/update.sh${NC}"
echo ""
if [[ "$GEOCODEBR_AVAILABLE" == true ]]; then
  echo -e "  ${GREEN}GeocodeR BR disponivel!${NC} Para ativar (precisao maxima BR):"
  echo -e "  ${CYAN}bash ~/viax-system/start-geocodebr.sh${NC}"
  echo -e "  Depois configure em Configuracoes -> Instancias -> GeocodeR BR"
  echo ""
else
  echo -e "  ${YELLOW}GeocodeR BR nao instalado.${NC} Para instalar depois:"
  echo -e "  ${CYAN}bash ~/viax-system/install-geocodebr-termux.sh${NC}"
  echo ""
fi
echo -e "  Acesse no navegador do Android:"
echo -e "  ${BOLD}http://127.0.0.1:${WEB_PORT}${NC}"
echo ""
echo -e "  Dica: Instale o app Termux:Widget para iniciar com um toque!"
echo ""
