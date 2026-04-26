#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Apply Android scaffolding overrides
#
#  Roda DEPOIS de `flutter create --platforms=android,ios .` para:
#   1. Garantir as permissões android.permission.INTERNET e
#      ACCESS_NETWORK_STATE no AndroidManifest principal. O `flutter create`
#      adiciona INTERNET apenas nos manifests de debug/profile, NÃO no main —
#      então builds release sairiam sem permissão de rede e qualquer socket
#      (inclusive loopback 127.0.0.1) falharia silenciosamente.
#   2. Copiar res/xml/network_security_config.xml (libera HTTP em IPs locais
#      para o backend rodando no Termux do usuário).
#   3. Patchar AndroidManifest.xml para apontar android:networkSecurityConfig
#      e android:usesCleartextTraffic="true".
#   4. Definir o nome visível do app como "ViaX:Trace".
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
OVERRIDES="$ROOT/android-overrides"
APP_MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "[apply-android-overrides] android/ não existe. Rode 'flutter create' antes." >&2
  exit 1
fi

mkdir -p "$ANDROID_DIR/app/src/main/res/xml"
cp "$OVERRIDES/app/src/main/res/xml/network_security_config.xml" \
   "$ANDROID_DIR/app/src/main/res/xml/network_security_config.xml"
echo "[apply-android-overrides] network_security_config.xml copiado."

python3 - "$APP_MANIFEST" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding='utf-8').read()
orig = src

# 1. Garantir permissões de rede ANTES do <application>.
needed_perms = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
]
perm_block = ''
for perm in needed_perms:
    if perm not in src:
        perm_block += f'    <uses-permission android:name="{perm}"/>\n'

if perm_block:
    # Insere imediatamente antes da tag <application
    src = re.sub(r'(\s*)<application\b', r'\n' + perm_block.rstrip('\n') + r'\1<application', src, count=1)
    print(f"[apply-android-overrides] permissões adicionadas: {[p for p in needed_perms if p in perm_block]}")
else:
    print("[apply-android-overrides] permissões de rede já presentes.")

# 2. Patchar <application> com networkSecurityConfig + usesCleartextTraffic.
def patch_app(m):
    tag = m.group(0)
    if 'android:networkSecurityConfig' in tag:
        return tag
    inserts = ' android:networkSecurityConfig="@xml/network_security_config" android:usesCleartextTraffic="true"'
    return tag.replace('<application', '<application' + inserts, 1)

src = re.sub(r'<application\b', patch_app, src, count=1)

if src != orig:
    open(p, 'w', encoding='utf-8').write(src)
    print("[apply-android-overrides] AndroidManifest.xml patcheado.")
else:
    print("[apply-android-overrides] AndroidManifest.xml já estava patcheado.")
PY

# 3. Renomeia o label do app para "ViaX:Trace"
if [[ -f "$APP_MANIFEST" ]]; then
  sed -i.bak -E 's#android:label="[^"]*"#android:label="ViaX:Trace"#' "$APP_MANIFEST" || true
  rm -f "$APP_MANIFEST.bak"
  echo "[apply-android-overrides] android:label = ViaX:Trace"
fi

echo "[apply-android-overrides] OK."
