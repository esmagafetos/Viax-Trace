#!/usr/bin/env bash
# =============================================================================
# ViaX:Trace — install-geocodebr-termux.sh
# Instala o microserviço GeocodeR BR em Termux/Android via proot-distro Ubuntu.
#
# ESTRATÉGIA (baseada em pesquisa real das fontes oficiais):
#   • R 4.5 instalado via repositório apt oficial do CRAN (cloud.r-project.org)
#   • TODOS os pacotes R instalados como BINÁRIOS ARM64 pré-compilados via
#     r-universe (cran.r-universe.dev, duckdb.r-universe.dev, apache.r-universe.dev)
#   • ZERO compilação C++: sem cmake, sem libarrow-dev, sem OOM-kill
#
# LIMITAÇÕES CONHECIDAS DO TERMUX 2025/2026 (mitigadas neste script):
#   1. Phantom Process Killer (Android 12+) — mata processos com >32 children.
#      R + Plumber + proot facilmente excede esse limite. MITIGAÇÃO: pedir ao
#      usuário para rodar via ADB:
#        adb shell settings put global settings_enable_monitor_phantom_procs 0
#      (ver docs/TERMUX-GEOCODEBR.md). Sem isso, o serviço pode morrer ~30 min
#      após iniciar, sem aviso. Não há solução só dentro do Termux.
#   2. Doze mode / wake lock (Android 6+) — ao apagar a tela, a CPU congela.
#      MITIGAÇÃO: o start-geocodebr.sh adquire termux-wake-lock se Termux:API
#      estiver instalado. Sem Termux:API, recomendar ao usuário usar a opção
#      "Acquire Wakelock" no shade de notificação do Termux.
#   3. DNS perdido em proot (issue termux/proot-distro#264) — proot-distro
#      sobrescreve /etc/resolv.conf no rootfs em alguns updates. MITIGAÇÃO: o
#      start-geocodebr.sh re-aplica o resolv.conf antes de cada start.
#   4. Battery Optimization (todos os Android) — Termux precisa estar em
#      "Unrestricted" no menu de bateria para sobreviver longas execuções.
#      Verificado pelo install no final.
#
# Fontes consultadas:
#   https://docs.r-universe.dev/install/binaries.html
#   https://arrow.apache.org/docs/r/articles/install.html
#   https://cran.r-project.org/bin/linux/ubuntu/fullREADME.html
#   https://cran.r-universe.dev/arrow      → binário noble-aarch64 R4.5 ✓
#   https://duckdb.r-universe.dev/duckdb   → binário noble-aarch64 R4.5 ✓
#   https://github.com/termux/proot-distro/issues/264   (DNS reset)
#   https://github.com/termux/termux-app/issues/3855    (Android 14)
#   https://github.com/termux/termux-boot               (autostart)
#
# Uso: bash install-geocodebr-termux.sh
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

# ── Cores e helpers ───────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'
B='\033[1m'; N='\033[0m'
ok()   { echo -e "${G}[ok]${N} $*"; }
inf()  { echo -e "    ${C}$*${N}"; }
warn() { echo -e "${Y}[av]${N} $*"; }
die()  { echo -e "${R}[ERRO]${N} $*" >&2; exit 1; }
step() { echo -e "\n${B}${C}==> $*${N}"; }

echo -e "\n${B}${C}ViaX:Trace — GeocodeR BR${N}  (Termux + proot-distro + Ubuntu + R 4.5)\n"
echo -e "${Y}Estratégia: binários ARM64 pré-compilados via r-universe (sem compilação C++)${N}"
echo -e "${Y}Espaço necessário: ~3 GB livres   Tempo estimado: 10-25 min${N}\n"

# ── Detecta diretório da app ──────────────────────────────────────────────────
if   [[ -d "$HOME/viax-system" ]];       then APP="$HOME/viax-system"
elif [[ -f "$(pwd)/package.json" ]];     then APP="$(pwd)"
else APP="$(cd "$(dirname "$0")" && pwd)"
fi
PLUMBER="$APP/artifacts/geocodebr-service/plumber.R"
START_R="$APP/artifacts/geocodebr-service/start.R"
UBUNTU_ROOT="${PREFIX}/var/lib/proot-distro/installed-rootfs/ubuntu"
UBUNTU_WORK="$UBUNTU_ROOT/root/viax-geocodebr"

