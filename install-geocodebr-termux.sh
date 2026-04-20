#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Instalador GeocodeR BR para Termux (Android)
#  Motor  : CNEFE / IBGE via pacote geocodebr do IPEA
#  Porta  : 8002
#
#  IMPORTANTE: r-base foi removido do repositório oficial do Termux.
#  Este script usa proot-distro (Ubuntu) como método principal —
#  o único método confiável disponível hoje sem root no Android.
#
#  Como usar:
#    bash ~/viax-system/install-geocodebr-termux.sh
#
#  Pré-requisito: Termux do F-Droid (NÃO da Play Store)
#    https://f-droid.org/packages/com.termux/
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[aviso]${NC} $*"; }
die()     { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}==> $*${NC}"; }

# ---------------------------------------------------------------------------
# Verificações iniciais
# ---------------------------------------------------------------------------
[[ -z "${TERMUX_VERSION:-}" ]] && [[ ! -d "/data/data/com.termux" ]] && \
  die "Este script é exclusivo para Android via Termux."

echo ""
echo -e "${BOLD}${CYAN}ViaX:Trace — Instalador GeocodeR BR${NC}"
echo -e "  Motor  : CNEFE / IBGE (geocodebr / IPEA)"
echo -e "  Método : proot-distro (Ubuntu) + R nativo"
echo -e "  Porta  : 8002"
echo ""
warn "Espaço necessário: ~2 GB (Ubuntu) + ~500 MB (R + pacotes) + ~1 GB (CNEFE cache)"
warn "Tempo estimado   : 20-60 minutos (compilação + download)"
echo ""

# Detectar diretório da aplicação
if   [[ -d "$HOME/viax-system" ]];                                  then APP_DIR="$HOME/viax-system"
elif [[ -f "$(pwd)/artifacts/geocodebr-service/plumber.R" ]];       then APP_DIR="$(pwd)"
else APP_DIR="$HOME"; fi
info "Diretório da aplicação: $APP_DIR"

# ---------------------------------------------------------------------------
# 1. ATUALIZAR REPOSITÓRIOS NATIVOS DO TERMUX
# ---------------------------------------------------------------------------
header "Atualizando repositórios Termux"
pkg update -y 2>/dev/null || warn "Atualização parcial — continuando."

# ---------------------------------------------------------------------------
# 2. VERIFICAR SE R JÁ EXISTE NATIVAMENTE (instalação legada ou futura)
# ---------------------------------------------------------------------------
header "Verificando R nativo"

R_NATIVE=false
if command -v R &>/dev/null; then
  success "R nativo encontrado: $(R --version 2>&1 | head -1)"
  R_NATIVE=true
else
  info "Tentando pkg install r-base (pode falhar — removido do Termux oficial)..."
  if pkg install -y r-base 2>/dev/null; then
    success "R nativo instalado via pkg"
    R_NATIVE=true
  else
    info "r-base não disponível no Termux. Usando proot-distro (método recomendado)."
  fi
fi

