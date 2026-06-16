# Competitor scan changes (CHECKION)

## Purpose

Between consecutive **deep scans** of the same normalized host (own project domain or competitor), CHECKION computes a **diff** and surfaces it in:

- Project UI (`GET /api/projects/[id]/competitor-changes`)
- Unread alerts (`GET /api/projects/[id]/competitor-alerts`)
- Page topics compare (`/projects/[id]/page-topics`)
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
| `unchanged` | `reusedUnchanged` or matching ETag/Last-Modified or matching `contentFingerprint` |
| `likely_updated` | Header change, fingerprint change, or full rescan without reuse |

## Content fingerprint (Phase 5)

`scans.result.contentFingerprint` = SHA-256 slice of normalized `title + h1 + bodyTextExcerpt` (`lib/content-fingerprint.ts`). Used when cache headers are missing.

## Theme diff

After optional `classifyPageTopics`, aggregated `topThemes` and per-page `pageClassification` are compared (`lib/domain-scan-diff-themes.ts`).

## Storage

- `domain_scan_diffs` — one row per `current_domain_scan_id`
- `competitor_change_alerts` — unread notifications per project

## API paths (`lib/constants.ts`)

- `apiProjectCompetitorChanges(projectId)`
- `apiProjectCompetitorAlerts(projectId)`
- `API_CRON_COMPETITOR_RESCANS` — `POST /api/cron/competitor-rescans` with `Authorization: Bearer {CHECKION_CRON_SECRET}`

## Hooks

- `lib/domain-scan-start.ts` — after scan `complete`
- `lib/domain-scan-page-classification-job.ts` — after classification refresh

## Re-scan defaults

`skipUnchangedPages` defaults to **true** when a prior complete scan exists (competitor + own domain). Override with `?skipUnchangedPages=false`.

## Scheduled re-scans (Phase 6)

Coolify/cron example (weekly):

```http
POST https://checkion.example/api/cron/competitor-rescans?minAgeDays=7
Authorization: Bearer <CHECKION_CRON_SECRET>
```

Env:

| Variable | Default | Meaning |
|----------|---------|---------|
| `CHECKION_CRON_SECRET` | — | Required for cron route |
| `CHECKION_COMPETITOR_RESCAN_MIN_AGE_DAYS` | 7 | Min age before re-scan |
| `CHECKION_COMPETITOR_RESCAN_MAX_PROJECTS` | 50 | Cap per cron run |

## Backfill historical diffs

```bash
DATABASE_URL=... npx tsx scripts/backfill-domain-scan-diffs.ts
```

Docker one-shot: `CHECKION_BACKFILL_DOMAIN_SCAN_DIFFS_ON_START=1` in entrypoint (see `scripts/docker-entrypoint.sh`).
