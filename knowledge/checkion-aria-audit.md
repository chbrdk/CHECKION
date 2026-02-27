# CHECKION – ARIA-Audit

**Stand:** Feb 2025 (Schritt 8 aus `checkion-improvement-opportunities.md`)

---

## Umgesetzte Anpassungen

### HistoryList (`components/HistoryList.tsx`)

- **SingleScanRow / DomainScanRow** (klickbare `Box component="li"`):
  - `role="button"`
  - `tabIndex={0}`
  - `aria-label` via i18n (`dashboard.openScanAria`, `dashboard.openDomainScanAria`)
  - `onKeyDown` für Enter/Space
- **Delete-Buttons**:
  - `aria-label` über i18n (`dashboard.deleteScanAria`, `dashboard.deleteDomainScanAria`) statt hardcodiertem Deutsch

### SearchResultsList (`components/SearchResultsList.tsx`)

- Klickbare Listeneinträge:
  - `role="button"`
  - `tabIndex={0}`
  - `aria-label` via `dashboard.openSearchResultAria`
  - `onKeyDown` für Enter/Space

### BrandColorSelector (`components/settings/BrandColorSelector.tsx`)

- Farb-Buttons: `aria-label` über `settings.appearance.colorSelectAria` mit `{label}` (z. B. "Farbe Lila wählen")

### DomainAggregatedIssueList (`components/DomainAggregatedIssueList.tsx`)

- „Öffnen“-Button: `aria-label` über `domainResult.openPageAria` mit `{url}`
- Sichtbarer Text: `domainResult.openPage` (i18n)

---

## Neue i18n-Keys

| Key | Beschreibung |
|-----|--------------|
| `dashboard.deleteScanAria` | "Scan löschen" / "Delete scan" |
| `dashboard.deleteDomainScanAria` | "Deep Scan löschen" / "Delete deep scan" |
| `dashboard.openScanAria` | "Scan öffnen: {url}" |
| `dashboard.openDomainScanAria` | "Domain Scan öffnen: {domain}" |
| `dashboard.openSearchResultAria` | "Suchergebnis öffnen" |
| `settings.appearance.colorSelectAria` | "Farbe {label} wählen" |
| `domainResult.openPage` | "Öffnen" / "Open" |
| `domainResult.openPageAria` | "Seite öffnen: {url}" |

---

## Weitere Prüfpunkte (bei Bedarf)

- PaginationBar (Prev/Next) – sichtbarer Text vorhanden
- Andere icon-only oder dekorative Buttons auf weitere fehlende Labels prüfen
