# Axe WCAG Levels & Issue Deduplication (CHECKION)

## Overview

- **Axe rule → WCAG level:** axe-core returns rule IDs (e.g. `image-alt`, `color-contrast`) without WCAG level in the code. CHECKION maps them in `lib/axe-wcag-levels.ts` (`AXE_RULE_WCAG_LEVEL`) so that axe issues get a level A/AA/AAA/APCA instead of `Unknown`.
- **Deduplication:** axe and HTML CodeSniffer often report the same finding (e.g. missing alt on the same image). `lib/issue-dedupe.ts` groups issues by normalized selector + canonical rule group and keeps one issue per group, preferring the one with a known `wcagLevel` (so level stats and UI show A/AA/AAA correctly).

## Files

- **`lib/axe-wcag-levels.ts`** – `AXE_RULE_WCAG_LEVEL: Record<string, 'A'|'AA'|'AAA'|'APCA'>` for axe rule IDs. Source: axe-core rule descriptions (wcag2a, wcag2aa, wcag2aaa, etc.).
- **`lib/issue-dedupe.ts`** – `normalizeSelector`, `getRuleGroup`, `deduplicateIssues`. `getRuleGroup` maps htmlcs sniffer codes (e.g. H37) to the same logical key as axe (e.g. `image-alt`) via `HTMLCS_SNIFFER_TO_AXE` so axe + htmlcs duplicates merge.
- **`lib/scanner.ts`** – `detectWcagLevel(code, runner)` uses the axe map when `runner === 'axe'`. After building the raw issues list, `deduplicateIssues(rawIssues)` is applied before `computeStats` and the scan result.

## Tests

- **`__tests__/lib/issue-dedupe.test.ts`** – `normalizeSelector`, `getRuleGroup`, `deduplicateIssues` (merge same selector+rule, keep two for different rules, prefer known wcagLevel), and `AXE_RULE_WCAG_LEVEL` sanity checks.
