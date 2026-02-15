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

## Coolify – Version 1 (same repo, two deployments)

Deploy CHECKION and the saliency service as **two separate applications** from the same GitHub repo.

### 1. Saliency Service (second application)

- **Repository:** Your CHECKION GitHub repo (same as the main app).
- **Build:**
  - **Type:** Dockerfile.
  - **Dockerfile path:** `saliency-service/Dockerfile`.
  - **Build context / Root directory:** `saliency-service` (so the context is the folder that contains `main.py`, `requirements.txt`, `Dockerfile`, `entrypoint.sh`).
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
