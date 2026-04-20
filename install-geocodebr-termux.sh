#!/usr/bin/env bash
# ViaX:Trace — GeocodeR BR para Termux (Android)
# Instala R via proot-distro (Ubuntu) e configura o microserviço geocodebr.
# Uso: bash install-geocodebr-termux.sh

# ---------------------------------------------------------------------------
# Cores e helpers
# ---------------------------------------------------------------------------
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
ok()   { echo -e "${G}[ok]${N} $*"; }
inf()  { echo -e "${C}[..] $*${N}"; }
warn() { echo -e "${Y}[av] $*${N}"; }
die()  { echo -e "${R}[erro]${N} $*" >&2; exit 1; }
step() { echo -e "\n${B}${C}==> $*${N}"; }

echo -e "\n${B}${C}ViaX:Trace — GeocodeR BR${N}  (proot-distro + Ubuntu + R)\n"
echo -e "${Y}Espaço necessário: ~3.5 GB livres   Tempo estimado: 30-90 min${N}\n"

# ---------------------------------------------------------------------------
# Detecta diretório da app
# ---------------------------------------------------------------------------
if [[ -d "$HOME/viax-system" ]]; then
  APP="$HOME/viax-system"
elif [[ -f "$(pwd)/package.json" ]]; then
  APP="$(pwd)"
else
  APP="$(cd "$(dirname "$0")" && pwd)"
fi
PLUMBER="$APP/artifacts/geocodebr-service/plumber.R"
START_R="$APP/artifacts/geocodebr-service/start.R"
UBUNTU_ROOT="${PREFIX}/var/lib/proot-distro/installed-rootfs/ubuntu"
UBUNTU_WORK="$UBUNTU_ROOT/root/viax-geocodebr"

# Função auxiliar: executar dentro do Ubuntu
ubuntu() { proot-distro login ubuntu -- bash -c "$1"; }

# ---------------------------------------------------------------------------
# PASSO 1 — proot-distro
# ---------------------------------------------------------------------------
step "Instalando proot-distro..."
if ! command -v proot-distro &>/dev/null; then
  pkg install -y proot-distro || die "Falha ao instalar proot-distro"
fi
ok "proot-distro disponível"

# ---------------------------------------------------------------------------
# PASSO 2 — Ubuntu
# ---------------------------------------------------------------------------
step "Configurando Ubuntu no proot-distro..."
if [[ ! -d "$UBUNTU_ROOT" ]]; then
  inf "Instalando Ubuntu (primeira vez — pode demorar alguns minutos)..."
  proot-distro install ubuntu || die "Falha ao instalar Ubuntu"
fi
proot-distro login ubuntu -- true 2>/dev/null \
  || die "Ubuntu inacessível. Tente: proot-distro reset ubuntu"
ok "Ubuntu pronto"

# ---------------------------------------------------------------------------
# PASSO 3 — Corrige DNS dentro do Ubuntu (problema comum no Termux/proot)
# ---------------------------------------------------------------------------
step "Corrigindo DNS do Ubuntu..."
cat > "$UBUNTU_ROOT/etc/resolv.conf" << 'EOF'
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF
ok "DNS configurado (1.1.1.1 / 8.8.8.8)"

# ---------------------------------------------------------------------------
# PASSO 4 — Detecta versão do Ubuntu
# ---------------------------------------------------------------------------
step "Detectando versão do Ubuntu..."
UBUNTU_CODENAME=$(ubuntu ". /etc/os-release && echo \$VERSION_CODENAME" 2>/dev/null | tr -d '[:space:]')
[[ -z "$UBUNTU_CODENAME" ]] && UBUNTU_CODENAME="noble"
inf "Ubuntu: ${UBUNTU_CODENAME}"

# PPM tem binários pré-compilados para focal, jammy e noble.
# Para versões mais novas usa noble como fallback.
PPM_CODENAME="$UBUNTU_CODENAME"
case "$UBUNTU_CODENAME" in
  focal|jammy|noble) ;;
  *) warn "Ubuntu '${UBUNTU_CODENAME}' sem binários PPM — usando noble como fallback"
     PPM_CODENAME="noble" ;;
esac
PPM_URL="https://packagemanager.posit.co/cran/__linux__/${PPM_CODENAME}/latest"
ok "Repositórios: PPM (${PPM_CODENAME}) + CRAN + DuckDB"

