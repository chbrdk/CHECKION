# CHECKION – Automatische Remediation-Vorschläge (Feature 2)

**Stand:** Feb 2025

---

## Übersicht

Pro WCAG-Issue wird ein Link zur Fix-Dokumentation angezeigt. So können Nutzer schnell passende Anleitungen und Beispiele finden.

---

## Implementierung

### Datenfluss

1. **Scanner** (`lib/scanner.ts`): Beim Mapping der pa11y-Issues wird `helpUrl` gesetzt:
   - Übernehmen von `raw.helpUrl`, falls vorhanden
   - sonst: `getRemediationUrl(code, runner)` aus `lib/remediation-urls.ts`

2. **Issue-Typ** (`lib/types.ts`): Neues optionales Feld `helpUrl?: string | null`

3. **URL-Builder** (`lib/remediation-urls.ts`):
   - **axe**: `https://dequeuniversity.com/rules/axe/4.10/{ruleId}` (z. B. color-contrast)
   - **htmlcs**: `https://www.w3.org/WAI/WCAG21/quickref/`

### UI

- **Single-Scan** (`ScanIssueRow`): Link im eingeklappten Detail-Bereich (Selector/Context)
- **Domain-Aggregation** (`DomainAggregatedIssueList`): Link in der letzten Spalte jeder Zeile

### i18n

- `results.fixDocs`: "Fix-Anleitung"
- `results.fixDocsAria`: ARIA-Label für den Link

---

## Erweiterbarkeit (Phase 2)

- LLM-generierte Fix-Anleitungen pro Issue
- API-Endpoint z. B. `POST /api/scan/[id]/issue/[code]/remediation`
- Caching der generierten Texte
