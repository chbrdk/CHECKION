# CHECKION × Pretext (virtual list row heights)

## References (single source in code)

- Package name: `PRETEXT_PACKAGE_NAME` in `lib/constants.ts`
- URLs: `PRETEXT_NPM_URL`, `PRETEXT_REPO_URL` in `lib/constants.ts`
- Upstream: [chenglou/pretext on GitHub](https://github.com/chenglou/pretext)

## What we use it for

`@chenglou/pretext` measures multiline text height **without DOM layout** (`prepare` + `layout`). CHECKION uses it to feed **per-index `estimateSize`** into `@tanstack/react-virtual` for:

- `components/ScanIssueList.tsx` — scan issue rows (message + code columns vs. grid `fr` widths)
- `components/DomainAggregatedIssueList.tsx` — legacy aggregated issues table

`ResizeObserver` on the scroll container supplies **inner width**; fonts are chosen to align with MUI / `ThemeProvider` (Inter stack, monospace for code).

## Limitations

- **SSR / Node / Vitest:** no canvas → fallbacks `SCAN_ISSUE_LIST_ROW_FALLBACK_PX` and `DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX`.
- **Expanded `<details>`** in `ScanIssueRow`: height still corrected via `measureElement`.
- Pretext models common CSS text wrapping; small drift vs. real chips/padding is acceptable because `measureElement` remains.

## Tests

- `__tests__/lib/pretext-issue-row-geometry.test.ts` — column width math + fallback behaviour in Node
- `__tests__/lib/constants-paths.test.ts` — Pretext URL constants
