# Globale Domain-Scan-Liste (alle Nutzer)

## Berechtigung

- **`CHECKION_ADMIN_API_KEY`**: `Authorization: Bearer …` auf betroffenen APIs (u. a. `GET /api/scans/domain?scope=allUsers`).
- **`CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS`**: Komma-getrennte User-IDs, die in der **Session** die Systemliste in der UI nutzen dürfen (`domainScansListAllUsers` via `GET /api/auth/capabilities`).

## UI

Auf `/deep-scans` erscheint die Auswahl **Liste → Alle Nutzer (System)** nur, wenn `domainScansListAllUsers` true ist. Standard bleibt **Nur meine Scans**.

## Technik

- `scope=allUsers` nutzt `listDomainScanSummariesAllUsers` (nicht den User-spezifischen List-Cache).
- Detailrouten unter `/api/scan/domain/[id]/…` lesen mit `getDomainScanAccess` die **Owner-`user_id`** der Zeile; Mutations (z. B. Summarize speichern) nur für den Owner (`canMutateDomainScanAsOwner`).
