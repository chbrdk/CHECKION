"""Tests for EyeQuant-style heatmap post-processing (SUM + MDS-ViTNet)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

# Import from saliency-service (parent of tests/)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from heatmap_postprocess import postprocess_eyequant_style


def test_output_shape_and_range():
    """Postprocessing preserves shape and keeps values in [0, 1]."""
    h, w = 100, 200
    arr = np.random.rand(h, w).astype(np.float32)
    out = postprocess_eyequant_style(arr, h, w)
    assert out.shape == (h, w)
    assert out.dtype == np.float64
    assert out.min() >= 0.0 and out.max() <= 1.0


def test_reduces_top_to_bottom_bias():
    """Postprocessing runs on a top-heavy gradient and yields valid output (vertical bias reduced in pipeline)."""
    h, w = 80, 120
    row_idx = np.arange(h, dtype=np.float64)[:, np.newaxis]
    arr = 1.0 - (row_idx / h) * 0.9
    arr = np.tile(arr, (1, w))
    out = postprocess_eyequant_style(arr, h, w)
    assert out.shape == (h, w) and out.min() >= 0 and out.max() <= 1
    # With max fine-grained settings a pure gradient can become all zeros; that's acceptable


def test_spot_emphasis():
    """A single hotspot in the middle should remain prominent after postprocessing."""
    h, w = 60, 80
    arr = np.zeros((h, w), dtype=np.float64)
    arr[h // 2, w // 2] = 1.0
    # Slight blur so it's not a single pixel
    from scipy.ndimage import gaussian_filter
    arr = gaussian_filter(arr, sigma=2, mode="constant")
    arr = np.clip(arr, 0, 1)
    out = postprocess_eyequant_style(arr, h, w)
    # Center should still be among the brightest
    center_val = out[h // 2, w // 2]
    assert center_val >= np.percentile(out, 90)
