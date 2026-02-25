# SUM Saliency Service – Build (Dockerfile.sum)

## Einschränkungen

- **SUM** (GitHub Arhosseini77/SUM) nutzt **causal-conv1d==1.0.2** und **mamba-ssm==1.0.1**.
- **causal-conv1d** wurde für NumPy 1.x und CUDA gebaut; ohne Anpassung schlägt der Build auf Coolify (ohne nvcc) fehl.

## Im Repo umgesetzt

1. **PyTorch CPU-only**  
   `--extra-index-url https://download.pytorch.org/whl/cpu` für torch/torchvision/torchaudio → kleineres Image, kein CUDA auf dem Build-Host nötig.

2. **NumPy &lt; 2**  
   `pip install 'numpy<2'` vor SUM-Requirements und in `requirements-sum.txt`, damit causal-conv1d keine NumPy-2-Inkompatibilität meldet.

3. **causal-conv1d ohne CUDA-Build**  
   - `CAUSAL_CONV1D_SKIP_CUDA_BUILD=TRUE` → kein nvcc, kein `bare_metal_version`-Fehler.  
   - `CAUSAL_CONV1D_FORCE_BUILD=TRUE` → kein Abruf eines CUDA-Prebuilt-Wheels (mit CPU-PyTorch würde `get_wheel_url()` ohnehin scheitern).

4. **mamba-ssm ohne CUDA-Build**  
   - `MAMBA_SKIP_CUDA_BUILD=TRUE` → gleicher `bare_metal_version`-Bug wie bei causal-conv1d wird umgangen.  
   - `MAMBA_FORCE_BUILD=TRUE` → kein Abruf eines Prebuilt-Wheels (CPU-PyTorch hat kein `torch.version.cuda`).

## GPU-Nutzung (optional)

Wenn du auf einem Server mit **CUDA/nvcc** baust und GPU nutzen willst:

- PyTorch mit CUDA-Index installieren (z. B. `--index-url https://download.pytorch.org/whl/cu121`).
- Die beiden Env-Variablen `CAUSAL_CONV1D_SKIP_CUDA_BUILD` und `CAUSAL_CONV1D_FORCE_BUILD` weglassen (oder auf FALSE), damit das Prebuilt-Wheel oder der lokale CUDA-Build genutzt wird.

## CPU-Laufzeit: selective_scan_fn is not defined

Ohne CUDA-Build liefert mamba_ssm keine `selective_scan_cuda`-Extension. SUMs `vmamba.py` importiert `selective_scan_fn` in einem try/except mit `pass` – schlägt der Import fehl, ist der Name nie gesetzt, es kommt aber trotzdem zur Nutzung → **NameError: name 'selective_scan_fn' is not defined**.

**Lösung im Repo:** Nach `pip install -r SUM/requirements.txt` wird `patch_mamba_ssm_cpu.py` ausgeführt. Es patcht die installierte Datei `mamba_ssm/ops/selective_scan_interface.py`: CUDA-Imports in try/except, CUDA-only Klassen/Funktionen in `if _have_cuda:`, am Ende `if not _have_cuda: selective_scan_fn = selective_scan_ref; mamba_inner_fn = mamba_inner_ref`. So läuft SUM auf CPU mit der langsamen Ref-Implementierung.

## Referenzen

- SUM: https://github.com/Arhosseini77/SUM  
- causal-conv1d: https://github.com/Dao-AILab/causal-conv1d (v1.0.2)  
- Coolify-Anleitung: `docs/deployment/coolify-saliency-schritt-fuer-schritt.md`
