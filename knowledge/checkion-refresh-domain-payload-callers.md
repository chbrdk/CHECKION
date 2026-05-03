# `refreshDomainPayloadFromScans` – Aufrufer und Kosten

`lib/domain-scan-classify.ts` lädt **alle** Zeilen `scans` mit `group_id = domain_scan_id` via `listScansByGroupIdOmitImageBlobs`, baut `buildStoredDomainPayload`, schreibt `domain_scans.payload`.

## Aufrufer

| Pfad | Wann |
|------|------|
| `POST /api/scan/domain/[id]/classify` | Nach Batch-Klassifikation |
| `lib/domain-scan-page-classification-job.ts` | Ende des Page-Topic-Jobs |
| `scripts/refresh-domain-payloads.ts` / `lib/domain-payload-refresh-batch.ts` | Admin/Batch-Rebuild |

## Optimierung (optional, später)

- **Trigger:** Nur refreshen, wenn sich klassifikationsrelevante Felder geändert haben.
- **Partielles Merge:** Nur `aggregated.pageClassification` / betroffene Teile patchen statt vollem Re-Aggregate — nur bei klaren Invarianten aus `lib/domain-summary.ts`.
- **Inkrementell:** Nur geänderte `scans`-Zeilen einlesen — hoher Aufwand.

Siehe auch [checkion-docker-refresh-domain-payloads.md](checkion-docker-refresh-domain-payloads.md).
