#!/bin/sh
# Ensure MDS-ViTNet weights exist: either mount a volume at /app/mds_vitnet/weights
# or set WEIGHTS_FOLDER_ID (Google Drive folder ID) to download on first start.
set -e
WEIGHTS_DIR="/app/mds_vitnet/weights"
VIT="${WEIGHTS_DIR}/ViT_multidecoder.pth"
CNN="${WEIGHTS_DIR}/CNNMerge.pth"

if [ -f "$VIT" ] && [ -f "$CNN" ]; then
    exec "$@"
fi

if [ -n "${WEIGHTS_FOLDER_ID}" ]; then
    echo "Weights not found. Downloading from Google Drive (folder ${WEIGHTS_FOLDER_ID})…"
    pip install -q gdown
    gdown "${WEIGHTS_FOLDER_ID}" -O "${WEIGHTS_DIR}" --folder || true
    if [ -f "$VIT" ] && [ -f "$CNN" ]; then
        echo "Weights downloaded. Starting service."
        exec "$@"
    fi
fi

echo "ERROR: Missing weights in ${WEIGHTS_DIR}. Either:" 1>&2
echo "  1. In Coolify: add a volume mount to ${WEIGHTS_DIR} and put ViT_multidecoder.pth + CNNMerge.pth there, or" 1>&2
echo "  2. Set env WEIGHTS_FOLDER_ID to the Google Drive folder ID (see README)." 1>&2
exit 1
