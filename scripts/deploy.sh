#!/bin/bash
# Deploy Miniverse a producción (VPS)
# Uso: npm run deploy (desde raíz del proyecto)
set -euo pipefail

VPS="vps-fireraise"
REMOTE_DIR="/opt/miniverse"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Miniverse Deploy ==="
echo "Local:  $LOCAL_DIR"
echo "Remote: $VPS:$REMOTE_DIR"
echo ""

# 1. Build
echo "--- Build core ---"
cd "$LOCAL_DIR/packages/core" && npm run build

echo "--- Build server ---"
cd "$LOCAL_DIR/packages/server" && node build.js

echo "--- Build frontend ---"
cd "$LOCAL_DIR/my-miniverse" && npx vite build

# 2. Sync al VPS
echo ""
echo "--- Sync al VPS ---"
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env*' \
  --exclude='.git' \
  "$LOCAL_DIR/packages/core/dist/" "$VPS:$REMOTE_DIR/packages/core/dist/"

rsync -avz --delete \
  --exclude='node_modules' \
  "$LOCAL_DIR/packages/server/dist/" "$VPS:$REMOTE_DIR/packages/server/dist/"

rsync -avz \
  "$LOCAL_DIR/packages/server/bin/" "$VPS:$REMOTE_DIR/packages/server/bin/"

rsync -avz --delete \
  "$LOCAL_DIR/my-miniverse/dist/" "$VPS:$REMOTE_DIR/my-miniverse/dist/"

rsync -avz \
  "$LOCAL_DIR/my-miniverse/public/" "$VPS:$REMOTE_DIR/my-miniverse/public/"

rsync -avz \
  "$LOCAL_DIR/packages/server/package.json" "$VPS:$REMOTE_DIR/packages/server/package.json"

rsync -avz \
  "$LOCAL_DIR/packages/core/package.json" "$VPS:$REMOTE_DIR/packages/core/package.json"

rsync -avz \
  "$LOCAL_DIR/my-miniverse/package.json" "$VPS:$REMOTE_DIR/my-miniverse/package.json"

rsync -avz \
  "$LOCAL_DIR/package.json" "$VPS:$REMOTE_DIR/package.json"

# 3. Install deps + restart en VPS
echo ""
echo "--- Install + restart en VPS ---"
ssh "$VPS" "cd $REMOTE_DIR && npm install --omit=dev 2>&1 | tail -3 && cd my-miniverse && npm install --omit=dev 2>&1 | tail -3 && pm2 restart miniverse 2>/dev/null || pm2 start 'node ../packages/server/bin/miniverse.js --port 25050 --host 127.0.0.1 --no-browser' --name miniverse --cwd $REMOTE_DIR/my-miniverse && pm2 save"

echo ""
echo "=== Deploy completo ==="
echo "https://miniverse.redcumbre.cl"
