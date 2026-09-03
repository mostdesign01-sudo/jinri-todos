#!/bin/bash
# 把网页文件打进 .app，并更新 zip。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
APP="$ROOT/JinriOverlay.app"
WWW="$APP/Contents/Resources/www"

rm -rf "$WWW"
mkdir -p "$WWW"
cp "$REPO/overlay.html" "$REPO/overlay.css" "$REPO/styles.css" "$REPO/app.js" "$REPO/icon.svg" "$WWW/"
chmod +x "$APP/Contents/MacOS/JinriOverlay" "$ROOT/build-app.sh"

(cd "$ROOT" && rm -f JinriOverlay.zip && zip -qry JinriOverlay.zip JinriOverlay.app -x "*.DS_Store")
echo "updated $ROOT/JinriOverlay.zip"