# ---------------------------------------------------------------------------
# 3. MÉTODO PROOT-DISTRO (método principal e mais confiável)
# ---------------------------------------------------------------------------
install_via_proot() {
  header "Instalando proot-distro"
  pkg install -y proot-distro 2>/dev/null || die "Falha ao instalar proot-distro. Rode 'pkg install proot-distro' manualmente."
  success "proot-distro instalado"

  header "Instalando Ubuntu 24.04 (imagem mínima ~200 MB download)"
  UBUNTU_ROOTFS="${PREFIX}/var/lib/proot-distro/installed-rootfs/ubuntu"
  if [[ -d "$UBUNTU_ROOTFS/usr" ]]; then
    info "Ubuntu já instalado no proot-distro"
  else
    proot-distro install ubuntu || die "Falha ao instalar Ubuntu. Verifique conexão e espaço disponível."
    success "Ubuntu instalado"
  fi

  header "Atualizando Ubuntu e instalando R"
  info "Atualizando apt e instalando dependências de sistema..."

  proot-distro login ubuntu -- bash -c "
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y --no-install-recommends \
      r-base \
      r-base-dev \
      libcurl4-openssl-dev \
      libssl-dev \
      libxml2-dev \
      libgdal-dev \
      libgeos-dev \
      libproj-dev \
      libudunits2-dev \
      build-essential \
      curl \
      ca-certificates \
      2>/dev/null
    echo '[ok] Dependências do sistema instaladas'
    R --version | head -1
  " || die "Falha ao instalar R dentro do Ubuntu. Verifique: proot-distro login ubuntu"

  success "R instalado dentro do Ubuntu (proot)"

  header "Instalando pacotes R (plumber, geocodebr, future)"
  info "Compilação pode demorar 20-40 minutos..."

  proot-distro login ubuntu -- bash -c "
    R --no-save --quiet <<'REOF'
options(
  repos   = c(CRAN = 'https://cloud.r-project.org/'),
  Ncpus   = max(1L, as.integer(system('nproc', intern=TRUE)) - 1L)
)

pkgs <- c('plumber', 'geocodebr', 'future', 'promises', 'jsonlite')

for (p in pkgs) {
  if (requireNamespace(p, quietly = TRUE)) {
    cat(sprintf('[ok] %s ja instalado\n', p))
    next
  }
  cat(sprintf('[...] Instalando %s ...\n', p))
  tryCatch(
    install.packages(p, dependencies = TRUE),
    error = function(e) cat(sprintf('[erro] %s: %s\n', p, conditionMessage(e)))
  )
}

ausentes <- pkgs[!sapply(pkgs, requireNamespace, quietly = TRUE)]
if (length(ausentes) == 0) {
  cat('\n[ok] Todos os pacotes instalados!\n')
} else {
  cat(sprintf('\n[aviso] Pacotes com falha: %s\n', paste(ausentes, collapse=', ')))
  quit(status = 1)
}
REOF
  " || {
    warn "Alguns pacotes R falharam."
    warn "Para depurar: proot-distro login ubuntu"
    warn "Depois: R -e \"install.packages('geocodebr')\""
    return 1
  }

  success "Pacotes R instalados dentro do Ubuntu"
}

# ---------------------------------------------------------------------------
# 4. INSTALAR PACOTES R NATIVOS (se R nativo encontrado)
# ---------------------------------------------------------------------------
install_r_packages_native() {
  info "Instalando dependências do sistema para pacotes espaciais..."
  for dep in libgdal libgeos proj libudunits2 libcurl openssl libxml2; do
    pkg install -y "$dep" 2>/dev/null || true
  done

  info "Instalando pacotes R nativos..."
  R --no-save --quiet <<'REOF'
options(
  repos = c(CRAN = "https://cloud.r-project.org/"),
  Ncpus = max(1L, parallel::detectCores() - 1L)
)
pkgs <- c("plumber", "geocodebr", "future", "promises", "jsonlite")
for (p in pkgs) {
  if (requireNamespace(p, quietly = TRUE)) {
    cat(sprintf("[ok] %s ja instalado\n", p)); next
  }
  cat(sprintf("[...] Instalando %s ...\n", p))
  tryCatch(
    install.packages(p, dependencies = TRUE),
    error = function(e) cat(sprintf("[erro] %s: %s\n", p, conditionMessage(e)))
  )
}
ausentes <- pkgs[!sapply(pkgs, requireNamespace, quietly = TRUE)]
if (length(ausentes) == 0) cat("\n[ok] Todos os pacotes instalados!\n") else {
  cat(sprintf("\n[aviso] Pacotes com falha: %s\n", paste(ausentes, collapse=", ")))
  quit(status = 1)
}
REOF
}

# ---------------------------------------------------------------------------
# Executa o método adequado
# ---------------------------------------------------------------------------
USE_PROOT=false

if [[ "$R_NATIVE" == true ]]; then
  header "Instalando pacotes R (modo nativo)"
  if install_r_packages_native; then
    success "Instalação nativa concluída"
  else
    warn "Falha na instalação nativa. Tentando via proot-distro..."
    USE_PROOT=true
    install_via_proot
  fi
else
  USE_PROOT=true
  install_via_proot
