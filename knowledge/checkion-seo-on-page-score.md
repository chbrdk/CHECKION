# SEO On-Page Score (CHECKION)

## Overview

The project SEO-on-page page shows a **0–100 SEO on-page score** derived from aggregated meta coverage, heading structure, and content depth from the deep scan.

## Standard

There is **no single official "SEO score"** formula. CHECKION uses a transparent, weighted combination of the on-page signals we collect:

- **Meta/tag coverage**: Share of pages with title, meta description, H1, and canonical.
- **Heading structure**: Share of pages with a single H1 and no skipped heading levels.
- **Content depth**: Share of pages that are not "skinny" (≥ 300 words).

## Formula (see `lib/seo-on-page-score.ts`)

- **Coverage (40%)**: Average of (withTitle, withMetaDescription, withH1, withCanonical) / totalPages → 0–40 points.
- **Structure (30%)**: pagesWithGoodStructure / structureTotalPages → 0–30 points. If no structure data, 30 points (no penalty).
- **Content (30%)**: (1 − skinnyCount / totalPages) → 0–30 points. Skinny = word count &lt; 300.
- **Score** = coverage + structure + content, clamped to 0–100.

No pages or no SEO data → score 0.

## Labels

- **90–100**: Excellent  
- **70–89**: Good  
- **50–69**: Fair  
- **25–49**: Poor  
- **0–24**: Critical  

## Where used

- **Project SEO page** (`app/projects/[id]/seo/page.tsx`): Header card shows score, label, and InfoTooltip with formula (i18n: `projects.seo.scoreTooltip`).
- Reusable: `computeSeoOnPageScore({ seo, structure })` returns `{ score, label, breakdown }` for tooltips or other UI.
