# CHECKION Saliency Service (MDS-ViTNet / SUM)

HTTP service that predicts attention/saliency heatmaps from screenshots for CHECKION.

- **Default:** [MDS-ViTNet](https://github.com/IgnatPolezhaev/MDS-ViTNet) – general-purpose saliency (trained on natural images). Use `Dockerfile` and `main.py`.
- **Website-optimized:** [SUM](https://github.com/Arhosseini77/SUM) (Saliency Unification through Mamba) with **condition=3 (User Interface)** – better suited for web pages, UI, and headlines. Use `Dockerfile.sum` and `main_sum.py`; same API.

## SUM backend (website/UI heatmaps)

For heatmaps that better highlight headlines, CTAs, and UI elements (EyeQuant-style), use the SUM-based service:

1. **Build** with `Dockerfile.sum` (build context: `saliency-service`):
   ```bash
   docker build -f Dockerfile.sum -t checkion-saliency-sum .
   ```
2. **Weights:** Download [sum_model.pth](https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view) and place in `SUM/net/pre_trained_weights/` (or mount a volume at `/app/SUM/net/pre_trained_weights` in the container with `sum_model.pth` inside).
3. **Run:** Same port 8000; set CHECKION’s `SALIENCY_SERVICE_URL` to this service. Health returns `"model": "SUM", "condition": "UI (web pages)"`.

In Coolify: create a **second** application from the same repo, build with **Root directory** `saliency-service`, **Dockerfile path** `Dockerfile.sum`. Mount a volume at `/app/SUM/net/pre_trained_weights` with `sum_model.pth`, or provide a direct download URL via env `SUM_WEIGHTS_URL`.

---

## Setup (MDS-ViTNet, default)

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

## Post-processing (EyeQuant-style)

The raw MDS-ViTNet prediction tends to be top-heavy. In `run_saliency()` we apply vertical baseline removal, strong global gradient removal, tight percentile (10–90), and lower gamma so headlines and CTAs show as distinct hotspots. Redeploy the saliency service after changing `main.py` for new scans to use the updated heatmaps.

## API

- **GET /health** – `{ "status": "ok", "model": "MDS-ViTNet" }`
- **POST /predict** – Body: `{ "image_base64": "<base64 or data URL>" }`. Optional: `"width"`, `"height"` for heatmap size. Response: `{ "heatmap_base64": "<base64 PNG>" }`.

## Coolify – Version 1 (same repo, two deployments)

Deploy CHECKION and the saliency service as **two separate applications** from the same GitHub repo.

### 1. Saliency Service (second application)

- **Repository:** Your CHECKION GitHub repo (same as the main app).
- **Build:**
  - **Type:** Dockerfile.
  - **Build context / Root directory:** `saliency-service`.
  - **Dockerfile path:** `Dockerfile` (relative to that context – do not use `saliency-service/Dockerfile` or Coolify will look for `saliency-service/saliency-service`).
- **Port:** `8000` (expose in Coolify).
- **Weights (choose one):**
  - **Option A – Env in Coolify:** Add env var  
    `WEIGHTS_FOLDER_ID=10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0`  
    (MDS-ViTNet Google Drive folder). On first start the container will try to download the weights into `mds_vitnet/weights`.
  - **Option B – Volume:** In Coolify add a volume mount: container path  
    `/app/mds_vitnet/weights`  
    → host path or Coolify volume where you have placed `ViT_multidecoder.pth` and `CNNMerge.pth` (e.g. downloaded once from [Google Drive](https://drive.google.com/drive/folders/10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0)).
- Deploy. Note the **internal URL** of this service (e.g. `http://<saliency-app-name>:8000` or the hostname Coolify shows for this app).

### 2. CHECKION (main app)

- In the **CHECKION** application in Coolify, open **Environment Variables**.
- Add:
  - **Name:** `SALIENCY_SERVICE_URL`
  - **Value:** internal URL of the saliency service, e.g. `http://<saliency-service-name>:8000` (use the hostname Coolify uses for the saliency app in the same environment).
- Save and redeploy CHECKION so it uses the new variable.

After that, every new scan will trigger async saliency generation; the results page shows the heatmap once it’s ready.

## Docker (local)

Build and run locally (weights via volume or `WEIGHTS_FOLDER_ID`):

```bash
cd saliency-service
docker build -t checkion-saliency .
docker run -p 8000:8000 -e WEIGHTS_FOLDER_ID=10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0 checkion-saliency
```
