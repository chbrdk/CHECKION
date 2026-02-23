#!/bin/sh
# Ensure SUM weights exist: volume mount at /app/SUM/net/pre_trained_weights
# or set SUM_WEIGHTS_URL to download sum_model.pth on first start.
set -e
WEIGHTS_DIR="/app/SUM/net/pre_trained_weights"
WEIGHTS_FILE="${WEIGHTS_DIR}/sum_model.pth"

if [ -f "$WEIGHTS_FILE" ]; then
    exec "$@"
fi

if [ -n "${SUM_WEIGHTS_URL}" ]; then
    echo "SUM weights not found. Downloading from ${SUM_WEIGHTS_URL}…"
    mkdir -p "${WEIGHTS_DIR}"
    wget -q -O "${WEIGHTS_FILE}" "${SUM_WEIGHTS_URL}" || true
    if [ -f "$WEIGHTS_FILE" ]; then
        echo "Weights downloaded. Starting service."
        exec "$@"
    fi
fi

echo "ERROR: Missing SUM weights at ${WEIGHTS_FILE}. Either:" 1>&2
echo "  1. In Coolify: add a volume mount to ${WEIGHTS_DIR} and put sum_model.pth there, or" 1>&2
echo "  2. Download from https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view and place as sum_model.pth, or" 1>&2
echo "  3. Set env SUM_WEIGHTS_URL to a direct download URL for sum_model.pth." 1>&2
exit 1
