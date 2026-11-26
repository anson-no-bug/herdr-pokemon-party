#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
HERDR_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"

echo "Installing herdr-pokemon into $HERDR_HOME..."
mkdir -p "$HERDR_HOME/layouts" "$HERDR_HOME/themes" "$HERDR_HOME/mods/herdr-pokemon"

# Copy themes & layout
cp "$REPO_DIR/themes/herdr-pokemon.json" "$HERDR_HOME/themes/"
cp "$REPO_DIR/themes/herdr-pokemon-night.json" "$HERDR_HOME/themes/"
cp "$REPO_DIR/layouts/herdr-pokemon.json" "$HERDR_HOME/layouts/"
cp "$REPO_DIR/layouts/herdr-pokemon.svg" "$HERDR_HOME/layouts/"

# Sync mod folder (preserving runtime-generated .d.ts / jsconfig.json if present)
rsync -a --delete \
  --exclude 'gpui-kit.d.ts' \
  --exclude 'jsconfig.json' \
  "$REPO_DIR/mods/herdr-pokemon/" "$HERDR_HOME/mods/herdr-pokemon/"

# Copy crisp pixel UI font from shipped win98 if present and not already bundled
if [ -d "$HERDR_HOME/mods/win98/fonts" ]; then
  cp -n "$HERDR_HOME/mods/win98/fonts/PixelatedMSSansSerif-Regular.ttf" "$HERDR_HOME/mods/herdr-pokemon/fonts/" 2>/dev/null || true
  cp -n "$HERDR_HOME/mods/win98/fonts/PixelatedMSSansSerif-Bold.ttf" "$HERDR_HOME/mods/herdr-pokemon/fonts/" 2>/dev/null || true
fi

# Merge layout:herdr-pokemon keybindings into keys.json (keeps global/terminal untouched!)
python3 - "$HERDR_HOME/keys.json" <<'PY'
import json, os, sys
path = sys.argv[1]
data = {}
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
data["layout:herdr-pokemon"] = {
    "cmd-w": "herdr-pokemon.close_tab",
    "f2": "herdr-pokemon.rename_tab",
    "shift-f2": "herdr-pokemon.rename_space"
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

echo "Installed! Run 'herdr-app check ~/.config/herdr-app/mods/herdr-pokemon' to verify."
