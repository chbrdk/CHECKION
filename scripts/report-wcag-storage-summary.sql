-- Example read-only queries for operators (run in psql / admin).
-- Replace :user_id or use session vars as appropriate.
-- See knowledge/checkion-wcag-issues-reporting-queries.md for semantics.

-- Single-scan issue row counts by user
SELECT s.user_id, COUNT(*)::bigint AS scan_issue_rows
FROM scan_issues si
JOIN scans s ON s.id = si.scan_id
GROUP BY s.user_id
ORDER BY scan_issue_rows DESC
LIMIT 20;

-- Domain issue group counts by domain scan
SELECT domain_scan_id, COUNT(*)::int AS group_count
FROM domain_issue_groups
GROUP BY domain_scan_id
ORDER BY group_count DESC
LIMIT 20;