# ---------------------------------------------------------------------------
# PASSO 5 — Atualiza apt e instala dependências de sistema
# ---------------------------------------------------------------------------
step "Instalando dependências de sistema via apt..."
inf "Atualizando listas de pacotes..."
ubuntu "export DEBIAN_FRONTEND=noninteractive && apt-get update -qq" \
  || warn "apt-get update retornou erro — continuando..."

inf "Instalando bibliotecas de sistema base..."
ubuntu "
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y --no-install-recommends \
    r-base r-base-dev cmake \
    libcurl4-openssl-dev libssl-dev libxml2-dev \
    libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
    libuv1-dev libsodium-dev \
    libfontconfig1-dev libfreetype-dev \
    libharfbuzz-dev libfribidi-dev \
    libpng-dev libjpeg-dev \
    libzstd-dev liblz4-dev libbrotli-dev libsnappy-dev \
    build-essential ca-certificates git pkg-config curl wget \
    2>&1 | grep -E '^(E:|Get:|Setting up|0 upgraded|[0-9]+ upgraded)' || true
" || die "Falha crítica ao instalar dependências de sistema"

# Instala libarrow-dev do repositório oficial do Apache Arrow
# (biblioteca C++ pré-compilada para arm64 — essencial para o pacote R 'arrow')
inf "Adicionando repositório oficial do Apache Arrow..."
ubuntu "
  export DEBIAN_FRONTEND=noninteractive
  cd /tmp
  # Usa o pacote APT source para noble (compatível com questing no arm64)
  wget -q 'https://apache.jfrog.io/artifactory/arrow/ubuntu/apache-arrow-apt-source-latest-noble.deb' \
    -O apache-arrow.deb 2>&1 || true
  if [[ -f apache-arrow.deb && -s apache-arrow.deb ]]; then
    apt-get install -y ./apache-arrow.deb 2>&1 | tail -3
    apt-get update -qq 2>&1 | tail -1
    apt-get install -y --no-install-recommends \
      libarrow-dev libarrow-dataset-dev libparquet-dev \
      2>&1 | grep -E '^(E:|Get:|Setting up|0 upgraded|[0-9]+ upgraded)' || true
    echo '[ok] libarrow-dev instalado do repositório oficial'
  else
    echo '[av] Download do APT source do Arrow falhou — arrow sera compilado do zero'
  fi
  rm -f apache-arrow.deb
"
ok "Dependências de sistema instaladas"

# ---------------------------------------------------------------------------
# PASSO 6 — Instala pacotes R via apt (binários prontos, sem compilação)
# ---------------------------------------------------------------------------
step "Instalando pacotes R via apt (pré-compilados)..."
ubuntu "
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y --no-install-recommends \
    r-cran-jsonlite r-cran-httr r-cran-curl r-cran-openssl \
    r-cran-xml2 r-cran-stringi r-cran-stringr \
    r-cran-dplyr r-cran-tidyr r-cran-rlang r-cran-cli \
    r-cran-glue r-cran-lifecycle r-cran-vctrs r-cran-pillar \
    r-cran-r6 r-cran-tibble r-cran-purrr r-cran-magrittr \
    r-cran-sf r-cran-units r-cran-s2 r-cran-wk \
    r-cran-future r-cran-promises r-cran-later r-cran-fastmap \
    r-cran-mime r-cran-rcpp r-cran-digest \
    r-cran-generics r-cran-tidyselect r-cran-utf8 r-cran-fansi \
    r-cran-withr r-cran-parallelly r-cran-globals r-cran-listenv \
    r-cran-data.table r-cran-nanoarrow \
    2>&1 | grep -E '^(E:|Get:|Setting up|0 upgraded|[0-9]+ upgraded)' || true
" || warn "Alguns pacotes apt não encontrados — serão instalados via CRAN"
ok "Pacotes apt instalados"

# ---------------------------------------------------------------------------
# PASSO 7 — Escreve e executa script R para instalar plumber + geocodebr
# ---------------------------------------------------------------------------
step "Instalando plumber e geocodebr via CRAN/PPM/DuckDB/Arrow..."
inf "Esta etapa instala ~20 pacotes. Arrow compilará rápido (libarrow-dev já instalado)."
inf "Tempo estimado: 15-40 min."

