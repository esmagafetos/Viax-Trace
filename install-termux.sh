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
  git -C "$APP_DIR" pull --rebase
else
  git clone "$REPO_URL" "$APP_DIR"
fi
success "Código em: $APP_DIR"

# ---------------------------------------------------------------------------
# 5. ARQUIVO .ENV
# ---------------------------------------------------------------------------
header "Criando .env"
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || date | md5sum | head -c 40)
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
NODE_ENV=development
PORT=${API_PORT}
EOF
success ".env criado"

# ---------------------------------------------------------------------------
# 6. INSTALAR DEPENDÊNCIAS E MIGRAR BANCO
# ---------------------------------------------------------------------------
header "Instalando dependências"
cd "$APP_DIR"
pnpm install
success "Dependências instaladas"

header "Aplicando schema"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push || warn "Falha ao aplicar schema — verifique o PostgreSQL e DATABASE_URL"
success "Schema aplicado"

header "Compilando API"
pnpm --filter @workspace/api-server run build
success "Build concluído"

# ---------------------------------------------------------------------------
# 7. SCRIPTS DE INICIALIZAÇÃO
# ---------------------------------------------------------------------------
header "Criando scripts de controle"

# start.sh
cat > "$APP_DIR/start.sh" <<'STARTSCRIPT'
#!/usr/bin/env bash
cd "$(dirname "$0")"
source .env 2>/dev/null || export $(grep -v '^#' .env | xargs)

PG_DATA="${PREFIX}/var/lib/postgresql"

echo "Iniciando PostgreSQL..."
pg_ctl start -D "$PG_DATA" -l "$PG_DATA/postgresql.log" -w -t 30 2>/dev/null || true

echo "Iniciando API..."
PORT=8080 node artifacts/api-server/dist/index.mjs &
API_PID=$!

echo "Iniciando Frontend..."
(cd artifacts/viax-scout && PORT=5173 BASE_PATH=/ pnpm exec vite --host 0.0.0.0) &
WEB_PID=$!

echo ""
echo "✅ ViaX: System rodando!"
echo "   Frontend : http://localhost:5173"
echo "   API      : http://localhost:8080"
echo ""
echo "Acesse pelo navegador: http://127.0.0.1:5173"
echo "Ctrl+C para parar"

trap "kill $API_PID $WEB_PID 2>/dev/null; pg_ctl stop -D \"$PG_DATA\" 2>/dev/null; echo Encerrado." EXIT INT TERM
wait
STARTSCRIPT
chmod +x "$APP_DIR/start.sh"

# stop.sh
cat > "$APP_DIR/stop.sh" <<'STOPSCRIPT'
#!/usr/bin/env bash
PG_DATA="${PREFIX}/var/lib/postgresql"
pkill -f "viax-system" 2>/dev/null || true
pkill -f "api-server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pg_ctl stop -D "$PG_DATA" 2>/dev/null && echo "PostgreSQL parado" || true
echo "ViaX: System encerrado."
STOPSCRIPT
chmod +x "$APP_DIR/stop.sh"

success "Scripts criados"

# ---------------------------------------------------------------------------
# RESULTADO FINAL
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ViaX: System instalado com sucesso! (Termux)║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Para iniciar:"
echo -e "  ${CYAN}${BOLD}bash ~/viax-system/start.sh${NC}"
echo ""
echo -e "  Para parar:"
echo -e "  ${CYAN}bash ~/viax-system/stop.sh${NC}"
echo ""
echo -e "  Acesse no navegador do Android:"
echo -e "  ${BOLD}http://127.0.0.1:${WEB_PORT}${NC}"
echo ""
echo -e "  Dica: Instale o app Termux:Widget para iniciar com um toque!"
echo ""
