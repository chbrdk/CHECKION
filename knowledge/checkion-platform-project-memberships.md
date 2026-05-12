# CHECKION Platform Project Memberships

## Goal
Enable `PLEXON` to grant explicit `CHECKION` project access per user without replacing `CHECKION` as the local authorization authority.

## Local Model
- `projects.userId` remains the owner anchor for legacy rows and shared-project data ownership.
- `project_members` adds explicit memberships per `projectId + userId`.
- Supported roles:
  - `owner`
  - `admin`
  - `member`
- `platform_managed_project_memberships` tracks which memberships came from `PLEXON`, so resyncs only mutate platform-managed rows.

## Access Rules
- `owner` and `admin` can update project metadata.
- Only `owner` can delete a project.
- Read access is granted through:
  - an active `project_members` row, or
  - legacy owner fallback via `projects.userId`

## Compatibility Strategy
- Existing projects continue to work even before an explicit owner membership backfill, because reads and writes still fall back to `projects.userId`.
- New projects now create an explicit owner membership row immediately.

## Provisioning Contract
- `PUT /api/platform/provisioning/users/[id]` now accepts `projectAssignments`.
- Each assignment contains:
  - `projectId`
  - `role` (`admin` or `member`)
- On `granted`:
  - local shadow user is upserted or refreshed
  - project assignments are validated against local `projects`
  - platform-managed memberships are replaced idempotently
- On `disabled`:
  - local API tokens are revoked
  - platform-managed memberships are removed

## Current Shared-Project Read Paths
After membership access succeeds, these endpoints now resolve project data through the project owner id:
- `app/api/projects/[id]/route.ts`
- `app/api/projects/[id]/domain-summary/route.ts`
- `app/api/projects/[id]/domain-summary-all/route.ts`
- `app/api/projects/[id]/domain-scans/active/route.ts`
- `app/api/projects/[id]/geo-summary/route.ts`
- `app/api/projects/[id]/geo-latest-result/route.ts`
- `app/api/projects/[id]/geo-question-history/route.ts`
- `app/api/projects/[id]/ranking-summary/route.ts`
- `app/api/rank-tracking/keywords/route.ts`

Shared-project access now also covers these non-project-param detail and history flows:
- `app/api/scan/[id]/route.ts`
- `app/api/scan/geo-eeat/[jobId]/route.ts`
- `app/api/scan/geo-eeat/[jobId]/status/route.ts`
- `app/api/scan/geo-eeat/[jobId]/competitive-history/route.ts`
- `app/api/scan/geo-eeat/[jobId]/competitive-history/[runId]/route.ts`
- `app/api/scan/journey-agent/[jobId]/route.ts`
- `app/api/scan/journey-agent/[jobId]/video/route.ts`
- `app/api/scan/journey-agent/[jobId]/live/route.ts`
- `app/api/scan/journey-agent/[jobId]/live/stream/route.ts`

Global discovery and sharing now also respect shared-project owner-backed resources:
- `app/api/scan/route.ts` now resolves explicit shared-project filters through the owner and, without a `projectId`, merges viewer-owned and shared-project standalone scans.
- `app/api/scans/route.ts` now mirrors shared-project visibility for its legacy raw standalone history output.
- `app/api/scans/domain/route.ts` now merges accessible shared-project deep scans into the default global list instead of only the viewer-owned subset.
- `app/api/scan/geo-eeat/history/route.ts` and `app/api/scan/journey-agent/history/route.ts` now merge accessible shared-project runs into their default history views.
- `app/api/search/route.ts` now includes scans and domain scans from accessible shared projects and resolves domain page payloads through the owner user id.
- `app/api/share/route.ts` can now create shares for shared-project domain scans, GEO runs, and Journey runs after membership-backed access resolution.
- Public share token reads under `app/api/share/[token]/**` now resolve the underlying resource by id instead of assuming the share creator is also the resource owner.

Default list semantics now explicitly distinguish:
- missing `projectId` query param -> all accessible work in that surface
- empty `projectId` query param -> only unassigned work
- concrete `projectId` -> that exact project, resolved owner-backed when shared

## Current Shared-Project Write And Start Paths
These endpoints now store project-linked work under the project owner id after membership access succeeds:
- `app/api/scan/route.ts`
- `app/api/scan/domain/route.ts`
- `app/api/projects/[id]/domain-scan-all/route.ts`
- `app/api/projects/[id]/domain-scan-competitor/route.ts`
- `app/api/scan/geo-eeat/route.ts`
- `app/api/scan/journey-agent/route.ts`
- `app/api/rank-tracking/refresh/route.ts`

These project-assignment routes now resolve the target project through the owner-backed project context when assigning to a shared project:
- `app/api/scan/[id]/project/route.ts`
- `app/api/scans/domain/[id]/project/route.ts`
- `app/api/scan/geo-eeat/[jobId]/project/route.ts`
- `app/api/scan/journey-agent/[jobId]/project/route.ts`

For owner-backed shared resources, `projectId: null` detach now also resolves through the current resource owner instead of the viewer id.
Cross-owner re-home attempts remain intentionally blocked for owner-backed resources, because these flows would otherwise imply data migration across independent owner domains.

Additional shared-project behavior:
- `app/api/scan/domain/[id]/classify/route.ts` now resolves through domain-scan access and stays owner-only for mutations.
- `app/api/journeys/route.ts` can now create viewer-owned saved journeys for shared domain scans after access verification.
- `app/api/scan/geo-eeat/competitive-only/route.ts` now stores project-linked runs owner-backed when a shared project id is supplied.

## Known Follow-Up
- Global history and list surfaces that intentionally aggregate "all my accessible work" should still be reviewed case by case so owner-backed shared resources appear only where the UX actually wants collaborative visibility.
- The legacy `app/api/scans/route.ts` endpoint is now aligned for shared visibility, but it remains a raw standalone-history API rather than the preferred paginated dashboard list contract.
- If later product rules should allow moving resources between different project owners, that must be a deliberate migration flow rather than a plain project reassignment.
- A later backfill can materialize explicit owner memberships for all legacy projects, but the current fallback avoids rollout pressure.