mkdir -p "$UBUNTU_WORK"
cat > "$UBUNTU_ROOT/root/viax-geocodebr/_install_pkgs.R" << RSCRIPT
# ── Variáveis de ambiente para arrow usar binário pré-compilado ───────────────
# LIBARROW_BINARY=true  → baixa binário C++ em vez de compilar (muito mais rápido)
# NOT_CRAN=true         → habilita o download de binários do Apache Arrow
Sys.setenv(
  LIBARROW_BINARY        = "true",
  NOT_CRAN               = "true",
  ARROW_R_DEV            = "false",
  LIBARROW_MINIMAL       = "false"
)

# ── Configuração de repositórios ─────────────────────────────────────────────
# ARROW  → R-universe oficial do Apache Arrow (binários arm64 pré-compilados)
# DUCKDB → R-universe oficial do DuckDB       (binários arm64 pré-compilados)
# PPM    → Posit Package Manager              (binários Ubuntu noble)
# CRAN   → fallback geral
options(
  repos = c(
    ARROW  = "https://apache.r-universe.dev",
    DUCKDB = "https://duckdb.r-universe.dev",
    PPM    = "${PPM_URL}",
    CRAN   = "https://cloud.r-project.org"
  ),
  Ncpus   = max(1L, parallel::detectCores() - 1L),
  timeout = 600
)

# ── Remove locks órfãos ───────────────────────────────────────────────────────
lib   <- .libPaths()[1]
locks <- list.files(lib, pattern = "^00LOCK-", full.names = TRUE)
if (length(locks)) {
  message("Removendo ", length(locks), " lock(s) orfao(s)...")
  unlink(locks, recursive = TRUE)
}

# ── Instalação segura com retry ───────────────────────────────────────────────
safe_install <- function(pkg, tries = 3) {
  if (requireNamespace(pkg, quietly = TRUE)) {
    message("[ok] ", pkg, " ja instalado"); return(invisible(TRUE))
  }
  for (i in seq_len(tries)) {
    message("\n[", i, "/", tries, "] Instalando: ", pkg, " ...")
    result <- tryCatch({
      install.packages(pkg, dependencies = c("Depends", "Imports", "LinkingTo"),
                       quiet = FALSE)
      TRUE
    }, error = function(e) {
      message("[aviso] Tentativa ", i, " falhou: ", conditionMessage(e))
      FALSE
    })
    if (result && requireNamespace(pkg, quietly = TRUE)) {
      message("[ok] ", pkg, " instalado com sucesso"); return(invisible(TRUE))
    }
    if (i < tries) Sys.sleep(3)
  }
  message("[FALHA] Nao foi possivel instalar: ", pkg)
  return(invisible(FALSE))
}

# ── Instala na ordem correta de dependências ──────────────────────────────────
pkgs_order <- c(
  # --- plumber e suas deps ---
  "sodium",       # dep do plumber (compila com libsodium-dev)
  "webutils",     # dep do plumber
  "httpuv",       # dep do plumber (usa libuv1-dev do sistema)
  "plumber",      # servidor HTTP R

  # --- deps do geocodebr: instaladas explicitamente antes para evitar
  #     que geocodebr instale versões erradas no momento errado ---
  "fs",           # dep de processx (usa libuv1-dev)
  "processx",     # dep de callr
  "callr",        # dep de enderecobr
  "checkmate",    # dep de geocodebr
  "backports",    # dep de varias
  "blob",         # dep de duckdb
  "uuid",         # dep de geocodebr
  "dbplyr",       # dep de geocodebr
  "h3lib",        # dep de h3r
  "h3r",          # dep de geocodebr
  "geometries",   # dep de sfheaders
  "sfheaders",    # dep de geocodebr
  # nanoarrow instalado via apt (r-cran-nanoarrow)
  "geoarrow",     # dep de geocodebr (precisa de arrow + nanoarrow)
  "arrow",        # dep do geocodebr — com libarrow-dev ja instalado, so compila wrapper fino
  "duckdb",       # dep do geocodebr — binario via duckdb r-universe
  "duckspatial",  # dep do geocodebr
  "enderecobr",   # dep do geocodebr
  "httr2",        # dep do geocodebr

  # --- pacote principal ---
  "geocodebr"
)

