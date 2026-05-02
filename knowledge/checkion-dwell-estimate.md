# Verweildauer-Schätzung (`dwell_v1`)

## Was es ist / was nicht

- **Kein** Analytics-Wert (kein GA, kein Plausible). Nur **Heuristik** aus einem Crawl.
- Implementierung: `lib/estimate-dwell-time.ts`, Felder in `UxResult.dwellEstimate`, Domain-Mittel in `aggregateUx().dwellTime`.

## Modell (Kurz)

1. **Lesedauer:** Wortzahl ÷ effektive WPM; WPM sinkt mit steigendem FK-Klassen-Level (`effectiveWpm`).
2. **Seiten-Typ:** `thin` | `content` | `interactive` | `mixed` — bei sehr wenig Text stärkeres Abkürzen (Skim/Landing).
3. **Zuschläge:** Scroll-Höhe vs. Viewport, Formularfelder, Video/Audio-Anzahl, leicht: interne Links (Exploration).
4. **Abzüge:** defekte Links (Reibung).
5. **Bandbreite:** `secondsMin` / `secondsMax` um den Median (Unsicherheit).

## DOM-Signale (`dwellSignals` im Scanner)

- `formFieldCount`, `videoCount`, `audioCount`, `scrollHeightOverVh` (aus `page.evaluate`).

## Domain-Aggregation

- Mittelwert der **Median**-Schätzungen pro Seite, plus min/max über Seiten.

## UI

- Einzelseite: `components/UxCard.tsx` (neben Lesbarkeit), Locale über `next-intl` (`results.*`).
- Domain: `components/domain/DomainResultUxAuditSection.tsx` (`domainResult.uxAuditDwell*`).
- Dauer-Strings: `lib/format-dwell-duration.ts`.