fi

# ---------------------------------------------------------------------------
# 5. COPIAR plumber.R PARA DENTRO DO UBUNTU (se proot ativo)
# ---------------------------------------------------------------------------
PLUMBER_SRC="$APP_DIR/artifacts/geocodebr-service/plumber.R"
START_R_SRC="$APP_DIR/artifacts/geocodebr-service/start.R"

if [[ "$USE_PROOT" == true ]]; then
  UBUNTU_ROOT="$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu"
  UBUNTU_VIAX="$UBUNTU_ROOT/root/viax-geocodebr"

  header "Copiando arquivos do microserviço para o Ubuntu"
  mkdir -p "$UBUNTU_VIAX"

  if [[ -f "$PLUMBER_SRC" ]]; then
    cp "$PLUMBER_SRC" "$UBUNTU_VIAX/plumber.R"
    success "plumber.R copiado para Ubuntu"
  else
    warn "plumber.R não encontrado em $PLUMBER_SRC"
    warn "Copie manualmente: cp $PLUMBER_SRC $UBUNTU_VIAX/plumber.R"
  fi

  if [[ -f "$START_R_SRC" ]]; then
    cp "$START_R_SRC" "$UBUNTU_VIAX/start.R"
    success "start.R copiado para Ubuntu"
  fi

  # Script de sincronização de arquivos (para re-copiar após updates)
  cat > "$APP_DIR/sync-geocodebr-files.sh" <<SYNCSCRIPT
#!/usr/bin/env bash
# Sincroniza arquivos do microserviço para dentro do Ubuntu (proot-distro)
SRC="$APP_DIR/artifacts/geocodebr-service"
DEST="$UBUNTU_VIAX"
mkdir -p "\$DEST"
cp "\$SRC/plumber.R" "\$DEST/" 2>/dev/null && echo "[ok] plumber.R sincronizado" || echo "[erro] plumber.R nao encontrado"
cp "\$SRC/start.R"   "\$DEST/" 2>/dev/null && echo "[ok] start.R sincronizado"   || true
echo "Para reiniciar o servidor: bash $APP_DIR/start-geocodebr.sh"
SYNCSCRIPT
  chmod +x "$APP_DIR/sync-geocodebr-files.sh"
fi

# ---------------------------------------------------------------------------
# 6. CRIAR SCRIPT DE INICIALIZAÇÃO
# ---------------------------------------------------------------------------
header "Criando script de inicialização"

if [[ "$USE_PROOT" == true ]]; then
  # Script de inicio via proot-distro
  cat > "$APP_DIR/start-geocodebr.sh" <<STARTSCRIPT
#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Inicia GeocodeR BR via proot-distro (Ubuntu)
#  Porta: 8002
# =============================================================================

if ! command -v proot-distro &>/dev/null; then
  echo "[erro] proot-distro nao instalado."
  echo "Execute: bash $APP_DIR/install-geocodebr-termux.sh"
  exit 1
fi

if ! proot-distro list 2>/dev/null | grep -q "ubuntu.*installed"; then
  echo "[erro] Ubuntu nao instalado no proot-distro."
  echo "Execute: bash $APP_DIR/install-geocodebr-termux.sh"
  exit 1
fi

PORT="\${GEOCODEBR_PORT:-8002}"
PLUMBER_SCRIPT="/root/viax-geocodebr/plumber.R"
START_SCRIPT="/root/viax-geocodebr/start.R"

echo "============================================================"
echo " ViaX:Trace — GeocodeR BR (Ubuntu via proot-distro)"
echo " Porta   : \$PORT"
echo " Fonte   : CNEFE / IBGE"
echo "============================================================"
echo ""
echo "AVISO: No primeiro inicio, o geocodebr baixa dados do CNEFE"
echo "(~1-2 GB). Aguarde 'Listening on 0.0.0.0:\$PORT'."
echo ""

# Sincroniza arquivos mais recentes
$APP_DIR/sync-geocodebr-files.sh 2>/dev/null || true

