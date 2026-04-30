# =============================================================================
#  ViaX: System — Instalador para Windows (PowerShell 5.1+)
#  https://github.com/ViaXTrace/Viax-Trace
#
#  Como usar (PowerShell como Administrador):
#    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#    iwr -useb https://raw.githubusercontent.com/ViaXTrace/Viax-Trace/main/install.ps1 | iex
# =============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$REPO_URL  = "https://github.com/ViaXTrace/Viax-Trace.git"
$APP_DIR   = Join-Path $env:USERPROFILE "viax-system"
$DB_NAME   = "viax_system"
$API_PORT  = 8080
$WEB_PORT  = 5173

function Write-Header  { Write-Host "`n==> $args" -ForegroundColor Cyan }
function Write-Info    { Write-Host "[info] $args" -ForegroundColor Cyan }
function Write-Ok      { Write-Host "[ok]   $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[warn] $args" -ForegroundColor Yellow }
function Write-Fail    { Write-Host "[erro] $args" -ForegroundColor Red; exit 1 }

function Test-Command($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ViaX: System v8.0 — Instalador       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Repositório : $REPO_URL"
Write-Host "  Diretório   : $APP_DIR"
Write-Host ""

# ---------------------------------------------------------------------------
# 1. WINGET (verificar disponibilidade)
# ---------------------------------------------------------------------------
$useWinget = Test-Command "winget"
$useChoco  = Test-Command "choco"

if (-not $useWinget -and -not $useChoco) {
  Write-Warn "winget e chocolatey não encontrados. Tentando instalar chocolatey..."
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
  Refresh-Path
  $useChoco = Test-Command "choco"
}

# ---------------------------------------------------------------------------
# 2. NODE.JS
# ---------------------------------------------------------------------------
Write-Header "Verificando Node.js"
$nodeOk = $false
if (Test-Command "node") {
  $nodeVer = node -e "process.stdout.write(process.versions.node)"
  $nodeMajor = [int]($nodeVer.Split(".")[0])
  if ($nodeMajor -ge 18) {
    Write-Ok "Node.js $nodeVer"
    $nodeOk = $true
  } else {
    Write-Warn "Node.js $nodeVer detectado — versão mínima é 18"
  }
}
if (-not $nodeOk) {
  Write-Info "Instalando Node.js LTS..."
  if ($useWinget) {
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -h
  } elseif ($useChoco) {
    choco install nodejs-lts -y
  } else {
    Write-Fail "Instale Node.js 18+ manualmente: https://nodejs.org/en/download/"
  }
  Refresh-Path
  Write-Ok "Node.js instalado: $(node --version)"
}

# ---------------------------------------------------------------------------
# 3. PNPM
# ---------------------------------------------------------------------------
Write-Header "Verificando pnpm"
if (-not (Test-Command "pnpm")) {
  Write-Info "Instalando pnpm..."
  npm install -g pnpm
  Refresh-Path
}
Write-Ok "pnpm $(pnpm --version)"

# ---------------------------------------------------------------------------
# 4. GIT
# ---------------------------------------------------------------------------
Write-Header "Verificando Git"
if (-not (Test-Command "git")) {
  Write-Info "Instalando Git..."
  if ($useWinget) {
    winget install Git.Git --accept-source-agreements --accept-package-agreements -h
  } elseif ($useChoco) {
    choco install git -y
  } else {
    Write-Fail "Instale Git manualmente: https://git-scm.com/download/win"
  }
  Refresh-Path
}
Write-Ok "Git $(git --version)"

# ---------------------------------------------------------------------------
# 5. POSTGRESQL
# ---------------------------------------------------------------------------
Write-Header "Verificando PostgreSQL"
$pgInstalled = $false
if (Test-Command "psql") {
  $pgInstalled = $true
  Write-Ok "PostgreSQL detectado"
} else {
  Write-Info "Instalando PostgreSQL..."
  if ($useWinget) {
    winget install PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements -h
  } elseif ($useChoco) {
    choco install postgresql16 --params "/Password:viax123" -y
  } else {
    Write-Fail "Instale PostgreSQL manualmente: https://www.postgresql.org/download/windows/"
  }
  Refresh-Path
  $pgInstalled = $true
}

# Criar banco
Write-Info "Configurando banco '$DB_NAME'..."
$pgPath = (Get-Command "psql" -ErrorAction SilentlyContinue)?.Source
if ($pgPath) {
  & psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0 -or $true) {
    & psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>$null
  }
}
Write-Ok "Banco configurado"

