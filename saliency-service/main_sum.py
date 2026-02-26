"""
CHECKION Saliency Service – SUM backend (website/UI-optimized).
Uses SUM (Saliency Unification through Mamba) with condition=3 (User Interface images).
Same API as main.py: POST /predict with image_base64, returns heatmap_base64.
"""
from __future__ import annotations

import base64
import io
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

# SUM repo lives next to this file (Docker: /app/SUM)
SUM_ROOT = Path(__file__).resolve().parent / "SUM"
if not SUM_ROOT.exists():
    raise RuntimeError(
        "SUM repo not found. Clone it: git clone https://github.com/Arhosseini77/SUM.git saliency-service/SUM"
    )
sys.path.insert(0, str(SUM_ROOT))

# CPU-only: if mamba_ssm has no CUDA, its selective_scan_interface fails to load; inject stub before SUM import
def _install_selective_scan_stub():
    import importlib.util
    stub_path = Path(__file__).resolve().parent / "selective_scan_cpu_stub.py"
    spec = importlib.util.spec_from_file_location("mamba_ssm.ops.selective_scan_interface", stub_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["mamba_ssm.ops.selective_scan_interface"] = mod
    spec.loader.exec_module(mod)


try:
    from mamba_ssm.ops.selective_scan_interface import selective_scan_fn  # noqa: F401
except ImportError:
    sys.modules.pop("mamba_ssm.ops.selective_scan_interface", None)
    _install_selective_scan_stub()

from net import SUM, load_and_preprocess_image, predict_saliency_map  # noqa: E402

# SUM model config (from SUM net.configs.config_setting) – no relative paths
MODEL_CONFIG = {
    "num_classes": 1,
    "input_channels": 3,
    "depths": [2, 2, 27, 2],
    "depths_decoder": [2, 2, 2, 1],
    "drop_path_rate": 0.3,
}

WEIGHTS_PATH = SUM_ROOT / "net" / "pre_trained_weights" / "sum_model.pth"
DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

model: SUM | None = None


def _jet_colormap_uint8() -> np.ndarray:
    """Jet-like colormap (256, 3) uint8 for consistency with CHECKION overlay."""
    x = np.linspace(0, 1, 256)
    r = np.clip(1.5 - 4 * np.abs(x - 0.75), 0, 1)
    g = np.clip(1.5 - 4 * np.abs(x - 0.5), 0, 1)
    b = np.clip(1.5 - 4 * np.abs(x - 0.25), 0, 1)
    return (np.stack([r, g, b], axis=1) * 255).astype(np.uint8)


from heatmap_postprocess import postprocess_eyequant_style  # noqa: E402


def _heatmap_to_png_bytes(heatmap: np.ndarray, out_w: int, out_h: int) -> bytes:
    """Resize heatmap to (out_w, out_h), apply EyeQuant-style postprocess, jet colormap, return PNG bytes."""
    from scipy.ndimage import zoom
    h, w = heatmap.shape
    if (w, h) != (out_w, out_h):
        zoom_factors = (out_h / h, out_w / w)
        heatmap = zoom(heatmap, zoom_factors, order=1)
    heatmap = postprocess_eyequant_style(heatmap, out_h, out_w)
    arr_u8 = (heatmap * 255).astype(np.uint8)
    cmap = _jet_colormap_uint8()
    rgb = cmap[arr_u8]  # (H, W, 3)
    img = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def load_model() -> None:
    global model
    if not WEIGHTS_PATH.exists():
        raise FileNotFoundError(
            f"SUM weights not found at {WEIGHTS_PATH}. "
            "Download from https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view and place as net/pre_trained_weights/sum_model.pth"
        )
    model = SUM(
        num_classes=MODEL_CONFIG["num_classes"],
        input_channels=MODEL_CONFIG["input_channels"],
        depths=MODEL_CONFIG["depths"],
        depths_decoder=MODEL_CONFIG["depths_decoder"],
        drop_path_rate=MODEL_CONFIG["drop_path_rate"],
    )
    model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()


# Condition 3 = User Interface (UI) / web pages
SUM_CONDITION_UI = 3


class PredictRequest(BaseModel):
    image_base64: str
    width: int | None = None
    height: int | None = None


class PredictResponse(BaseModel):
    heatmap_base64: str


def decode_image(b64: str) -> tuple[Image.Image, int, int]:
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


def run_saliency_sum(img: Image.Image, out_w: int, out_h: int) -> bytes:
    if model is None:
        raise RuntimeError("SUM model not loaded")
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        try:
            img.save(f, format="JPEG")
            f.flush()
            tensor, orig_size = load_and_preprocess_image(f.name)
            pred = predict_saliency_map(tensor, SUM_CONDITION_UI, model, DEVICE)
            return _heatmap_to_png_bytes(pred, out_w, out_h)
        finally:
            try:
                os.unlink(f.name)
            except OSError:
                pass


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="CHECKION Saliency Service (SUM)", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": "SUM", "condition": "UI (web pages)"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    img, orig_w, orig_h = decode_image(req.image_base64)
    out_w = req.width if req.width is not None else orig_w
    out_h = req.height if req.height is not None else orig_h
    try:
        png_bytes = run_saliency_sum(img, out_w, out_h)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return PredictResponse(heatmap_base64=base64.b64encode(png_bytes).decode("ascii"))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
