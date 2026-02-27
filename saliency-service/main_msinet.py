"""
CHECKION Saliency Service – lightweight ONNX backend (e.g. MSI-Net exported to ONNX).
Same API as main_sum.py: POST /jobs, GET /jobs/{job_id}; optional POST /predict.
CPU-friendly, 1–3 s typical on M-chip / modest CPU.
"""
from __future__ import annotations

import base64
import io
import os
import threading
import uuid
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

from heatmap_postprocess import postprocess_eyequant_style

# Model path: set MSINET_MODEL_PATH or mount model at /app/model.onnx
MODEL_PATH = os.environ.get("MSINET_MODEL_PATH", "/app/model.onnx")
INPUT_SIZE = int(os.environ.get("MSINET_INPUT_SIZE", "224"))

session: ort.InferenceSession | None = None


def _jet_colormap_uint8() -> np.ndarray:
    """Jet-like colormap (256, 3) uint8 for consistency with CHECKION overlay."""
    x = np.linspace(0, 1, 256)
    r = np.clip(1.5 - 4 * np.abs(x - 0.75), 0, 1)
    g = np.clip(1.5 - 4 * np.abs(x - 0.5), 0, 1)
    b = np.clip(1.5 - 4 * np.abs(x - 0.25), 0, 1)
    return (np.stack([r, g, b], axis=1) * 255).astype(np.uint8)


def load_model() -> None:
    global session
    path = Path(MODEL_PATH)
    if not path.exists():
        raise FileNotFoundError(
            f"ONNX model not found at {MODEL_PATH}. "
            "Set MSINET_MODEL_PATH or mount a saliency ONNX model (e.g. exported from MSI-Net/SimpleSalNet)."
        )
    session = ort.InferenceSession(
        str(path),
        providers=["CPUExecutionProvider"],
        sess_options=ort.SessionOptions(),
    )


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


def preprocess(img: Image.Image) -> np.ndarray:
    """Resize to INPUT_SIZE x INPUT_SIZE, normalize [0,1], NCHW."""
    img = img.resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)  # HWC -> CHW
    arr = np.expand_dims(arr, axis=0)  # [1, 3, H, W]
    return arr


def run_inference(img_arr: np.ndarray) -> np.ndarray:
    if session is None:
        raise RuntimeError("ONNX model not loaded")
    input_name = session.get_inputs()[0].name
    out = session.run(None, {input_name: img_arr})[0]
    # out: [1, 1, h, w] or [1, h, w]
    if out.ndim == 4:
        out = out[0, 0]
    elif out.ndim == 3:
        out = out[0]
    out = np.squeeze(out).astype(np.float64)
    out = (out - out.min()) / (out.max() - out.min() + 1e-8)
    return out


def heatmap_to_png_bytes(heatmap: np.ndarray, out_w: int, out_h: int) -> bytes:
    from scipy.ndimage import zoom

    h, w = heatmap.shape
    if (w, h) != (out_w, out_h):
        zoom_factors = (out_h / h, out_w / w)
        heatmap = zoom(heatmap, zoom_factors, order=1)
    heatmap = postprocess_eyequant_style(heatmap, out_h, out_w)
    arr_u8 = (np.clip(heatmap, 0, 1) * 255).astype(np.uint8)
    cmap = _jet_colormap_uint8()
    rgb = cmap[arr_u8]  # (H, W, 3)
    pil = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def run_saliency(img: Image.Image, out_w: int, out_h: int) -> bytes:
    arr = preprocess(img)
    heatmap = run_inference(arr)
    return heatmap_to_png_bytes(heatmap, out_w, out_h)


# --- Job API (same as main_sum) ---
class PredictRequest(BaseModel):
    image_base64: str
    width: int | None = None
    height: int | None = None


class PredictResponse(BaseModel):
    heatmap_base64: str


class JobCreateResponse(BaseModel):
    job_id: str


_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _run_job(job_id: str, image_base64: str, width: int | None, height: int | None) -> None:
    with _jobs_lock:
        _jobs[job_id]["status"] = "running"
    try:
        img, orig_w, orig_h = decode_image(image_base64)
        out_w = width if width is not None else orig_w
        out_h = height if height is not None else orig_h
        png_bytes = run_saliency(img, out_w, out_h)
        b64 = base64.b64encode(png_bytes).decode("ascii")
        with _jobs_lock:
            _jobs[job_id] = {"status": "completed", "heatmap_base64": b64}
    except Exception as e:
        with _jobs_lock:
            _jobs[job_id] = {"status": "failed", "error": str(e)}


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="CHECKION Saliency Service (ONNX)", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": "ONNX", "input_size": INPUT_SIZE}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    img, orig_w, orig_h = decode_image(req.image_base64)
    out_w = req.width if req.width is not None else orig_w
    out_h = req.height if req.height is not None else orig_h
    try:
        png_bytes = run_saliency(img, out_w, out_h)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return PredictResponse(heatmap_base64=base64.b64encode(png_bytes).decode("ascii"))


@app.post("/jobs", response_model=JobCreateResponse)
def create_job(req: PredictRequest) -> JobCreateResponse:
    if session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    job_id = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {"status": "pending"}
    t = threading.Thread(
        target=_run_job,
        args=(job_id, req.image_base64, req.width, req.height),
        daemon=True,
    )
    t.start()
    return JobCreateResponse(job_id=job_id)


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    with _jobs_lock:
        job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
