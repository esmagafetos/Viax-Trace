#!/usr/bin/env bash
# =============================================================================
#  ViaX:Trace — Apply Android scaffolding overrides
#
#  Roda DEPOIS de `flutter create --platforms=android,ios .` para:
#   1. Copiar res/xml/network_security_config.xml (libera HTTP em IPs locais
#      para o backend rodando no Termux do usuário)
#   2. Patchar AndroidManifest.xml para apontar android:networkSecurityConfig
#      e android:usesCleartextTraffic="true" (escopado ao XML acima).
#   3. Definir o nome visível do app como "ViaX:Trace".
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

if grep -q 'android:networkSecurityConfig' "$APP_MANIFEST"; then
  echo "[apply-android-overrides] manifest já referencia networkSecurityConfig — pulando patch."
else
  # Insere atributos no <application ...>
  python3 - "$APP_MANIFEST" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding='utf-8').read()
def patch(m):
    tag = m.group(0)
    inserts = ' android:networkSecurityConfig="@xml/network_security_config" android:usesCleartextTraffic="true"'
    if 'android:networkSecurityConfig' in tag:
        return tag
    return tag.replace('<application', '<application' + inserts, 1)
new = re.sub(r'<application\b', patch, src, count=1)
open(p, 'w', encoding='utf-8').write(new)
print("[apply-android-overrides] AndroidManifest.xml patcheado.")
PY
fi

# Renomeia o label do app para "ViaX:Trace"
if [[ -f "$APP_MANIFEST" ]]; then
  sed -i.bak -E 's#android:label="[^"]*"#android:label="ViaX:Trace"#' "$APP_MANIFEST" || true
  rm -f "$APP_MANIFEST.bak"
  echo "[apply-android-overrides] android:label = ViaX:Trace"
fi

echo "[apply-android-overrides] OK."
