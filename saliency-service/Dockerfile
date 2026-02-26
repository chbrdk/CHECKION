# Saliency service for CHECKION (MDS-ViTNet) – same repo, deploy as second app in Coolify
# Python 3.10 required: MDS-ViTNet pins torch==1.13.1, torchvision==0.14.1 (no 3.11 wheels)
FROM python:3.10-slim-bookworm

WORKDIR /app

# System deps for building Python packages and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone MDS-ViTNet (no weights yet – see entrypoint or volume mount)
RUN git clone --depth 1 https://github.com/IgnatPolezhaev/MDS-ViTNet.git mds_vitnet

# Install MDS-ViTNet dependencies then our API deps (long timeout for large wheels on slow build networks)
RUN pip install --no-cache-dir --timeout 600 --retries 3 -r mds_vitnet/requirements.txt
# Pin NumPy <2: torch 1.13 / torchvision 0.14 were built for NumPy 1.x; NumPy 2.x causes "module compiled with NumPy 1.x cannot run"
RUN pip install --no-cache-dir 'numpy<2'
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 600 -r requirements.txt

# Optional: gdown for one-time weights download from Google Drive (set WEIGHTS_FOLDER_ID in Coolify)
RUN pip install --no-cache-dir gdown

# Our service (heatmap_postprocess shared with SUM backend)
COPY main.py heatmap_postprocess.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Weights go here at runtime (volume mount or entrypoint download)
RUN mkdir -p mds_vitnet/weights

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["python", "main.py"]
