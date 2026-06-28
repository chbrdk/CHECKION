# Scan false positives (stacking contexts, overlays, computed-style drift)

## Problem

Pa11y (axe + HTML CodeSniffer) can report findings that are not user-facing violations:

| Cause | Typical rules |
|-------|----------------|
| Wrong background / layer stack | `color-contrast`, `color-contrast-enhanced`, `link-in-text-block` |
| Cookie / chat overlays in DOM | Any selector inside CMP hosts |
| Partial overlap / stacking | `target-size` (partially obscured), future `focus-not-obscured*` |
| Pa11y before page settled | Overlay innards, pre-scroll layout |

## Mitigation

### 1. Scan order (`lib/scanner.ts`)

1. Navigate → dismiss overlays  
2. **Scroll + settle** (`lib/scan-scroll-settle.ts`)  
3. Dismiss overlays again  
4. **Pa11y / WCAG checks** (post-scroll, post-dismiss)  
5. Screenshot + issue filters  

### 2. Post-scan filters (`lib/scan-issue-false-positive-filter.ts`)

| Step | Module |
|------|--------|
| 1 | `non-visible-element-issue-filter` |
| 2 | `color-contrast-false-positive-filter` |
| 3 | `link-in-text-block-false-positive-filter` |
| 4 | `target-size-false-positive-filter` — box + padding, inline-text exception, unobscured 24×24 grid |
| 5 | `focus-not-obscured-false-positive-filter` — focus + hit-test (axe 4.12+ / forward-compatible) |

Shared hit-testing: `lib/element-hit-test.ts`  
WCAG constants: `lib/wcag-target-size.ts`, `lib/wcag-focus-not-obscured.ts`

### Never filtered

Structural / page-level rules (`aria-hidden-focus`, `document-title`, `html-has-lang`, …).

## Tests

- `__tests__/lib/wcag-contrast-math.test.ts`
- `__tests__/lib/color-contrast-false-positive-filter.test.ts`
- `__tests__/lib/scan-issue-false-positive-filter.test.ts`
- `__tests__/lib/wcag-target-size.test.ts`
- `__tests__/lib/target-size-focus-false-positive-filter.test.ts`
- `__tests__/lib/scan-scroll-settle.test.ts`
