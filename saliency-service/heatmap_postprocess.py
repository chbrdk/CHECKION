"""
EyeQuant-style heatmap post-processing: reduce top-to-bottom bias, emphasize local hotspots.
Tuned for headlines and images (fine-grained, less global wash).
Used by both MDS-ViTNet (main.py) and SUM (main_sum.py) backends.
"""
from __future__ import annotations

import numpy as np

# Preset: more sensitive to headlines/images (stronger baseline removal, tighter local contrast)
ROW_BASELINE_FACTOR = 1.0  # full vertical baseline removal (was 0.85)
GLOBAL_GRADIENT_FACTOR = 0.99  # strip almost all global gradient (was 0.97)
GLOBAL_SIGMA_FRAC = 3  # denominator: min(h,w)/3 → larger blur, more removed (was 4)
PERCENTILE_LO, PERCENTILE_HI = 5, 95  # tighter stretch so only real hotspots go hot (was 10, 90)
LOCAL_CONTRAST_FACTOR = 2.8  # stronger local emphasis = clearer headlines/images (was 1.8)
LOCAL_SIGMA_FRAC = 400  # min(h,w)/400 → headline-scale neighborhood (was 800)
UNSHARP_FACTOR = 1.3  # crisper hotspots (was 0.9)
UNSHARP_SIGMA = 0.6  # finer sharpening (was 0.8)
GAMMA = 0.28  # push more into hot range so small differences visible (was 0.38)


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
    # 2) Strong global gradient removal → only local structure (headlines, images) remains
    sigma_global = max(40.0, min(out_h, out_w) / GLOBAL_SIGMA_FRAC)
    global_smooth = gaussian_filter(arr, sigma=sigma_global, mode="nearest")
    arr = arr - GLOBAL_GRADIENT_FACTOR * global_smooth
    arr = np.clip(arr, 0, 1)
    # 3) Tight percentile stretch so hotspots use full range
    lo, hi = np.percentile(arr, [PERCENTILE_LO, PERCENTILE_HI])
    if hi > lo:
        arr = (arr - lo) / (hi - lo)
    arr = np.clip(arr, 0, 1)
    # 4) Strong local contrast at headline/image scale
    sigma_local = max(2.0, min(out_h, out_w) / LOCAL_SIGMA_FRAC)
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
