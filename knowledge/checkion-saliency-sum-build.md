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

Ohne CUDA-Build liefert mamba_ssm keine `selective_scan_cuda`-Extension. SUMs `vmamba.py` importiert `selective_scan_fn` in einem try/except mit `pass` – schlägt der Import fehl, ist der Name nie gesetzt → **NameError: name 'selective_scan_fn' is not defined**.

**Lösung im Repo (Laufzeit-Stub):** In `main_sum.py` wird vor dem SUM-Import versucht, `mamba_ssm.ops.selective_scan_interface` zu importieren. Schlägt das fehl (ImportError), wird `selective_scan_cpu_stub.py` als Modul `mamba_ssm.ops.selective_scan_interface` in `sys.modules` eingetragen. Der Stub enthält die reine PyTorch-Implementierung `selective_scan_ref` und setzt `selective_scan_fn = selective_scan_ref`. Beim anschließenden Laden von SUM/vmamba wird dieser Stub verwendet, SUM läuft auf CPU (langsamer, aber ohne CUDA).

## EyeQuant-ähnliche Heatmap-Nachbearbeitung (SUM)

SUM liefert oft eine starke Vertikalstruktur (oben hell, unten dunkel). Damit Headlines, CTAs und Spots sichtbar werden wie bei EyeQuant, wird die gleiche Nachbearbeitung wie in `main.py` (MDS-ViTNet) angewendet:

- **Modul:** `heatmap_postprocess.py` → `postprocess_eyequant_style()`
- **Schritte:** Vertikal-Baseline abziehen, globalen Gradienten entfernen, Perzentil 10–90 strecken, lokaler Kontrast, Unsharp, Gamma 0,38.
- **Verwendung:** SUM-Pipeline in `main_sum.py` ruft die Funktion nach dem Resize und vor der Jet-Colormap auf. Tests: `saliency-service/tests/test_heatmap_postprocess.py`.

## Referenzen

- SUM: https://github.com/Arhosseini77/SUM  
- causal-conv1d: https://github.com/Dao-AILab/causal-conv1d (v1.0.2)  
- Coolify-Anleitung: `docs/deployment/coolify-saliency-schritt-fuer-schritt.md`