results <- vapply(pkgs_order, safe_install, logical(1))

# ── Relatório final ───────────────────────────────────────────────────────────
ok_pkgs  <- names(results)[results]
nok_pkgs <- names(results)[!results]

cat("\n=== Resultado da instalacao ===\n")
if (length(ok_pkgs))  cat("[ok]    ", paste(ok_pkgs,  collapse = ", "), "\n")
if (length(nok_pkgs)) cat("[FALHA] ", paste(nok_pkgs, collapse = ", "), "\n")

essenciais <- c("plumber", "geocodebr")
faltando   <- essenciais[!sapply(essenciais, requireNamespace, quietly = TRUE)]

if (length(faltando)) {
  cat("\nERRO: pacotes essenciais ausentes:", paste(faltando, collapse = ", "), "\n")
  quit(status = 1)
} else {
  cat("\nTodos os pacotes essenciais prontos!\n")
}
RSCRIPT

ubuntu "Rscript /root/viax-geocodebr/_install_pkgs.R" \
  || warn "Instalação de pacotes R finalizada com avisos (veja saída acima)"
ok "Etapa de pacotes R concluída"

# ---------------------------------------------------------------------------
# PASSO 8 — Copia arquivos do microserviço
# ---------------------------------------------------------------------------
step "Copiando arquivos do microserviço..."
if [[ -f "$PLUMBER" ]]; then
  cp "$PLUMBER" "$UBUNTU_WORK/"
  ok "plumber.R copiado para o Ubuntu"
else
  warn "plumber.R não encontrado em $PLUMBER — copie manualmente para $UBUNTU_WORK/"
fi
[[ -f "$START_R" ]] && cp "$START_R" "$UBUNTU_WORK/" && ok "start.R copiado"

# ---------------------------------------------------------------------------
# PASSO 9 — Cria script de inicialização
# ---------------------------------------------------------------------------
step "Criando start-geocodebr.sh..."
cat > "$APP/start-geocodebr.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
# ViaX:Trace — Inicia o microserviço GeocodeR BR (Ubuntu via proot-distro)
PORT="${GEOCODEBR_PORT:-8002}"

echo ""
echo "  GeocodeR BR iniciando na porta $PORT..."
echo "  Aguarde a mensagem: 'Listening on 0.0.0.0:$PORT'"
echo ""
echo "  AVISO: No primeiro inicio, os dados CNEFE (~1-2 GB) serao"
echo "         baixados automaticamente. Isso pode levar varios minutos."
echo ""

exec proot-distro login ubuntu -- bash -c "
  export GEOCODEBR_PORT=$PORT
  if [[ -f /root/viax-geocodebr/start.R ]]; then
    exec Rscript /root/viax-geocodebr/start.R
  elif [[ -f /root/viax-geocodebr/plumber.R ]]; then
    exec Rscript /root/viax-geocodebr/plumber.R
  else
    echo ''
    echo 'ERRO: nenhum arquivo R encontrado em /root/viax-geocodebr/'
    echo 'Execute novamente: bash ~/viax-system/install-geocodebr-termux.sh'
    exit 1
  fi
"
STARTSCRIPT
chmod +x "$APP/start-geocodebr.sh"
ok "start-geocodebr.sh criado"

# ---------------------------------------------------------------------------
# PASSO 10 — Atualiza .env
# ---------------------------------------------------------------------------
if [[ -f "$APP/.env" ]] && ! grep -q "GEOCODEBR_URL" "$APP/.env"; then
  printf '\n# GeocodeR BR — descomente apos iniciar: bash %s/start-geocodebr.sh\n# GEOCODEBR_URL=http://localhost:8002\n' "$APP" >> "$APP/.env"
  ok ".env atualizado com GEOCODEBR_URL (comentado)"
fi

# ---------------------------------------------------------------------------
# Resumo final
# ---------------------------------------------------------------------------
echo ""
echo -e "${G}${B}╔══════════════════════════════════════════╗${N}"
echo -e "${G}${B}║    Instalação concluída com sucesso!     ║${N}"
echo -e "${G}${B}╚══════════════════════════════════════════╝${N}"
echo ""
echo -e "  ${B}Iniciar o serviço:${N}"
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
