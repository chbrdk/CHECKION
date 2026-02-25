#!/bin/sh
# SUM weights: use volume, or set SUM_WEIGHTS_GDRIVE_ID (Google Drive file ID) or SUM_WEIGHTS_URL.
# With SUM_WEIGHTS_GDRIVE_ID the container downloads on first start – alles nur in Coolify einstellbar.
set -e
WEIGHTS_DIR="/app/SUM/net/pre_trained_weights"
WEIGHTS_FILE="${WEIGHTS_DIR}/sum_model.pth"

if [ -f "$WEIGHTS_FILE" ]; then
    exec "$@"
fi

mkdir -p "${WEIGHTS_DIR}"

# 1) Google Drive file ID – direkt in Coolify als Env eintragen, kein Terminal nötig
if [ -n "${SUM_WEIGHTS_GDRIVE_ID}" ]; then
    echo "SUM weights not found. Downloading from Google Drive (${SUM_WEIGHTS_GDRIVE_ID})…"
    if gdown "https://drive.google.com/uc?id=${SUM_WEIGHTS_GDRIVE_ID}" -O "${WEIGHTS_FILE}" --fuzzy; then
        echo "Weights downloaded. Starting service."
        exec "$@"
    fi
fi

# 2) Direct URL (optional)
if [ ! -f "$WEIGHTS_FILE" ] && [ -n "${SUM_WEIGHTS_URL}" ]; then
    echo "SUM weights not found. Downloading from ${SUM_WEIGHTS_URL}…"
    wget -q -O "${WEIGHTS_FILE}" "${SUM_WEIGHTS_URL}" || true
    if [ -f "$WEIGHTS_FILE" ]; then
        echo "Weights downloaded. Starting service."
        exec "$@"
    fi
fi

if [ -f "$WEIGHTS_FILE" ]; then
    exec "$@"
fi

echo "ERROR: Missing SUM weights at ${WEIGHTS_FILE}. In Coolify: set env SUM_WEIGHTS_GDRIVE_ID=14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A (Google Drive file ID) and redeploy – then the container downloads the weights on first start. Optionally add a volume at ${WEIGHTS_DIR} so the file persists." 1>&2
exit 1
