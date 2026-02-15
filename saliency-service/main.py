"""
Saliency prediction HTTP service for CHECKION.
Uses MDS-ViTNet; expects the repo to be cloned at ./mds_vitnet with weights in mds_vitnet/weights/.
"""
from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image


def _jet_colormap_uint8() -> np.ndarray:
    """Jet-like colormap: blue (0) -> cyan -> green -> yellow -> red (255). Returns (256, 3) uint8."""
    # Standard Jet: 0=blue, 0.25=cyan, 0.5=green, 0.75=yellow, 1=red; linear in between
    x = np.linspace(0, 1, 256)
    r = np.clip(1.5 - 4 * np.abs(x - 0.75), 0, 1)
    g = np.clip(1.5 - 4 * np.abs(x - 0.5), 0, 1)
    b = np.clip(1.5 - 4 * np.abs(x - 0.25), 0, 1)
    return (np.stack([r, g, b], axis=1) * 255).astype(np.uint8)


def _apply_colormap(gray_uint8: np.ndarray, colormap: np.ndarray) -> np.ndarray:
    """Map (H, W) uint8 to (H, W, 3) RGB using colormap (256, 3)."""
    return colormap[gray_uint8]

# Add MDS-ViTNet to path (clone into mds_vitnet next to this file)
MDS_ROOT = Path(__file__).resolve().parent / "mds_vitnet"
if not MDS_ROOT.exists():
    raise RuntimeError(
        "MDS-ViTNet not found. Clone it: git clone https://github.com/IgnatPolezhaev/MDS-ViTNet.git saliency-service/mds_vitnet"
    )
sys.path.insert(0, str(MDS_ROOT))

import torchvision.transforms.functional as TF  # noqa: E402

from model.Merge_CNN_model import CNNMerge  # noqa: E402
from model.TranSalNet_ViT_multidecoder import TranSalNet  # noqa: E402


# --- Model loading (once at startup) ---
DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
PATH_VIT = MDS_ROOT / "weights" / "ViT_multidecoder.pth"
PATH_CNN = MDS_ROOT / "weights" / "CNNMerge.pth"

model_vit: TranSalNet | None = None
model_cnn: CNNMerge | None = None


def load_models() -> None:
    global model_vit, model_cnn
    if not PATH_VIT.exists() or not PATH_CNN.exists():
        raise FileNotFoundError(
            f"Missing weights. Download from https://drive.google.com/drive/folders/10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0 and place in {MDS_ROOT / 'weights'}"
        )
    model_vit = TranSalNet()
    model_vit.load_state_dict(torch.load(PATH_VIT, map_location=DEVICE))
    model_vit = model_vit.to(DEVICE)
    model_vit.eval()
    model_cnn = CNNMerge()
    model_cnn.load_state_dict(torch.load(PATH_CNN, map_location=DEVICE))
    model_cnn = model_cnn.to(DEVICE)
    model_cnn.eval()


# --- Request/response ---
class PredictRequest(BaseModel):
    image_base64: str
    width: int | None = None  # optional output heatmap width (default: original)
    height: int | None = None  # optional output heatmap height (default: original)


class PredictResponse(BaseModel):
    heatmap_base64: str


def decode_image(b64: str) -> tuple[Image.Image, int, int]:
    """Decode base64 or data URL to PIL Image; return image and original (width, height)."""
    raw = b64.strip()
    if raw.startswith("data:"):
        raw = raw.split(",", 1)[-1]
    try:
        data = base64.b64decode(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")
    w, h = img.size
    return img, w, h


def run_saliency(img: Image.Image, out_w: int, out_h: int) -> bytes:
    """Run MDS-ViTNet on image; return PNG bytes of heatmap at (out_w, out_h)."""
    img_np = np.array(img) / 255.0
    shape_h, shape_w = img_np.shape[0], img_np.shape[1]
    img_np = np.transpose(img_np, (2, 0, 1))
    t = torch.from_numpy(img_np)
    t = TF.normalize(t, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    t = TF.resize(t, (288, 384))
    t = t.to(torch.float32).to(DEVICE)

    with torch.no_grad():
        pred_1, pred_2 = model_vit(t.unsqueeze(0))
        pred_map = model_cnn(pred_1, pred_2)

    pred_map = TF.resize(pred_map, (out_h, out_w))
    # [1, 1, H, W] -> HxW, float 0..1
    arr = pred_map.squeeze().cpu().numpy().astype(np.float64)
    arr = np.clip(arr, 0, 1)

    # Contrast: stretch to percentiles so more of the range is used (higher sensitivity)
    lo, hi = np.percentile(arr, [3, 97])
    if hi > lo:
        arr = (arr - lo) / (hi - lo)
    arr = np.clip(arr, 0, 1)

    # Optional: gamma < 1 makes mid-tones more distinct (more "pop")
    arr = np.power(arr, 0.7)

    # 0..1 -> 0..255 uint8 for colormap
    arr_u8 = (np.clip(arr, 0, 1) * 255).astype(np.uint8)

    # Colorize: Jet colormap (blue = low attention, red/yellow = high attention), no cv2
    cmap = _jet_colormap_uint8()
    heat_rgb = _apply_colormap(arr_u8, cmap)

    out = io.BytesIO()
    Image.fromarray(heat_rgb, mode="RGB").save(out, format="PNG")
    return out.getvalue()


# --- FastAPI app ---
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_models()
    yield


app = FastAPI(title="CHECKION Saliency Service", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": "MDS-ViTNet"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if model_vit is None or model_cnn is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    img, orig_w, orig_h = decode_image(req.image_base64)
    out_w = req.width if req.width is not None else orig_w
    out_h = req.height if req.height is not None else orig_h
    try:
        png_bytes = run_saliency(img, out_w, out_h)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return PredictResponse(heatmap_base64=base64.b64encode(png_bytes).decode("ascii"))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
