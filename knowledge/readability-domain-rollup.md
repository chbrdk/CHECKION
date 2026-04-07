# Domain UX: Lesbarkeits-Rollup

- **Quelle:** `aggregateUx` in `lib/domain-aggregation.ts`; pro Seite kommt `UxResult.readability` aus `lib/scanner.ts` (Flesch–Kincaid **Grade Level**, US-Schulstufen).
- **Mittelwert:** Nur über Seiten mit `readability.score`; **`score`** in der Aggregation = Mittel davon (eine Nachkommastelle); **`grade`** = Bucket-Label passend zum Mittel (gleiche Schwellen wie im Scanner: ≤6, ≤10, ≤14).
- **Verteilung:** `bandCounts` zählt Seiten pro Bucket (`easy` / `standard` / `complex` / `veryComplex`).
- **„Hardest“:** Höchste Grade-Level zuerst, max. 8 URLs; in Light/Stored-Payloads wird `hardestPages` in `capAggregatedForSize` wie andere UX-URL-Listen gekappt (`uxList`).