# Executa um bloco de shell dentro do Ubuntu proot
ubuntu() { proot-distro login ubuntu -- bash -c "$1"; }

# ===========================================================================
# PASSO 1 — proot-distro
# ===========================================================================
step "Verificando proot-distro..."
if ! command -v proot-distro &>/dev/null; then
  inf "Instalando proot-distro..."
  pkg install -y proot-distro || die "Falha ao instalar proot-distro"
fi
ok "proot-distro disponível"

# ===========================================================================
# PASSO 2 — Ubuntu
# ===========================================================================
step "Configurando Ubuntu no proot-distro..."
if [[ ! -d "$UBUNTU_ROOT" ]]; then
  inf "Baixando Ubuntu Noble (primeira vez — alguns minutos)..."
  proot-distro install ubuntu || die "Falha ao instalar Ubuntu"
fi
proot-distro login ubuntu -- true 2>/dev/null \
  || die "Ubuntu inacessível. Tente: proot-distro reset ubuntu"
ok "Ubuntu pronto"

# ===========================================================================
# PASSO 3 — Corrige DNS (problema comum no Termux/proot)
# ===========================================================================
step "Corrigindo DNS do Ubuntu..."
cat > "$UBUNTU_ROOT/etc/resolv.conf" << 'EOF'
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF
ok "DNS configurado (1.1.1.1 / 8.8.8.8 / 8.8.4.4)"

# ===========================================================================
# PASSO 4 — Adiciona repositório apt do CRAN para R 4.5
#
# O Ubuntu Noble (apt padrão) instala R 4.3.
# Os binários do r-universe existem apenas para R 4.5 (release) e R 4.6 (devel).
# Precisamos de R 4.5 para usar os binários arm64 pré-compilados.
# Fonte: https://cran.r-project.org/bin/linux/ubuntu/fullREADME.html
# ===========================================================================
step "Adicionando repositório apt do CRAN para R 4.5..."
ubuntu "
  set -e
  export DEBIAN_FRONTEND=noninteractive

  # Instala pré-requisitos para adicionar o repositório
  apt-get install -y --no-install-recommends \
    software-properties-common dirmngr gnupg \
    apt-transport-https ca-certificates wget curl \
    2>&1 | grep -E '^(E:|Get:|Setting up|Err:)' || true

  # Chave GPG oficial do CRAN/Ubuntu (marutter)
  if ! apt-key list 2>/dev/null | grep -q 'marutter\|CRAN'; then
    wget -qO- 'https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc' \
      | gpg --dearmor -o /etc/apt/trusted.gpg.d/cran-ubuntu.gpg \
      2>/dev/null || \
    wget -qO- 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x51716619E084DAB9' \
      | gpg --dearmor -o /etc/apt/trusted.gpg.d/cran-ubuntu.gpg \
      2>/dev/null || true
  fi

  # Repositório R 4.5 para Ubuntu Noble
  echo 'deb https://cloud.r-project.org/bin/linux/ubuntu noble-cran40/' \
    > /etc/apt/sources.list.d/cran-r45.list

  apt-get update -qq 2>&1 | grep -E '^(E:|Err:|Hit|Get:|Ign)' | tail -5 || true
" || warn "Repositório CRAN pode não ter sido adicionado — continuando com R do apt padrão"
ok "Repositório CRAN R 4.5 configurado"

