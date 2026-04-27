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
#   2. Copiar res/xml/network_security_config.xml. O app conecta ao backend
#      oficial em HTTPS, mas mantemos cleartext apenas para hosts de dev
#      (localhost, 127.0.0.1, 10.0.2.2 — Android emulator → host loopback).
#   3. Patchar AndroidManifest.xml para apontar android:networkSecurityConfig
#      e android:usesCleartextTraffic="true" (necessário enquanto qualquer
#      cleartext for permitido — nossa policy restringe os hosts).
#   4. Declarar as permissões de foreground service e o serviço usado pelo
#      flutter_foreground_task (mantém o processamento ativo com notificação
#      persistente em Android 14+).
#   5. Definir o nome visível do app como "ViaX:Trace".
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

# 1. Garantir permissões ANTES do <application>.
#    Inclui permissões de rede e as exigidas pelo flutter_foreground_task
#    (notificação persistente + serviço em foreground enquanto roda o SSE
#    + redirecionamento para desabilitar otimização de bateria).
needed_perms = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.WAKE_LOCK',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    'android.permission.SYSTEM_ALERT_WINDOW',
]
perm_block = ''
added = []
for perm in needed_perms:
    if perm not in src:
        perm_block += f'    <uses-permission android:name="{perm}"/>\n'
        added.append(perm)

if perm_block:
    src = re.sub(r'(\s*)<application\b', r'\n' + perm_block.rstrip('\n') + r'\1<application', src, count=1)
    print(f"[apply-android-overrides] permissões adicionadas: {added}")
else:
    print("[apply-android-overrides] permissões já presentes.")

# 2. Patchar <application> com networkSecurityConfig + usesCleartextTraffic.
def patch_app(m):
    tag = m.group(0)
    if 'android:networkSecurityConfig' in tag:
        return tag
    inserts = ' android:networkSecurityConfig="@xml/network_security_config" android:usesCleartextTraffic="true"'
    return tag.replace('<application', '<application' + inserts, 1)

src = re.sub(r'<application\b', patch_app, src, count=1)

# 3. Declarar o serviço do flutter_foreground_task dentro de <application>.
#    Necessário para que o startService() dispare o serviço em foreground
#    com tipo `dataSync` (compatível com Android 14+).
fg_service = (
    '        <service\n'
    '            android:name="com.pravera.flutter_foreground_task.service.ForegroundService"\n'
    '            android:foregroundServiceType="dataSync"\n'
    '            android:exported="false" />\n'
)
if 'flutter_foreground_task.service.ForegroundService' not in src:
    src = re.sub(r'(</application>)', fg_service + r'\1', src, count=1)
    print("[apply-android-overrides] foreground service declarado.")
else:
    print("[apply-android-overrides] foreground service já declarado.")

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
