"""
EyeQuant-style heatmap post-processing: reduce top-to-bottom bias, emphasize local hotspots.
Tuned for headlines and images (fine-grained, less global wash).
Used by both MDS-ViTNet (main.py) and SUM (main_sum.py) backends.
"""
from __future__ import annotations

import numpy as np

# Preset: maximum fine-grained – only small local spots (headlines, images, CTAs) visible
ROW_BASELINE_FACTOR = 1.12  # strong oversubtract so no vertical bias
GLOBAL_GRADIENT_FACTOR = 0.999  # strip virtually all global gradient
GLOBAL_SIGMA_FRAC = 1.9  # very large blur → only fine local structure left
PERCENTILE_LO, PERCENTILE_HI = 1, 99  # only the very strongest attention gets hot
LOCAL_CONTRAST_FACTOR = 5.5  # very strong local emphasis → sharp spot boundaries
LOCAL_SIGMA_FRAC = 1800  # min(h,w)/1800 → very small sigma = word/element scale
UNSHARP_FACTOR = 2.2  # very crisp spot edges
UNSHARP_SIGMA = 0.25  # very fine sharpening
GAMMA = 0.14  # maximum sensitivity: tiny differences in attention visible


def postprocess_eyequant_style(arr: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    """Reduce vertical baseline and global gradient; emphasize local hotspots (headlines, images)."""
    from scipy.ndimage import gaussian_filter

    arr = np.clip(arr.astype(np.float64), 0, 1)
    # 1) Full vertical baseline removal so no top-to-bottom bias
    row_means = np.mean(arr, axis=1)
    sigma_row = max(20.0, out_h / 6)
    row_baseline = gaussian_filter(row_means, sigma=sigma_row, mode="nearest")
    row_baseline_2d = np.tile(row_baseline[:, np.newaxis], (1, out_w))
    arr = arr - ROW_BASELINE_FACTOR * row_baseline_2d
    arr = np.clip(arr, 0, 1)
    # 2) Strong global gradient removal → only local structure remains
    sigma_global = max(40.0, min(out_h, out_w) / GLOBAL_SIGMA_FRAC)
    global_smooth = gaussian_filter(arr, sigma=sigma_global, mode="nearest")
    arr = arr - GLOBAL_GRADIENT_FACTOR * global_smooth
    arr = np.clip(arr, 0, 1)
    # 2b) Second pass: remove any remaining broad gradient (even finer result)
    sigma_global2 = max(60.0, min(out_h, out_w) / 1.6)
    global_smooth2 = gaussian_filter(arr, sigma=sigma_global2, mode="nearest")
    arr = arr - 0.97 * global_smooth2
    arr = np.clip(arr, 0, 1)
    # 3) Tight percentile stretch so hotspots use full range
    lo, hi = np.percentile(arr, [PERCENTILE_LO, PERCENTILE_HI])
    if hi > lo:
        arr = (arr - lo) / (hi - lo)
    arr = np.clip(arr, 0, 1)
    # 4) Very fine local contrast (small sigma = word/element scale)
    sigma_local = max(0.4, min(out_h, out_w) / LOCAL_SIGMA_FRAC)
    local_mean = gaussian_filter(arr, sigma=sigma_local, mode="nearest")
    arr = arr + LOCAL_CONTRAST_FACTOR * (arr - local_mean)
    arr = np.clip(arr, 0, 1)
    # 5) Unsharp for crisp hotspots
    blur = gaussian_filter(arr, sigma=UNSHARP_SIGMA, mode="nearest")
    arr = arr + UNSHARP_FACTOR * (arr - blur)
    arr = np.clip(arr, 0, 1)
    # 6) Gamma: more sensitivity in hot range
    arr = np.power(arr, GAMMA)
    return np.clip(arr, 0, 1)
