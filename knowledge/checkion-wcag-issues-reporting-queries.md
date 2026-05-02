# WCAG-Issues: Reporting-Queries (Beispiele)

**Hinweis:** `scan_issues` und `domain_page_issues` haben **unterschiedliche Körnung** — Zeilen nicht blind addieren. Single-Scan-Zeilen gehören zu `scans`; Domain-Zeilen zu `domain_scans` und URLs innerhalb eines Crawls.

## Single-Scan: Issues pro User (Beispiel)

```sql
-- Anzahl Issue-Zeilen pro Benutzer (Standalone scans)
SELECT s.user_id, COUNT(*) AS issue_rows
FROM scan_issues si
JOIN scans s ON s.id = si.scan_id
GROUP BY s.user_id
ORDER BY issue_rows DESC;
```

## Single-Scan: Häufige Codes

```sql
SELECT code, type, COUNT(*) AS cnt
FROM scan_issues
GROUP BY code, type
ORDER BY cnt DESC
LIMIT 50;
```

## Domain-Scan: Gruppen (bereits aggregiert)

```sql
SELECT domain_scan_id, group_key, page_count, type, code
FROM domain_issue_groups
WHERE user_id = $1
ORDER BY page_count DESC
LIMIT 100;
```

## Keine sinnvolle „UNION ALL“ ohne Kontext

Eine Zeile in `scan_issues` ist **ein Fund auf einer Single-Scan-URL**; eine Zeile in `domain_page_issues` ist **ein Fund auf einer URL innerhalb eines Domain-Scans** (dieselbe URL kann als `scans`-Zeile auch in `scan_issues` existieren). Für globale KPIs getrennt auswerten oder über **`scans.group_id`** Domain-Scopes joinen.

## Optional: Domain-Seiten mit Single-Scan-Kopplung

```sql
SELECT dp.domain_scan_id, dp.url, dp.page_scan_id, COUNT(si.id) AS scan_issue_rows
FROM domain_pages dp
LEFT JOIN scan_issues si ON si.scan_id = dp.page_scan_id
WHERE dp.user_id = $1
GROUP BY dp.domain_scan_id, dp.url, dp.page_scan_id
HAVING COUNT(si.id) > 0
LIMIT 50;
```

Siehe auch: [checkion-wcag-issues-storage-overview.md](checkion-wcag-issues-storage-overview.md).
