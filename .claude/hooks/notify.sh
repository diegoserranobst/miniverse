#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-Claude requiere tu atención}"
APP_NAME="${APP_NAME:-Claude Code}"

# === Detección automática del proyecto ===
RAW_PROJECT_NAME="$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")"
# Limpia prefijos típicos
PROJECT_NAME="$(echo "$RAW_PROJECT_NAME" | sed -E 's/^(test-|dev-|prod-)//')"

REFERENCE="${REFERENCE:-Sin referencia}"   # Descripción de lo que Claude pide
ICON="${ICON:-dialog-information}"
REPLACE_KEY="claude-$PROJECT_NAME"


# ===== Sonido =====
#if command -v paplay >/dev/null 2>&1; then
#  paplay /usr/share/sounds/freedesktop/stereo/complete.oga || true
#elif command -v canberra-gtk-play >/dev/null 2>&1; then
#  canberra-gtk-play -i message || true
#elif command -v afplay >/dev/null 2>&1; then
#  afplay /System/Library/Sounds/Pop.aiff || osascript -e 'beep'
#elif command -v powershell.exe >/dev/null 2>&1; then
#  powershell.exe -NoP -C "[console]::beep(1000,400)" || true
#else
#  printf '\a' || true
#fi

# ===== Toast / Notificación =====
if command -v notify-send >/dev/null 2>&1; then
  notify-send -a "$APP_NAME" -i "$ICON" -u normal -t 8000 \
    -h "string:x-canonical-private-synchronous:${REPLACE_KEY}" \
    "[$PROJECT_NAME] $MSG" "$REFERENCE"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  osascript -e "display notification \"$REFERENCE\" with title \"$APP_NAME [$PROJECT_NAME] - $MSG\"" || true
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoP -C "try { Import-Module BurntToast -ErrorAction Stop; New-BurntToastNotification -Text '$APP_NAME [$PROJECT_NAME]','$MSG','$REFERENCE'; } catch { [console]::beep(1000,200) }" || true
fi
