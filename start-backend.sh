#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Iniciador do Backend para o App Android Nativo
#
#  Uso (no Termux):
#    bash ~/viax-system/start-backend.sh
#
#  Este script inicia APENAS a API (porta 8080), sem o frontend web.
#  A URL exibida abaixo deve ser colada no app ViaX:Trace ->
#  "Configurar servidor".
#
#  Pré-requisito: ter executado install-termux.sh antes.
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PORT="${PORT:-8080}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[aviso]${NC} $*"; }
die()     { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }

cd "$APP_DIR"

# ---------------------------------------------------------------------------
# Carregar variáveis de ambiente
# ---------------------------------------------------------------------------
if [[ -f ".env" ]]; then
  set -a; source .env; set +a
else
  die ".env não encontrado. Execute install-termux.sh primeiro:\n  curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install-termux.sh | bash"
fi

# ---------------------------------------------------------------------------
# PostgreSQL — iniciar e verificar
# ---------------------------------------------------------------------------
PG_DATA="${PREFIX:-/data/data/com.termux/files/usr}/var/lib/postgresql"

if [[ ! -d "$PG_DATA/base" ]]; then
  die "PostgreSQL não inicializado. Execute install-termux.sh primeiro."
fi

info "Iniciando PostgreSQL..."
pg_ctl start -D "$PG_DATA" -l "$PG_DATA/postgresql.log" -w -t 30 2>/dev/null \
  && success "PostgreSQL rodando" \
  || { warn "PostgreSQL já pode estar rodando — continuando..."; }

# ---------------------------------------------------------------------------
# Auto-migração: aplica novos schemas sem destruir dados
# ---------------------------------------------------------------------------
info "Verificando schema do banco de dados..."
if DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push 2>&1 | grep -qiE "no changes|already"; then
  success "Schema já está atualizado."
else
  success "Schema aplicado com sucesso."
fi

# ---------------------------------------------------------------------------
# Auto-rebuild da API se os fontes forem mais novos que o build
# ---------------------------------------------------------------------------
API_DIST="artifacts/api-server/dist/index.mjs"
NEEDS_BUILD=false

if [[ ! -f "$API_DIST" ]]; then
  NEEDS_BUILD=true
  warn "Build da API não encontrado — compilando..."
else
  NEWEST_SRC=$(find artifacts/api-server/src lib -name '*.ts' -newer "$API_DIST" -print -quit 2>/dev/null || true)
  if [[ -n "$NEWEST_SRC" ]]; then
    NEEDS_BUILD=true
    info "Fontes alterados — recompilando API..."
  fi
fi

if [[ "$NEEDS_BUILD" == "true" ]]; then
  pnpm --filter @workspace/api-server run build \
    && success "API compilada." \
    || die "Falha ao compilar API. Rode: bash update.sh"
fi

# ---------------------------------------------------------------------------
# Detectar IPs de rede
# ---------------------------------------------------------------------------
LOCAL_URL="http://127.0.0.1:${API_PORT}"

LAN_IP=$(ip -4 addr show 2>/dev/null \
  | grep -oP '(?<=inet\s)(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)' \
  | head -1 || true)

# ---------------------------------------------------------------------------
# Iniciar servidor da API
# ---------------------------------------------------------------------------
info "Iniciando ViaX:Trace API na porta ${API_PORT}..."
export PORT="$API_PORT"
export HOST="0.0.0.0"
export NODE_ENV="${NODE_ENV:-production}"

node artifacts/api-server/dist/index.mjs &
API_PID=$!

sleep 1

if ! kill -0 "$API_PID" 2>/dev/null; then
  die "Servidor não iniciou. Verifique o log acima."
fi

# ---------------------------------------------------------------------------
# Exibir URL para o app
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║          ViaX:Trace Backend — Rodando!               ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}URL para o app (mesmo aparelho Android):${NC}"
echo -e ""
echo -e "  ${CYAN}${BOLD}  ▶  ${LOCAL_URL}  ◀  ${NC}"
echo ""
if [[ -n "$LAN_IP" ]]; then
  echo -e "  URL para acesso via Wi-Fi (outro dispositivo):"
  echo -e "  ${CYAN}  http://${LAN_IP}:${API_PORT}${NC}"
  echo ""
fi
echo -e "  ${YELLOW}Cole a URL acima no app: Configurar servidor → Testar conexão${NC}"
echo ""
echo -e "  Pressione Ctrl+C para encerrar o servidor."
echo ""

trap "kill \$API_PID 2>/dev/null; pg_ctl stop -D \"$PG_DATA\" -m fast 2>/dev/null; echo -e \"${NC}Servidor encerrado.\"" EXIT INT TERM
wait "$API_PID"
