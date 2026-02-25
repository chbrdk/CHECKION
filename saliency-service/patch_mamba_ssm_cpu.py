#!/usr/bin/env python3
"""
Patch mamba_ssm.ops.selective_scan_interface so it loads without CUDA and
exposes selective_scan_fn = selective_scan_ref, mamba_inner_fn = mamba_inner_ref.
Run after: pip install -r SUM/requirements.txt
"""
import sys
import site

def main():
    # Find mamba_ssm package
    for p in site.getsitepackages() + [site.getusersitepackages()]:
        path = __import__("pathlib").Path(p) / "mamba_ssm" / "ops" / "selective_scan_interface.py"
        if path.exists():
            break
    else:
        print("mamba_ssm.ops.selective_scan_interface not found", file=sys.stderr)
        sys.exit(1)

    text = path.read_text()

    # 1) Replace hard imports with try/except
    old_imports = """from causal_conv1d import causal_conv1d_fn
import causal_conv1d_cuda
import selective_scan_cuda"""
    new_imports = """from causal_conv1d import causal_conv1d_fn
try:
    import causal_conv1d_cuda
    import selective_scan_cuda
    _have_cuda = True
except ImportError:
    causal_conv1d_cuda = None
    selective_scan_cuda = None
    _have_cuda = False"""

    if old_imports not in text:
        print("Original imports not found (already patched?)", file=sys.stderr)
        sys.exit(2)
    text = text.replace(old_imports, new_imports, 1)

    # 2) Wrap CUDA-only block (SelectiveScanFn through mamba_inner_fn) in "if _have_cuda:" and add else fallback
    marker_start = "\nclass SelectiveScanFn(torch.autograd.Function):"
    marker_ref = "\n\ndef mamba_inner_ref("

    if marker_start not in text or marker_ref not in text:
        print("Expected class/def markers not found", file=sys.stderr)
        sys.exit(3)

    idx_start = text.index(marker_start)
    idx_end = text.index(marker_ref)

    block = text[idx_start:idx_end]
    # Indent block by 4 spaces for "if _have_cuda:"
    indented = "\n".join("    " + line if line.strip() else "" for line in block.split("\n"))
    new_block = "\nif _have_cuda:\n" + indented

    text = text[:idx_start] + new_block + text[idx_end:]

    # 3) At end of file: when no CUDA, use ref implementations
    if not text.rstrip().endswith("mamba_inner_ref"):
        # Ensure we have a newline before the fallback
        text = text.rstrip() + "\n\n"
    text += """
if not _have_cuda:
    selective_scan_fn = selective_scan_ref
    mamba_inner_fn = mamba_inner_ref
"""

    path.write_text(text)
    print("Patched", path)

if __name__ == "__main__":
    main()
