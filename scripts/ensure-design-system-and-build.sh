#!/usr/bin/env sh
# Ensures ../msqdx-design-system exists (symlink to MSQDX-DS/msqdx-design-system) so
# package.json "file:../msqdx-design-system/..." resolves. Then runs npm run build.
# Run from CHECKION-1 root. No changes to package.json needed for Coolify/Docker.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARENT="$(dirname "$ROOT")"
LINK="${PARENT}/msqdx-design-system"
TARGET="${PARENT}/MSQDX-DS/msqdx-design-system"

if [ -d "$LINK" ]; then
  echo "[CHECKION] Using existing design system workspace: $LINK"
elif [ ! -d "$TARGET" ]; then
  echo "[CHECKION] Design system not found at: $TARGET"
  echo "  Expected either an existing sibling workspace at $LINK or a clone at $TARGET."
  exit 1
else
  echo "[CHECKION] Creating symlink: $LINK -> $TARGET"
  ln -snf "$TARGET" "$LINK"
fi

cd "$ROOT"
echo "[CHECKION] Running: npm run build"
npm run build
