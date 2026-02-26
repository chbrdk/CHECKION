"""
EyeQuant-style heatmap post-processing: reduce top-to-bottom bias, emphasize local hotspots.
Used by both MDS-ViTNet (main.py) and SUM (main_sum.py) backends.
"""
from __future__ import annotations

import numpy as np


def postprocess_eyequant_style(arr: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    """Reduce vertical baseline and global gradient; stretch contrast and gamma so headlines/CTAs pop."""
    from scipy.ndimage import gaussian_filter

    arr = np.clip(arr.astype(np.float64), 0, 1)
    # 1) Remove vertical baseline so headlines/elements elsewhere pop
    row_means = np.mean(arr, axis=1)
    sigma_row = max(15.0, out_h / 8)
    row_baseline = gaussian_filter(row_means, sigma=sigma_row, mode="nearest")
    row_baseline_2d = np.tile(row_baseline[:, np.newaxis], (1, out_w))
    arr = arr - 0.85 * row_baseline_2d
    arr = np.clip(arr, 0, 1)
    # 2) Remove global gradient → only local hotspots (EyeQuant-style)
    sigma_global = max(35.0, min(out_h, out_w) / 4)
    global_smooth = gaussian_filter(arr, sigma=sigma_global, mode="nearest")
    arr = arr - 0.97 * global_smooth
    arr = np.clip(arr, 0, 1)
    # 3) Stretch contrast: percentile 10–90 so hotspots use full range
    lo, hi = np.percentile(arr, [10, 90])
    if hi > lo:
        arr = (arr - lo) / (hi - lo)
    arr = np.clip(arr, 0, 1)
    # 4) Local contrast: emphasize edges of attention blobs
    sigma_local = max(1.0, min(out_h, out_w) / 800)
    local_mean = gaussian_filter(arr, sigma=sigma_local, mode="nearest")
    arr = arr + 1.8 * (arr - local_mean)
    arr = np.clip(arr, 0, 1)
    # 5) Unsharp: crisper hotspots
    blur = gaussian_filter(arr, sigma=0.8, mode="nearest")
    arr = arr + 0.9 * (arr - blur)
    arr = np.clip(arr, 0, 1)
    # 6) Gamma: push into hot range so headlines/buttons pop
    arr = np.power(arr, 0.38)
    return np.clip(arr, 0, 1)
