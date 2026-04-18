#!/usr/bin/env bash
# =============================================================================
#  ViaX: System — Instalador Universal (Linux & macOS)
#  https://github.com/esmagafetos/Viax-Scout
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/esmagafetos/Viax-Scout.git"
APP_DIR="${VIAX_DIR:-$HOME/viax-system}"
DB_NAME="viax_system"
DB_USER="${USER:-viax}"
API_PORT=8080
WEB_PORT=5173

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
die()     { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}==> $*${NC}"; }

detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then echo "macos"
  elif [[ -f /etc/debian_version ]]; then echo "debian"
  elif [[ -f /etc/redhat-release ]]; then echo "redhat"
  elif [[ -f /etc/arch-release ]]; then echo "arch"
  else echo "unknown"; fi
}

OS=$(detect_os)

header "ViaX: System v8.0 — Instalador ($(uname -s))"
echo -e "  Repositório : ${REPO_URL}"
echo -e "  Diretório   : ${APP_DIR}"
echo -e "  OS detectado: ${OS}"
echo ""

# ---------------------------------------------------------------------------
# 1. VERIFICAR / INSTALAR NODE.JS 18+
# ---------------------------------------------------------------------------
header "Verificando Node.js"
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [[ "$NODE_MAJOR" -lt 18 ]]; then
    warn "Node.js $NODE_VER detectado — versão mínima é 18. Instalando versão LTS..."
    INSTALL_NODE=true
  else
    success "Node.js $NODE_VER"
    INSTALL_NODE=false
  fi
else
  warn "Node.js não encontrado. Instalando..."
  INSTALL_NODE=true
fi

if [[ "$INSTALL_NODE" == "true" ]]; then
  case "$OS" in
    macos)
      if ! command -v brew &>/dev/null; then
        info "Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install node@20
      brew link --overwrite node@20 --force || true
      ;;
    debian)
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    redhat)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo yum install -y nodejs
      ;;
    arch)
      sudo pacman -Sy --noconfirm nodejs npm
      ;;
    *)
      die "OS não suportado automaticamente. Instale Node.js 18+ manualmente: https://nodejs.org"
      ;;
  esac
  success "Node.js instalado: $(node --version)"
fi

# ---------------------------------------------------------------------------
# 2. VERIFICAR / INSTALAR PNPM
# ---------------------------------------------------------------------------
header "Verificando pnpm"
if ! command -v pnpm &>/dev/null; then
  warn "pnpm não encontrado. Instalando via npm..."
  npm install -g pnpm
  success "pnpm instalado: $(pnpm --version)"
else
  success "pnpm $(pnpm --version)"
fi

# ---------------------------------------------------------------------------
# 3. VERIFICAR / INSTALAR POSTGRESQL
# ---------------------------------------------------------------------------
header "Verificando PostgreSQL"
if ! command -v psql &>/dev/null; then
  warn "PostgreSQL não encontrado. Instalando..."
  case "$OS" in
    macos)
      brew install postgresql@15
      brew services start postgresql@15
      export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
      ;;
    debian)
      sudo apt-get install -y postgresql postgresql-contrib
      sudo systemctl enable --now postgresql
      ;;
    redhat)
      sudo dnf install -y postgresql-server postgresql-contrib
      sudo postgresql-setup --initdb
      sudo systemctl enable --now postgresql
      ;;
    arch)
      sudo pacman -Sy --noconfirm postgresql
      sudo -u postgres initdb --locale=pt_BR.UTF-8 -D /var/lib/postgres/data
      sudo systemctl enable --now postgresql
      ;;
    *)
      die "Instale PostgreSQL 14+ manualmente: https://www.postgresql.org/download/"
      ;;
  esac
  success "PostgreSQL instalado"
else
  success "PostgreSQL $(psql --version | head -1)"
fi

# ---------------------------------------------------------------------------
# 4. CLONAR / ATUALIZAR REPOSITÓRIO
# ---------------------------------------------------------------------------
header "Configurando repositório"
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repositório já existe — atualizando..."
  git -C "$APP_DIR" pull --rebase
else
  info "Clonando repositório..."
  git clone "$REPO_URL" "$APP_DIR"
fi
success "Código em: $APP_DIR"

# ---------------------------------------------------------------------------
# 5. CONFIGURAR BANCO DE DADOS
# ---------------------------------------------------------------------------
header "Configurando banco de dados"

# Criar usuário/banco se não existir
if [[ "$OS" == "macos" ]]; then
  PG_CMD="psql postgres"
else
  PG_CMD="sudo -u postgres psql"
