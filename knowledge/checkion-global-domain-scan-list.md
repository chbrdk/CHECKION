# Globale Domain-Scan-Liste (alle Nutzer)

## Berechtigung

- **`CHECKION_ADMIN_API_KEY`**: `Authorization: Bearer …` auf betroffenen APIs (u. a. `GET /api/scans/domain?scope=allUsers`).
- **`CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED`**: auf `1` / `true` / `yes` setzen → **jeder eingeloggte Nutzer** sieht die Systemliste und kann fremde Domain-Scans lesen (nur für vertrauenswürdige / interne Instanzen).
- **`CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS`**: Komma-getrennte User-IDs für **einzelne** Operator-Konten, wenn ihr nicht alle User öffnen wollt.

## UI

Auf `/deep-scans` erscheint die Auswahl **Liste → Alle Nutzer (System)** nur, wenn `domainScansListAllUsers` true ist. Standard bleibt **Nur meine Scans**.

## Technik

- `scope=allUsers` nutzt `listDomainScanSummariesAllUsers` (nicht den User-spezifischen List-Cache).
- Detailrouten unter `/api/scan/domain/[id]/…` lesen mit `getDomainScanAccess` die **Owner-`user_id`** der Zeile; Mutations (z. B. Summarize speichern) nur für den Owner (`canMutateDomainScanAsOwner`).