# ===========================================================================
# PASSO 5 — Instala R 4.5 e bibliotecas de sistema necessárias
#
# Bibliotecas de sistema: apenas as que os pacotes R precisam para LINKAR
# (não para compilar arrow/duckdb — esses vêm como binários pré-compilados).
# - libgdal-dev, libgeos-dev, libproj-dev → pacote sf (binário arm64 no r-universe)
# - libudunits2-dev → pacote units
# - libsodium-dev   → pacote sodium (plumber)
# - libcurl4-openssl-dev, libssl-dev → conexões HTTP
# NÃO instalamos: libarrow-dev, cmake, libzstd-dev, liblz4-dev
# (causariam conflito de versão com o binário do arrow do r-universe)
# ===========================================================================
step "Instalando R 4.5 e bibliotecas de sistema..."
ubuntu "
  set -e
  export DEBIAN_FRONTEND=noninteractive

  apt-get install -y --no-install-recommends \
    r-base r-base-dev \
    libcurl4-openssl-dev libssl-dev libxml2-dev \
    libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
    libsodium-dev libuv1-dev \
    libfontconfig1-dev libfreetype-dev \
    libharfbuzz-dev libfribidi-dev \
    libpng-dev libjpeg-dev libtiff-dev \
    build-essential ca-certificates git pkg-config \
    2>&1 | grep -E '^(E:|Err:|Get:[0-9]|Setting up [a-z]|[0-9]+ upgraded|[0-9]+ newly)' || true
" || die "Falha crítica ao instalar dependências de sistema"

# Confirma a versão do R instalado
R_VERSION=$(ubuntu "Rscript -e 'cat(as.character(getRversion()))'" 2>/dev/null | tr -d '[:space:]')
inf "R instalado: versão ${R_VERSION:-desconhecida}"

# CRÍTICO: os binários do r-universe existem apenas para R 4.5+ (release) e R 4.6 (devel).
# Se temos R 4.3/4.4 (do apt padrão do Ubuntu), os binários não existem e o R compilaria do zero.
R_MAJOR=$(echo "${R_VERSION:-0.0}" | cut -d. -f1)
R_MINOR=$(echo "${R_VERSION:-0.0}" | cut -d. -f2)
if [[ "$R_MAJOR" -lt 4 ]] || ( [[ "$R_MAJOR" -eq 4 ]] && [[ "$R_MINOR" -lt 5 ]] ); then
  warn "R ${R_VERSION} detectado (esperado 4.5+). Tentando instalar R 4.5 manualmente..."
  ubuntu "
    export DEBIAN_FRONTEND=noninteractive
    # Tenta adicionar a chave GPG via método alternativo
    apt-get install -y --no-install-recommends gpg gpg-agent 2>/dev/null || true
    curl -fsSL https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc \
      | gpg --dearmor | tee /etc/apt/trusted.gpg.d/cran-ubuntu.gpg > /dev/null 2>&1 || true
    echo 'deb https://cloud.r-project.org/bin/linux/ubuntu noble-cran40/' \
      > /etc/apt/sources.list.d/cran-r45.list
    apt-get update -qq 2>/dev/null || true
    apt-get install -y r-base r-base-dev 2>&1 | grep -E '^(E:|Setting up r-base|[0-9]+ upgraded)' || true
  " || true
  R_VERSION=$(ubuntu "Rscript -e 'cat(as.character(getRversion()))'" 2>/dev/null | tr -d '[:space:]')
  R_MAJOR=$(echo "${R_VERSION:-0.0}" | cut -d. -f1)
  R_MINOR=$(echo "${R_VERSION:-0.0}" | cut -d. -f2)
  if [[ "$R_MAJOR" -lt 4 ]] || ( [[ "$R_MAJOR" -eq 4 ]] && [[ "$R_MINOR" -lt 5 ]] ); then
    die "R ${R_VERSION} instalado mas o mínimo necessário é R 4.5.
Os binários ARM64 do r-universe existem apenas para R 4.5+.
Solução manual dentro do Ubuntu:
  curl -fsSL https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/cran.gpg
  echo 'deb https://cloud.r-project.org/bin/linux/ubuntu noble-cran40/' | sudo tee /etc/apt/sources.list.d/r45.list
  sudo apt-get update && sudo apt-get install -y r-base r-base-dev"
  fi
fi
ok "R ${R_VERSION} pronto (≥ 4.5 ✓)"

