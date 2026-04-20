#!/usr/bin/env bash
# ViaX:Trace — GeocodeR BR para Termux (Android)
# Instala R via proot-distro (Ubuntu) — r-base foi removido do Termux oficial.
# Uso: bash install-geocodebr-termux.sh
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
ok()  { echo -e "${G}[ok]${N} $*"; }
inf() { echo -e "${C}[..] $*${N}"; }
die() { echo -e "\033[0;31m[erro]${N} $*" >&2; exit 1; }

echo -e "\n${B}${C}ViaX:Trace — GeocodeR BR${N}  (proot-distro + Ubuntu + R)\n"
echo -e "${Y}Espaço: ~3.5 GB livres necessários   Tempo: 20-60 min${N}\n"

# Detecta diretório da app
[[ -d "$HOME/viax-system" ]] && APP="$HOME/viax-system" || APP="$(pwd)"
PLUMBER="$APP/artifacts/geocodebr-service/plumber.R"
START_R="$APP/artifacts/geocodebr-service/start.R"

# ---------------------------------------------------------------------------
inf "Instalando proot-distro..."
pkg install -y proot-distro 2>/dev/null
ok "proot-distro pronto"

# ---------------------------------------------------------------------------
inf "Verificando Ubuntu no proot-distro..."
proot-distro install ubuntu 2>/dev/null || true          # ignora "already installed"
proot-distro login ubuntu -- true 2>/dev/null \
  || die "Ubuntu inacessível. Tente: proot-distro reset ubuntu"
ok "Ubuntu disponível"

# ---------------------------------------------------------------------------
inf "Instalando R e dependências dentro do Ubuntu..."
proot-distro login ubuntu -- bash -c "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    r-base r-base-dev \
    libcurl4-openssl-dev libssl-dev libxml2-dev \
    libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
    build-essential ca-certificates 2>/dev/null
"
ok "R instalado"

# ---------------------------------------------------------------------------
inf "Instalando pacotes R (plumber, geocodebr, future) — pode demorar..."
proot-distro login ubuntu -- Rscript - <<'REOF'
options(repos = c(CRAN = "https://cloud.r-project.org/"),
        Ncpus = max(1L, parallel::detectCores() - 1L))
pkgs <- c("plumber","geocodebr","future","promises","jsonlite")
for (p in pkgs) {
  if (!requireNamespace(p, quietly=TRUE)) {
    cat(sprintf("Instalando %s...\n", p))
    install.packages(p, dependencies=TRUE)
  } else cat(sprintf("[ok] %s\n", p))
}
miss <- pkgs[!sapply(pkgs, requireNamespace, quietly=TRUE)]
if (length(miss)) { cat("FALHA:", paste(miss, collapse=", "), "\n"); quit(status=1) }
cat("Todos os pacotes instalados!\n")
REOF
ok "Pacotes R prontos"

# ---------------------------------------------------------------------------
inf "Copiando arquivos do microserviço para o Ubuntu..."
UBUNTU_HOME="${PREFIX}/var/lib/proot-distro/installed-rootfs/ubuntu/root/viax-geocodebr"
mkdir -p "$UBUNTU_HOME"
[[ -f "$PLUMBER" ]] && cp "$PLUMBER" "$UBUNTU_HOME/" || inf "plumber.R não encontrado (copie manualmente)"
[[ -f "$START_R"  ]] && cp "$START_R"  "$UBUNTU_HOME/" || true
ok "Arquivos copiados → /root/viax-geocodebr/ (dentro do Ubuntu)"

# ---------------------------------------------------------------------------
inf "Criando start-geocodebr.sh..."
cat > "$APP/start-geocodebr.sh" <<SCRIPT
#!/usr/bin/env bash
# ViaX:Trace — Inicia GeocodeR BR (Ubuntu via proot-distro, porta 8002)
PORT="\${GEOCODEBR_PORT:-8002}"
echo "GeocodeR BR iniciando na porta \$PORT..."
echo "(Primeiro início: baixa CNEFE ~1-2 GB — aguarde 'Listening on 0.0.0.0:\$PORT')"
proot-distro login ubuntu -- bash -c "
  export GEOCODEBR_PORT=\$PORT
  [[ -f /root/viax-geocodebr/start.R  ]] && exec Rscript /root/viax-geocodebr/start.R
  [[ -f /root/viax-geocodebr/plumber.R ]] && exec Rscript /root/viax-geocodebr/plumber.R
  echo 'ERRO: plumber.R não encontrado em /root/viax-geocodebr/' && exit 1
"
SCRIPT
chmod +x "$APP/start-geocodebr.sh"
ok "start-geocodebr.sh criado"

# ---------------------------------------------------------------------------
# Adiciona GEOCODEBR_URL ao .env (comentado)
[[ -f "$APP/.env" ]] && ! grep -q "GEOCODEBR_URL" "$APP/.env" && \
  printf "\n# GeocodeR BR — ative após: bash $APP/start-geocodebr.sh\n# GEOCODEBR_URL=http://localhost:8002\n" >> "$APP/.env"

echo -e "\n${G}${B}Instalação concluída!${N}"
echo -e "\n  Iniciar:   ${C}bash $APP/start-geocodebr.sh${N}"
echo -e "  Ativar:    Configurações → Instâncias → GeocodeR BR"
echo -e "  .env:      ${C}GEOCODEBR_URL=http://localhost:8002${N}\n"
