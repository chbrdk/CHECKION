# Projekt: Seitenthemen-Vergleich (Konkurrenz)

## UI

- Route: `pathProjectPageTopics(projectId)` in [`lib/constants.ts`](../lib/constants.ts) → `/projects/[id]/page-topics`.
- Navigation: Tab „Seitenthemen“ / „Page topics“ in [`components/ProjectHeaderNav.tsx`](../components/ProjectHeaderNav.tsx).
- Projekt-Übersicht: Card mit Kurzhinweis + Link zum Vergleich ([`app/projects/[id]/page.tsx`](../app/projects/[id]/page.tsx)).
- Seite rendert je Domain [`DomainResultPageTopicsCard`](../components/domain/DomainResultPageTopicsCard.tsx) (gleiche Daten wie Domain-Tab „Seitenthemen“).

## API

- `GET /api/projects/[id]/domain-summary-all` liefert für **own** und jeden **competitor** (bei `status === 'complete'`) zusätzlich `aggregated.pageClassification` – **light-gekappt** via [`toLightAggregated`](../lib/domain-summary.ts) (Themes/Samples/relatedPages wie bei Light-Summary).