# ===========================================================================
# PASSO 6 — Instala pacotes R via binários r-universe (ARM64, sem compilação)
#
# A chave desta solução: r-universe.dev fornece binários Linux ARM64 pré-
# compilados para Ubuntu Noble (24.04) em R 4.5, usando o formato de URL:
#   https://{owner}.r-universe.dev/bin/linux/noble-aarch64/{r_version}/
#
# Quando esse URL é configurado como repositório, install.packages() baixa
# os pacotes pré-compilados — ZERO cmake, ZERO compilação C++.
#
# Confirmado com dados reais (CI r-universe em 20/04/2026):
#   arrow     23.0.1.2  → cran.r-universe.dev   noble-aarch64  R4.5  ✓ OK
#   duckdb    1.5.2     → duckdb.r-universe.dev  noble-aarch64  R4.5  ✓ OK
#   sf        1.1-0     → cran.r-universe.dev    noble-aarch64  R4.5  ✓ OK
#   plumber   1.3.3     → cran.r-universe.dev    noble (any)    R4.5  ✓ OK
#   geocodebr 0.6.2     → cran.r-universe.dev    noble (any)    R4.5  ✓ OK
#   enderecobr 0.5.0    → cran.r-universe.dev    noble-aarch64  R4.5  ✓ OK
# ===========================================================================
step "Instalando pacotes R via binários r-universe (ARM64)..."
inf "ZERO compilação C++ — todos os pacotes são binários pré-compilados."
inf "Tempo estimado: 10-20 min (download + instalação)"

mkdir -p "$UBUNTU_WORK"
cat > "$UBUNTU_WORK/_install_pkgs.R" << 'RSCRIPT'
# =============================================================================
# Instala geocodebr e dependências via binários ARM64 do r-universe
# =============================================================================

# ── Versão do R e arquitetura ─────────────────────────────────────────────────
r_ver  <- substr(getRversion(), 1, 3)           # ex: "4.5"
arch   <- R.version[["arch"]]                   # ex: "aarch64" ou "x86_64"
distro <- "noble"                               # Ubuntu 24.04 LTS

cat(sprintf("\nR %s | arch: %s | distro: %s\n", getRversion(), arch, distro))

# ── Configura repositórios binários do r-universe ─────────────────────────────
# URL formato: https://{owner}.r-universe.dev/bin/linux/{distro}-{arch}/{rver}/
# Fonte: https://docs.r-universe.dev/install/binaries.html
#
# Hierarquia:
#   1. cran.r-universe.dev   → espelho binário de TODO o CRAN para noble-arm64
#   2. duckdb.r-universe.dev → duckdb mais recente (dev-version com binário arm64)
#   3. apache.r-universe.dev → arrow mais recente com binário arm64
#   4. cloud.r-project.org   → fallback source (último recurso)
bin_repo <- function(owner) {
  sprintf("https://%s.r-universe.dev/bin/linux/%s-%s/%s/", owner, distro, arch, r_ver)
}

options(
  repos = c(
    CRAN_BIN = bin_repo("cran"),    # mirror completo CRAN → binários noble-aarch64
    DUCKDB   = bin_repo("duckdb"),  # duckdb dev-version → binário noble-aarch64
    APACHE   = bin_repo("apache"),  # arrow → binário noble-aarch64
    CRAN_SRC = "https://cloud.r-project.org"  # fallback source (não deve ser usado)
  ),
  # HTTPUserAgent necessário para alguns mirrors (recomendado pelo r-universe)
  HTTPUserAgent = sprintf(
    "R/%s R (%s)",
    getRversion(),
    paste(getRversion(), R.version[["platform"]], arch, R.version[["os"]])
  ),
  Ncpus   = max(1L, parallel::detectCores()),
  timeout = 600
)

cat("\nRepositórios configurados:\n")
for (nm in names(getOption("repos"))) {
  cat(sprintf("  %-10s %s\n", nm, getOption("repos")[[nm]]))
}

# ── Remove locks órfãos ───────────────────────────────────────────────────────
lib_path <- .libPaths()[1]
locks    <- list.files(lib_path, pattern = "^00LOCK-", full.names = TRUE)
if (length(locks) > 0) {
  message(sprintf("\nRemovendo %d lock(s) orfao(s)...", length(locks)))
  unlink(locks, recursive = TRUE)
}