proot-distro login ubuntu -- bash -c "
  export GEOCODEBR_PORT=\$PORT
  if [ -f \$START_SCRIPT ]; then
    Rscript \$START_SCRIPT
  else
    Rscript \$PLUMBER_SCRIPT
  fi
"
STARTSCRIPT
else
  # Script de inicio nativo (R no Termux)
  cat > "$APP_DIR/start-geocodebr.sh" <<STARTSCRIPT
#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Inicia GeocodeR BR (R nativo no Termux)
#  Porta: 8002
# =============================================================================

if ! command -v R &>/dev/null; then
  echo "[erro] R nao encontrado."
  echo "Execute: bash $APP_DIR/install-geocodebr-termux.sh"
  exit 1
fi

R --no-save --quiet -e "
  pkgs <- c('plumber','geocodebr','future')
  ausentes <- pkgs[!sapply(pkgs, requireNamespace, quietly=TRUE)]
  if (length(ausentes) > 0) {
    cat('[erro] Pacotes ausentes:', paste(ausentes, collapse=', '), '\n')
    cat('Execute: bash $APP_DIR/install-geocodebr-termux.sh\n')
    quit(status=1)
  }
" || exit 1

PORT="\${GEOCODEBR_PORT:-8002}"
PLUMBER_SCRIPT="$APP_DIR/artifacts/geocodebr-service/start.R"
[[ -f "\$PLUMBER_SCRIPT" ]] || PLUMBER_SCRIPT="$APP_DIR/artifacts/geocodebr-service/plumber.R"

echo "============================================================"
echo " ViaX:Trace — GeocodeR BR (R nativo)"
echo " Porta   : \$PORT"
echo " Fonte   : CNEFE / IBGE"
echo "============================================================"

export GEOCODEBR_PORT="\$PORT"
Rscript "\$PLUMBER_SCRIPT"
STARTSCRIPT
fi

chmod +x "$APP_DIR/start-geocodebr.sh"
success "start-geocodebr.sh criado"

# ---------------------------------------------------------------------------
# 7. ATUALIZAR .ENV
# ---------------------------------------------------------------------------
ENV_FILE="$APP_DIR/.env"
if [[ -f "$ENV_FILE" ]] && ! grep -q "^GEOCODEBR_URL=" "$ENV_FILE"; then
  {
    echo ""
    echo "# GeocodeR BR — ative após iniciar: bash $APP_DIR/start-geocodebr.sh"
    echo "# GEOCODEBR_URL=http://localhost:8002"
  } >> "$ENV_FILE"
  info "Variável GEOCODEBR_URL adicionada ao .env (comentada)"
fi

# ---------------------------------------------------------------------------
# RESULTADO FINAL
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  GeocodeR BR instalado com sucesso!                      ║${NC}"
if [[ "$USE_PROOT" == true ]]; then
echo -e "${GREEN}${BOLD}║  Método: proot-distro (Ubuntu 24.04)                     ║${NC}"
else
echo -e "${GREEN}${BOLD}║  Método: R nativo Termux                                 ║${NC}"
fi
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}1. Inicie o microserviço:${NC}"
echo -e "  ${CYAN}bash $APP_DIR/start-geocodebr.sh${NC}"
echo ""
echo -e "  ${BOLD}2. Adicione ao .env da API:${NC}"
echo -e "  ${CYAN}GEOCODEBR_URL=http://localhost:8002${NC}"
echo ""
echo -e "  ${BOLD}3. Ative na interface:${NC}"
echo -e "  Configurações → Instâncias → GeocodeR BR"
echo ""
if [[ "$USE_PROOT" == true ]]; then
echo -e "  ${YELLOW}Nota sobre proot-distro:${NC}"
echo -e "  O Ubuntu roda dentro do Termux sem root."
echo -e "  A porta 8002 é compartilhada automaticamente com o Termux."
echo -e "  Para acessar o Ubuntu diretamente: ${CYAN}proot-distro login ubuntu${NC}"
echo ""
fi
echo -e "  ${YELLOW}Primeiro início:${NC} O geocodebr baixa dados do CNEFE (~1-2 GB)."
echo -e "  O download ocorre uma única vez e fica em cache."
echo ""
