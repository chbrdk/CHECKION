# CHECKION Saliency Service (MDS-ViTNet)

HTTP service that predicts attention/saliency heatmaps from screenshots for CHECKION. Uses [MDS-ViTNet](https://github.com/IgnatPolezhaev/MDS-ViTNet).

## Setup

1. **Clone this repo** (CHECKION) and go to the saliency service:
   ```bash
   cd saliency-service
   ```

2. **Clone MDS-ViTNet** into `mds_vitnet`:
   ```bash
   git clone https://github.com/IgnatPolezhaev/MDS-ViTNet.git mds_vitnet
   ```

3. **Install MDS-ViTNet dependencies** (in the same venv as below):
   ```bash
   pip install -r mds_vitnet/requirements.txt
   ```

4. **Download pretrained weights** from [Google Drive](https://drive.google.com/drive/folders/10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0?usp=sharing) and place in `mds_vitnet/weights/`:
   - `ViT_multidecoder.pth`
   - `CNNMerge.pth`

5. **Create venv and install this service**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

6. **Run the service**:
   ```bash
   python main.py
   ```
   Listens on `http://0.0.0.0:8000`. Set `SALIENCY_SERVICE_URL=http://localhost:8000` in CHECKION’s `.env` so the app can call it.

## API

- **GET /health** – `{ "status": "ok", "model": "MDS-ViTNet" }`
- **POST /predict** – Body: `{ "image_base64": "<base64 or data URL>" }`. Optional: `"width"`, `"height"` for heatmap size. Response: `{ "heatmap_base64": "<base64 PNG>" }`.

## Docker (optional)

You can add a `Dockerfile` that clones MDS-ViTNet and installs dependencies; weights must be mounted or downloaded at build/run time.
