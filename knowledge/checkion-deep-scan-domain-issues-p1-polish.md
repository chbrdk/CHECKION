# Deep Scan – Domain Issues (P1 Polish / Next Steps)

## Kontext
Wir haben das “Gefundene Issues (Domain)” **serverseitig** optimiert:
- Raw Issues + Page-Index in neuen Tabellen (`domain_pages`, `domain_page_issues`)
- Aggregierte Gruppen in `domain_issue_groups`
- UI nutzt **paged APIs** statt große Arrays im `domain_scans.payload`
- Legacy Scans werden **on-demand** backfilled

Dieses Dokument sammelt sinnvolle **P1 Verbesserungen**, falls wir noch mehr Stabilität/Skalierung brauchen (1000+ Seiten / zig tausend Issues).

## P1 – Datenbank & Query Performance

- **Search Performance (q)**
  - Aktuell nutzt `q` ein `ILIKE` über `domain_issue_groups.message` / `code`.
  - Bei sehr großen Daten kann das teuer werden.
  - Option:
    - `pg_trgm` aktivieren (falls erlaubt) und `GIN` trigram index auf `message`/`code`
    - Alternativ: full-text search (tsvector) für `message`

- **Composite Indexes für Standardfilter**
  - Wenn wir immer `(domain_scan_id, user_id)` filtern, kann ein zusammengesetzter Index helfen:
    - `domain_issue_groups(domain_scan_id, user_id, page_count desc)`
    - `domain_page_issues(domain_scan_id, user_id, group_key)`
  - Nur hinzufügen, wenn wir in DB-Explain echte Bottlenecks sehen (Index-Wachstum vs. Nutzen).

- **Retention / Storage Growth**
  - `domain_page_issues` ist high-volume. Bei regelmäßigen Scans wächst das sehr schnell.
  - Optionen:
    - TTL/Retention pro Scan (z. B. “keep last 20 scans per domain”)
    - Periodisches Cleanup älterer `domain_scan_id`s
    - Optional: nur Gruppen speichern, raw issues nur für “letzte N Scans” (Trade-off)

## P1 – Writer Pipeline Robustheit & Betrieb

- **Asynchroner Aggregations-Job**
  - Aktuell: best-effort persist + aggregation beim Scan-Ende (in-process).
  - Bei sehr großen Scans kann das CPU/IO-lastig sein.
  - Option:
    - Domain Scan Completion schreibt nur “scan complete”
    - Ein separater Worker/Job verarbeitet “persist + aggregate”
    - UI zeigt Status “Aggregating…” bis Gruppen verfügbar sind

- **Progress/Status-Feld**
  - Optionales Feld (z. B. `domain_scans.payload.issueStorageStatus`) um zu zeigen:
    - `pending | running | complete | error`
  - Hilft Support/Observability, besonders wenn Backfill läuft.

- **Idempotency / Rebuild Trigger**
  - Rebuild ist derzeit “full rebuild” (safe).
  - P1: Admin/Repair Endpoint (auth-only) um:
    - `rebuildDomainIssuesFromPages(domainScanId)` manuell anzustoßen
    - hilfreich bei Datenmigrationen oder fehlgeschlagenen Backfills

## P1 – UI Skalierung & UX

- **Master/Detail (Liste & Details)** — **ohne** JS-Virtualisierung: `components/DomainIssuesMasterDetail.tsx` rendert die drei Spalten als **normale HTML-Listen** (`map`) in `overflow: auto` mit Höhen aus `lib/domain-issues-layout.ts`. API bleibt **paginiert** (Load more) — typisch wenige hundert DOM-Zeilen, dafür kein `translateY`/Schätz-Höhen-Chaos. Virtualisierung wäre nur nötig bei extrem vielen geladenen Zeilen ohne Pagination.

- **UX-Polish (Zeilenlayout)**
  - Gemeinsame Primitives in `components/domain-issues/IssueListPrimitives.tsx` (`IssueSeverityRail`, `IssueTypeIcon`, `issueTypeColor`, Fokus-Styles).
  - Listenzeilen: linke 4px-Akzentleiste, Icons nach Schweregrad, Message/Code mit Tooltip; natürlicher Zeilenfluss (keine virtuellen `translateY`-Positionen).
  - **Layout:** Oben eine volle Breite **Filter-Karte** (`tabListDetails` + `issuesMasterSubtitle`, Severity/WCAG-Toggles, Suche, Apply/Reset). Darunter ein **Grid** nur mit den drei Listen-Karten. Erste Spalte: Titel `issuesColumnGroupsTitle` („Gruppen“ / „Groups“), ohne doppelten Subtitle.
  - **Progressive Spalten (`lg`):** Stufe 1 nur Gruppen (volle Breite); Stufe 2 nach Gruppenwahl schmale Gruppen-Spalte + breite URL-Spalte; Stufe 3 nach Seitenwahl drei Spalten (äußere schmal, Issue-Details `minmax(0,1fr)`). Unter `xs` eine Spalte, Karten untereinander; Scroll-Bereiche mit **vh**-Caps aus `DOMAIN_ISSUES_SCROLL`.
  - **CSS Grid:** Direkte Grid-Kinder mit `minHeight: 0` (`'& > *'`), damit die Zeilenhöhe begrenzt bleibt und **Scroll** in den Karten stattfindet.
  - **Scroll-Höhen:** Zentral `lib/domain-issues-layout.ts` (`DOMAIN_ISSUES_SCROLL`). Die Issues-UI sitzt in `app/domain/[id]/page.tsx` in einer weiteren `MsqdxMoleculeCard` ohne feste Höhe — `maxHeight: 100%` auf den Listen-Scrollareas greift allein oft nicht; **vh**-Caps bleiben nötig; um `DomainIssuesMasterDetail` herum `flex: 1` / `minHeight: 0` im Issues-Tab.
  - Filter: MUI `ToggleButtonGroup` für Typ und WCAG (statt vieler Einzel-Chips).
  - Leere Spalten: `IssuesEmptyState`; Detail: Selector-Block + Copy, Help-Link als `Button` mit Icon.

- **Filter UX**
  - UI optional: Chips/Select für `type`, `wcagLevel`, Search bar (`q`)
  - Query-Params direkt in URL abbilden (shareable state).

- **Prefetch**
  - Beim Select einer Gruppe:
    - erste Page “betroffene Seiten” prefetch
  - Beim Hover über eine Seite:
    - erste Page “Issues (Seite)” prefetch

## Backfill-Verhalten (Implementiert)

- Legacy-Backfill auf `GET .../issue-groups` wird nur noch ausgelöst, wenn **die erste ungefilterte Seite leer ist** und `count(*)` auf `domain_issue_groups` für den Scan **0** ist. So wird kein teurer Re-Import ausgelöst, nur weil ein **Filter/Suche** keine Treffer liefert.

## P1 – Observability & Safety

- **Metrics**
  - Log/Usage-Event:
    - Anzahl inserted issues, group count, runtime
  - Warn wenn runtime über Threshold (z. B. > 10s)

- **Rate Limit Granularität**
  - Aktuell gleicher Key `domain-issues:${userId}` für alle 3 Endpoints.
  - P1: getrennte Keys oder endpoint-spezifische Limits.

## Quick Checklist (wenn Performance wieder auffällt)
- DB: `EXPLAIN ANALYZE` auf `issue-groups` query (mit/ohne q)
- Prüfen: Rows in `domain_page_issues` pro Scan (Größenordnung)
- UI: Anzahl Requests pro Interaktion (debounce, prefetch)
- Writer: Runtime und Fehlerquote (Backfill/Writer)