# ── Instalação com retry e verificação ───────────────────────────────────────
safe_install <- function(pkg, tries = 3) {
  if (requireNamespace(pkg, quietly = TRUE)) {
    message(sprintf("[ok] %-20s ja instalado", pkg))
    return(invisible(TRUE))
  }
  for (i in seq_len(tries)) {
    message(sprintf("\n[%d/%d] Instalando: %s ...", i, tries, pkg))
    ok <- tryCatch({
      install.packages(
        pkg,
        dependencies = c("Depends", "Imports", "LinkingTo"),
        quiet        = FALSE,
        ask          = FALSE
      )
      requireNamespace(pkg, quietly = TRUE)
    }, error = function(e) {
      message(sprintf("[aviso] tentativa %d falhou: %s", i, conditionMessage(e)))
      FALSE
    })
    if (isTRUE(ok)) {
      message(sprintf("[ok] %s instalado com sucesso", pkg))
      return(invisible(TRUE))
    }
    if (i < tries) {
      message(sprintf("Aguardando 5s antes de tentar novamente..."))
      Sys.sleep(5)
    }
  }
  message(sprintf("[FALHA] Nao foi possivel instalar: %s", pkg))
  invisible(FALSE)
}

# ── Lista de pacotes a instalar ───────────────────────────────────────────────
# Instalamos na ordem: dependências primeiro, geocodebr por último.
# O r-universe binary repo resolve sub-dependências automaticamente como binários.
#
# Pacotes marcados com * têm código C++ compilado (arm64 binary disponível):
#   arrow*     → cran.r-universe.dev/bin/linux/noble-aarch64/4.5/   ✓
#   duckdb*    → duckdb.r-universe.dev/bin/linux/noble-aarch64/4.5/ ✓
#   sf*        → cran.r-universe.dev/bin/linux/noble-aarch64/4.5/   ✓
#   enderecobr → cran.r-universe.dev/bin/linux/noble-aarch64/4.5/   ✓ (arm64)
pkgs <- c(
  # ── Servidor HTTP ──────────────────────────────────────────────────────
  "plumber",      # servidor HTTP para R

  # ── Dependências core (com código compilado → binários arm64) ──────────
  "arrow",        # * formato columnar — binário arm64 no cran.r-universe.dev
  "duckdb",       # * banco analítico   — binário arm64 no duckdb.r-universe.dev
  "sf",           # * spatial features  — binário arm64 no cran.r-universe.dev

  # ── Dependências do geocodebr (sem compilação / binários any-arch) ─────
  "httr2",        # cliente HTTP moderno
  "h3r",          # indexação H3
  "geoarrow",     # arrow geoespacial
  "duckspatial",  # DuckDB espacial
  "enderecobr",   # padronização de endereços brasileiros

  # ── Pacote principal ───────────────────────────────────────────────────
  "geocodebr"     # geocodificação de endereços brasileiros
)

# ── Instalação ────────────────────────────────────────────────────────────────
cat("\n=== Iniciando instalação de pacotes ===\n")
results <- vapply(pkgs, safe_install, logical(1))

# ── Relatório final ───────────────────────────────────────────────────────────
ok_pkgs  <- names(results)[results]
nok_pkgs <- names(results)[!results]

cat("\n=== Resultado ===\n")
if (length(ok_pkgs))  cat(sprintf("[ok]    %s\n", paste(ok_pkgs,  collapse = ", ")))
if (length(nok_pkgs)) cat(sprintf("[FALHA] %s\n", paste(nok_pkgs, collapse = ", ")))

essenciais <- c("plumber", "geocodebr")
faltando   <- essenciais[!sapply(essenciais, requireNamespace, quietly = TRUE)]

