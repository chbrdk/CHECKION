# Competitor scan changes (CHECKION)

## Purpose

Between consecutive **deep scans** of the same normalized host (own project domain or competitor), CHECKION computes a **diff** and surfaces it in:

- Project UI (`GET /api/projects/[id]/competitor-changes`)
- Deep project report / PDF (`competitiveBenchmark.scanChanges`)

## Lineage

Previous scan = same `lineage_key`, `lineage_version - 1`, `status = complete`.

- Own domain: `lineage_key = userId|projectId|host`
- Competitor: `lineage_key = userId||host` (`projectId` null on scan row)

See [checkion-domain-scan-lineage.md](./checkion-domain-scan-lineage.md).

## Page change kinds

| Kind | Meaning |
|------|---------|
| `new` | URL only in current scan |
| `removed` | URL only in previous scan |
| `unchanged` | `reusedUnchanged` or matching ETag/Last-Modified |
| `likely_updated` | Header change or full rescan without reuse |

## Theme diff

After optional `classifyPageTopics`, aggregated `topThemes` and per-page `pageClassification` are compared (`lib/domain-scan-diff-themes.ts`).

## Storage

Table `domain_scan_diffs` — one row per `current_domain_scan_id`, JSON payload `DomainScanDiffResult`.

## API

Central path: `apiProjectCompetitorChanges(projectId)` in `lib/constants.ts`.

Query `?lazy=false` skips on-read recompute when diff row is missing.

## Hooks

- `lib/domain-scan-start.ts` — after scan `complete`
- `lib/domain-scan-page-classification-job.ts` — after classification refresh

## Re-scan recommendation

Use `skipUnchangedPages=true` on competitor re-scans to save cost while still detecting new URLs (sitemap) and header changes.
