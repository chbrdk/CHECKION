# WCAG Accessibility Score (CHECKION)

## Overview

The WCAG summary card on the project WCAG page shows a **0–100 WCAG score** derived from aggregated issue counts (errors, warnings, notices) and total page count.

## Standard

**W3C/WCAG** does not define an official numerical "accessibility score" formula. CHECKION uses a **severity-weighted, page-normalized** approach aligned with common tooling:

- **Lighthouse**: weighted accessibility audits (axe impact); we approximate via severity (error/warning/notice).
- **BrowserStack**: P/(P+F)×100 with severity weights (Critical 10, Serious 7, Moderate 3, Minor 1).

## Formula (see `lib/wcag-score.ts`)

- **Weights**: Error = 10, Warning = 3, Notice = 1 (aligned with axe/Lighthouse impact levels).
- **Weighted total** = `errors×10 + warnings×3 + notices×1`.
- **Per page** = `weightedTotal / max(1, totalPageCount)`.
- **Score** = `max(0, min(100, 100 - weightedPerPage))`, rounded to integer.

So: 0 issues → 100; ~10 weighted issues per page → 90; high issues per page → lower score.

## Labels

- **90–100**: Excellent  
- **70–89**: Good  
- **50–69**: Fair  
- **25–49**: Poor  
- **0–24**: Critical  

## Where used

- **Project WCAG page** (`app/projects/[id]/wcag/page.tsx`): Summary card shows score, label, and InfoTooltip with formula explanation.
- Reusable: `computeWcagScore()` can be used on domain page or elsewhere if we add the same summary there.