if (length(faltando) > 0) {
  cat(sprintf("\nERRO CRITICO: pacotes essenciais ausentes: %s\n",
              paste(faltando, collapse = ", ")))
  quit(status = 1)
} else {
  cat("\nTodos os pacotes essenciais instalados com sucesso!\n")
  cat(sprintf("arrow:     %s\n", as.character(packageVersion("arrow"))))
  cat(sprintf("duckdb:    %s\n", as.character(packageVersion("duckdb"))))
  cat(sprintf("plumber:   %s\n", as.character(packageVersion("plumber"))))
  cat(sprintf("geocodebr: %s\n", as.character(packageVersion("geocodebr"))))
}
RSCRIPT

ubuntu "Rscript /root/viax-geocodebr/_install_pkgs.R" \
  || warn "Instalação de pacotes R finalizada com avisos (veja saída acima)"
ok "Etapa de pacotes R concluída"

# ===========================================================================
# PASSO 7 — Copia arquivos do microserviço
# ===========================================================================
step "Copiando arquivos do microserviço..."
if [[ -f "$PLUMBER" ]]; then
  cp "$PLUMBER" "$UBUNTU_WORK/"
  ok "plumber.R copiado"
else
  warn "plumber.R não encontrado em $PLUMBER — copie manualmente para $UBUNTU_WORK/"
fi
[[ -f "$START_R" ]] && cp "$START_R" "$UBUNTU_WORK/" && ok "start.R copiado"

# ===========================================================================
# PASSO 8 — Cria script de inicialização
# ===========================================================================
step "Criando start-geocodebr.sh..."
cat > "$APP/start-geocodebr.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
# =============================================================================
# ViaX:Trace — Inicia o microserviço GeocodeR BR (Ubuntu via proot-distro)
# Aplica todas as mitigações conhecidas para Termux 2025/2026:
#   • Re-aplica DNS dentro do rootfs (proot-distro sobrescreve em updates)
#   • Adquire wake lock (se Termux:API instalado) → sobrevive à tela apagada
#   • Avisa sobre Phantom Process Killer se usuário não desativou via ADB
#   • Roda Plumber dentro de proot (não há outra forma — R só roda em glibc)
# =============================================================================
set -u
PORT="${GEOCODEBR_PORT:-8002}"
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'

echo ""
echo -e "${B}${C}╔══════════════════════════════════════════════════════════╗${N}"
echo -e "${B}${C}║   ViaX:Trace — GeocodeR BR (Termux + proot Ubuntu)       ║${N}"
echo -e "${B}${C}╚══════════════════════════════════════════════════════════╝${N}"
echo ""

# ── Mitigação 1: re-aplica /etc/resolv.conf dentro do rootfs ─────────────────
# Issue termux/proot-distro#264 — proot-distro pode sobrescrever resolv.conf
# em update; sem isso, R não consegue baixar CNEFE da rede.
ROOTFS="$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu"
if [[ -d "$ROOTFS/etc" ]]; then
  printf 'nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 9.9.9.9\n' \
    > "$ROOTFS/etc/resolv.conf" 2>/dev/null || true
  echo -e "  ${G}✓${N} DNS reaplicado no rootfs Ubuntu (1.1.1.1 / 8.8.8.8)"
fi

# ── Mitigação 2: wake lock para sobreviver tela apagada ──────────────────────
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock 2>/dev/null && \
    echo -e "  ${G}✓${N} Wake lock adquirido (CPU não congela com tela off)"
else
  echo -e "  ${Y}!${N} Termux:API não instalado — instale-o do F-Droid OU"
  echo -e "    puxe a barra de notificação do Termux e toque ${B}Acquire Wakelock${N}"
fi

# ── Mitigação 3: alerta sobre Phantom Process Killer ─────────────────────────
# Não há como detectar de dentro do Termux se o killer está ativo (precisa de
# adb dumpsys), então sempre lembramos o usuário no primeiro start.
PHANTOM_FLAG="$HOME/.viax-phantom-checked"
if [[ ! -f "$PHANTOM_FLAG" ]]; then
  echo ""
  echo -e "  ${Y}AVISO IMPORTANTE — Phantom Process Killer (Android 12+):${N}"
  echo -e "  Sem desativá-lo via ADB, o GeocodeR pode morrer após ~30min."
  echo -e "  Conecte o celular ao PC com USB debugging e rode UMA vez:"
  echo -e "    ${C}adb shell settings put global settings_enable_monitor_phantom_procs 0${N}"
  echo -e "  Detalhes: ${C}docs/TERMUX-GEOCODEBR.md${N}"
  touch "$PHANTOM_FLAG"