# Configurar DATABASE_URL
$PgPass = Read-Host "Senha do postgres (padrão: viax123, Enter para pular)" -AsSecureString
$PgPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPass))
if ([string]::IsNullOrWhiteSpace($PgPassPlain)) { $PgPassPlain = "viax123" }
$DATABASE_URL = "postgresql://postgres:${PgPassPlain}@localhost:5432/$DB_NAME"

# ---------------------------------------------------------------------------
# 6. CLONAR REPOSITÓRIO
# ---------------------------------------------------------------------------
Write-Header "Clonando repositório"
if (Test-Path (Join-Path $APP_DIR ".git")) {
  Write-Info "Atualizando repositório existente..."
  git -C $APP_DIR pull --rebase
} else {
  git clone $REPO_URL $APP_DIR
}
Write-Ok "Código em: $APP_DIR"
Set-Location $APP_DIR

# ---------------------------------------------------------------------------
# 7. ARQUIVO .ENV
# ---------------------------------------------------------------------------
Write-Header "Criando .env"
$SESSION_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
$envContent = @"
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
NODE_ENV=development
PORT=$API_PORT

# geocodebr microservice (CNEFE/IBGE) — fallback para municipios do interior
# Deixe vazio para desativar. Apos subir o servico Docker:
#   docker compose -f artifacts\geocodebr-service\docker-compose.yml up -d
# Configure: GEOCODEBR_URL=http://localhost:8002
GEOCODEBR_URL=
"@
Set-Content -Path "$APP_DIR\.env" -Value $envContent -Encoding UTF8
Write-Ok ".env criado"

# ---------------------------------------------------------------------------
# 8. INSTALAR DEPENDÊNCIAS + MIGRAR + BUILD
# ---------------------------------------------------------------------------
Write-Header "Instalando dependências"
pnpm install
Write-Ok "Dependências instaladas"

Write-Header "Aplicando schema"
pnpm --filter "@workspace/db" run push 2>$null
Write-Ok "Schema aplicado"

Write-Header "Compilando API"
pnpm --filter "@workspace/api-server" run build
Write-Ok "Build concluído"

# ---------------------------------------------------------------------------
# 9. SCRIPTS DE INICIALIZAÇÃO PARA WINDOWS
# ---------------------------------------------------------------------------
Write-Header "Criando scripts de inicialização"

$startBat = @"
@echo off
cd /d "$APP_DIR"
echo Iniciando ViaX: System...
echo.

for /f "tokens=*" %%i in (.env) do set %%i 2>nul

:: geocodebr microservice (opcional - requer Docker Desktop)
docker compose -f artifacts\geocodebr-service\docker-compose.yml up -d 2>nul && (
  set GEOCODEBR_URL=http://localhost:8002
  echo geocodebr disponivel em http://localhost:8002
) || echo [aviso] geocodebr nao iniciado - Docker pode nao estar disponivel

start "ViaX API" /min cmd /c "set PORT=$API_PORT && node dist\index.mjs"
timeout /t 2 /nobreak >nul
start "ViaX Frontend" /min cmd /c "set PORT=$WEB_PORT && set BASE_PATH=/ && npx vite --host"

echo ===================================
echo  ViaX: System iniciado!
echo  Frontend  : http://localhost:$WEB_PORT
echo  API       : http://localhost:$API_PORT
echo  geocodebr : http://localhost:8002 (se Docker ativo)
echo ===================================
echo.
pause
"@
Set-Content -Path "$APP_DIR\start.bat" -Value $startBat -Encoding UTF8

$stopBat = @"
@echo off
echo Encerrando ViaX: System...
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq ViaX*" 2>nul
echo Encerrado.
pause
"@
Set-Content -Path "$APP_DIR\stop.bat" -Value $stopBat -Encoding UTF8
Write-Ok "Scripts criados: start.bat / stop.bat"

# ---------------------------------------------------------------------------
# RESULTADO FINAL
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ViaX: System instalado com sucesso!     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Para iniciar o sistema:" -ForegroundColor White
Write-Host "  $APP_DIR\start.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Ou via PowerShell:" -ForegroundColor White
Write-Host "  cd $APP_DIR" -ForegroundColor Cyan
Write-Host "  `$env:PORT=$API_PORT; node dist\index.mjs &" -ForegroundColor Cyan
Write-Host "  `$env:PORT=$WEB_PORT; `$env:BASE_PATH='/'; pnpm --filter @workspace/viax-scout run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend : http://localhost:$WEB_PORT" -ForegroundColor White
Write-Host "  API      : http://localhost:$API_PORT" -ForegroundColor White
Write-Host ""
