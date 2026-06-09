#!/usr/bin/env sh
# Copies pdf.js worker into public/ for CHECKION dev + production static serving.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
DEST="$ROOT/public/pdf.worker.min.mjs"
if [ ! -f "$SRC" ]; then
  echo "copy-pdfjs-worker: pdfjs-dist not installed ($SRC missing)" >&2
  exit 1
fi
cp "$SRC" "$DEST"
echo "copy-pdfjs-worker: $DEST"
