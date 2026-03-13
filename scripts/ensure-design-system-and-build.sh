#!/usr/bin/env sh
# Ensures ../msqdx-design-system exists (symlink to MSQDX-DS/msqdx-design-system) so
# package.json "file:../msqdx-design-system/..." resolves. Then runs npm run build.
# Run from CHECKION-1 root. No changes to package.json needed for Coolify/Docker.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARENT="$(dirname "$ROOT")"
LINK="${PARENT}/msqdx-design-system"
TARGET="${PARENT}/MSQDX-DS/msqdx-design-system"

if [ ! -d "$TARGET" ]; then
  echo "[CHECKION] Design system not found at: $TARGET"
  echo "  Create it or adjust this script (e.g. clone msqdx-design-system there)."
  exit 1
fi

if [ ! -e "$LINK" ]; then
  echo "[CHECKION] Creating symlink: $LINK -> $TARGET"
  ln -snf "$TARGET" "$LINK"
else
  echo "[CHECKION] Design system link exists: $LINK"
fi

cd "$ROOT"
echo "[CHECKION] Running: npm run build"
npm run build
