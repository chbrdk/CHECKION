#!/usr/bin/env python3
"""Summarize Chrome Performance trace (DevTools). Usage: gzip -dc Trace.json.gz | python3 scripts/analyze-chrome-trace.py"""
import json
import sys
from collections import defaultdict


def main() -> None:
    d = json.load(sys.stdin)
    events = d.get("traceEvents", [])

    func_total: defaultdict[str, float] = defaultdict(float)
    name_count: defaultdict[str, int] = defaultdict(int)
    long: list[tuple[float, str, str]] = []

    for e in events:
        if e.get("ph") != "X":
            continue
        dur_us = e.get("dur")
        if dur_us is None:
            continue
        dur_ms = dur_us / 1000.0
        if dur_ms < 5:
            continue
        name = e.get("name", "")
        cat = e.get("cat", "")
        func_total[name] += dur_ms
        name_count[name] += 1
        if dur_ms >= 50:
            long.append((dur_ms, name, cat))

    long.sort(reverse=True)

    print("=== Top slices by total self-time (sum of ph=X >= 5ms per event name) ===")
    for name in sorted(func_total, key=lambda x: -func_total[x])[:35]:
        print(f"{func_total[name]:9.1f} ms  ({name_count[name]:4}x)  {name[:120]}")

    print("\n=== Individual long tasks (>= 50ms), top 30 ===")
    for dur_ms, name, cat in long[:30]:
        print(f"{dur_ms:8.1f} ms  {name[:90]}  [{cat[:50]}]")

    print("\n=== Keyword hits in long event names (>= 25ms) ===")
    keywords = (
        "RunTask",
        "Layout",
        "Paint",
        "CompositeLayers",
        "Commit",
        "FunctionCall",
        "Major GC",
        "Minor GC",
        "ParseHTML",
        "EvaluateScript",
        "XHR",
        "FireAnimationFrame",
        "TimerFire",
        "v8",
        "React",
        "MessageLoop",
    )
    kw_totals: defaultdict[str, float] = defaultdict(float)
    for e in events:
        if e.get("ph") != "X" or e.get("dur", 0) < 25000:
            continue
        dur_ms = e["dur"] / 1000.0
        nm = e.get("name", "")
        for kw in keywords:
            if kw.lower() in nm.lower() or kw.lower() in (e.get("cat") or "").lower():
                kw_totals[kw] += dur_ms
                break

    for kw in sorted(kw_totals, key=lambda x: -kw_totals[kw]):
        print(f"  {kw}: {kw_totals[kw]:.1f} ms total (rough bucket)")


if __name__ == "__main__":
    main()