fi

DB_EXISTS=$($PG_CMD -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")
if [[ "$DB_EXISTS" != "1" ]]; then
  info "Criando banco '$DB_NAME'..."
  $PG_CMD -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || warn "Banco pode já existir — continuando..."
fi
success "Banco '$DB_NAME' pronto"

# Obter DATABASE_URL
if [[ "$OS" == "macos" ]]; then
  DATABASE_URL="postgresql://$(whoami)@localhost:5432/$DB_NAME"
else
  if read -rsp "Senha do PostgreSQL (deixe em branco para sem senha): " PG_PASS; then
    echo ""
    if [[ -n "$PG_PASS" ]]; then
      DATABASE_URL="postgresql://postgres:${PG_PASS}@localhost:5432/$DB_NAME"
    else
      DATABASE_URL="postgresql://postgres@localhost:5432/$DB_NAME"
    fi
  fi
fi
success "DATABASE_URL configurada"

# ---------------------------------------------------------------------------
# 6. CRIAR ARQUIVO .ENV
# ---------------------------------------------------------------------------
header "Criando arquivo .env"
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 24 /dev/urandom | base64)
ENV_FILE="$APP_DIR/.env"

cat > "$ENV_FILE" <<EOF
# ViaX: System — Configuração de Ambiente
# Gerado em $(date '+%Y-%m-%d %H:%M:%S')

DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
NODE_ENV=development
PORT=${API_PORT}
EOF

success ".env criado em $ENV_FILE"

# ---------------------------------------------------------------------------
# 7. INSTALAR DEPENDÊNCIAS
# ---------------------------------------------------------------------------
header "Instalando dependências (pnpm install)"
cd "$APP_DIR"
pnpm install
success "Dependências instaladas"

# ---------------------------------------------------------------------------
# 8. MIGRAR BANCO DE DADOS
# ---------------------------------------------------------------------------
header "Aplicando schema no banco de dados"
cd "$APP_DIR"
pnpm --filter @workspace/db run push 2>/dev/null || \
  pnpm -r --if-present run push || \
  warn "Push do schema pode ter falhado — verifique DATABASE_URL"
success "Schema aplicado"

# ---------------------------------------------------------------------------
# 9. BUILD DA APLICAÇÃO
# ---------------------------------------------------------------------------
header "Compilando TypeScript"
cd "$APP_DIR"
pnpm --filter @workspace/api-server run build
success "Build concluído"

# ---------------------------------------------------------------------------
# 10. CRIAR SCRIPT DE INICIALIZAÇÃO
# ---------------------------------------------------------------------------
START_SCRIPT="$APP_DIR/start.sh"
cat > "$START_SCRIPT" <<STARTSCRIPT
#!/usr/bin/env bash
# Inicia ViaX: System (API + Frontend)
cd "$APP_DIR"
export \$(cat .env | grep -v '^#' | xargs)

echo "Iniciando API em http://localhost:${API_PORT} ..."
PORT=${API_PORT} pnpm --filter @workspace/api-server run start &
API_PID=\$!

echo "Iniciando Frontend em http://localhost:${WEB_PORT} ..."
PORT=${WEB_PORT} BASE_PATH=/ pnpm --filter @workspace/viax-scout run dev &
WEB_PID=\$!

echo ""
echo "✅ ViaX: System rodando!"
echo "   Frontend : http://localhost:${WEB_PORT}"
echo "   API      : http://localhost:${API_PORT}"
echo "   Ctrl+C para parar"
echo ""

trap "kill \$API_PID \$WEB_PID 2>/dev/null; echo Encerrado." EXIT INT TERM
wait
STARTSCRIPT
chmod +x "$START_SCRIPT"
success "Script de início criado: $START_SCRIPT"

# ---------------------------------------------------------------------------
# PRONTO
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║     ViaX: System instalado com sucesso!  ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Para iniciar o sistema:"
echo -e "  ${CYAN}${BOLD}bash $START_SCRIPT${NC}"
echo ""
echo -e "  Ou manualmente:"
echo -e "  ${CYAN}cd $APP_DIR && PORT=${API_PORT} pnpm --filter @workspace/api-server run start &${NC}"
echo -e "  ${CYAN}PORT=${WEB_PORT} BASE_PATH=/ pnpm --filter @workspace/viax-scout run dev${NC}"
echo ""
echo -e "  Frontend : ${BOLD}http://localhost:${WEB_PORT}${NC}"
echo -e "  API      : ${BOLD}http://localhost:${API_PORT}${NC}"
echo ""