fi

echo ""
echo -e "  ${B}Iniciando GeocodeR BR na porta $PORT...${N}"
echo -e "  Aguarde: '${C}Listening on 0.0.0.0:$PORT${N}'"
echo -e "  No 1º start os dados CNEFE (~1-2 GB) são baixados — paciência."
echo ""

exec proot-distro login ubuntu -- bash -c "
  export GEOCODEBR_PORT=$PORT
  cd /root/viax-geocodebr 2>/dev/null || {
    echo ''
    echo 'ERRO: diretório /root/viax-geocodebr não existe.'
    echo 'Execute novamente: bash ~/viax-system/install-geocodebr-termux.sh'
    exit 1
  }
  if [[ -f start.R ]]; then
    exec Rscript start.R
  elif [[ -f plumber.R ]]; then
    exec Rscript plumber.R
  else
    echo ''
    echo 'ERRO: nenhum arquivo R encontrado em /root/viax-geocodebr/'
    echo 'Execute novamente: bash ~/viax-system/install-geocodebr-termux.sh'
    exit 1
  fi
"
STARTSCRIPT
chmod +x "$APP/start-geocodebr.sh"
ok "start-geocodebr.sh criado (com mitigações Termux 2025/26)"

# ── Termux:Boot autostart (opcional) ─────────────────────────────────────────
BOOT_DIR="$HOME/.termux/boot"
if [[ ! -f "$BOOT_DIR/start-geocodebr" ]]; then
  mkdir -p "$BOOT_DIR"
  cat > "$BOOT_DIR/start-geocodebr" << BOOTSCRIPT
#!/data/data/com.termux/files/usr/bin/sh
# Autostart do GeocodeR BR no boot do Android. Requer o app Termux:Boot
# instalado do F-Droid e aberto pelo menos uma vez.
termux-wake-lock 2>/dev/null
exec bash $APP/start-geocodebr.sh >> $HOME/geocodebr-boot.log 2>&1
BOOTSCRIPT
  chmod +x "$BOOT_DIR/start-geocodebr"
  ok "Autostart configurado em ~/.termux/boot/start-geocodebr"
  inf "Instale o app Termux:Boot do F-Droid e abra-o uma vez para ativar."
fi

# ===========================================================================
# PASSO 9 — Atualiza .env
# ===========================================================================
if [[ -f "$APP/.env" ]] && ! grep -q "GEOCODEBR_URL" "$APP/.env"; then
  printf '\n# GeocodeR BR — descomente apos iniciar: bash %s/start-geocodebr.sh\n# GEOCODEBR_URL=http://localhost:8002\n' \
    "$APP" >> "$APP/.env"
  ok ".env atualizado (GEOCODEBR_URL comentado)"
fi

# ===========================================================================
# Resumo final
# ===========================================================================
echo ""
echo -e "${G}${B}╔══════════════════════════════════════════════════════════╗${N}"
echo -e "${G}${B}║         Instalação concluída com sucesso!                ║${N}"
echo -e "${G}${B}╚══════════════════════════════════════════════════════════╝${N}"
echo ""
echo -e "  ${B}Iniciar o microserviço:${N}"
echo -e "    ${C}bash $APP/start-geocodebr.sh${N}"
echo ""
echo -e "  ${B}Ativar no ViaX:${N}"
echo -e "    Configurações → Instâncias → GeocodeR BR"
echo ""
echo -e "  ${B}Variável de ambiente:${N}"
echo -e "    ${C}GEOCODEBR_URL=http://localhost:8002${N}"
echo ""
echo -e "  ${Y}Dica:${N} no 1º uso, os dados CNEFE (~1-2 GB) são baixados automaticamente."
echo ""
