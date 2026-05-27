# CHECKION – Scanner & Bot-/Platzhalterseiten

## Problem (Beispiel exyte.net)

Ohne realistischen Browser-Kontext liefert Puppeteer mit Default-`HeadlessChrome`-Fingerprint oft eine **Wartungs-/Platzhalterseite** statt der echten Website:

- Titel: `Maintenance`
- Body: `This Site Is Under Maintenance`
- WCAG: 0 Fehler → Score 100 (irreführend)
- Screenshot zeigt „Under construction“ / Maintenance

Mit **realistischem User-Agent**, `Accept-Language`, `--disable-blink-features=AutomationControlled` und `navigator.webdriver`-Maskierung lädt dieselbe URL die echte Marketing-Site (~20k Zeichen Body, hunderte Links).

## Implementierung

| Modul | Pfad | Rolle |
|-------|------|--------|
| Browser-Kontext | `lib/browser-scan-context.ts` | UA pro Device, Stealth-Launch-Args, `applyScanBrowserContext()` |
| Qualitätsprüfung | `lib/scan-page-quality.ts` | Erkennung Platzhalter / dünnem Inhalt nach Navigation |
| Scanner | `lib/scanner.ts` | Wendet Kontext vor `goto` an; speichert Warnungen in `technicalInsights.scanPageQuality` |
| Aggregation | `lib/domain-aggregation.ts` | `technicalCounts.pagesWithScanQualityWarning` |
| UI | `components/TechnicalInsightsCard.tsx` | Warnung „Scan-Qualität“ |

## Tests

`__tests__/lib/scan-page-quality.test.ts` – Maintenance-Text vs. normale Seite.

## Re-Scan

Bestehende Deep-Scans (z. B. exyte.net) müssen **neu gestartet** werden, damit Daten und Screenshots mit dem neuen Browser-Kontext entstehen.
