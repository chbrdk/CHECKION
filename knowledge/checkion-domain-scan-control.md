# Deep Scan: Status, Pause, Abbruch

## API (URLs zentral)

- Steuerung: `apiScanDomainControl(id)` in [`lib/constants.ts`](../lib/constants.ts) → `POST /api/scan/domain/[id]/control` mit Body `{ "action": "pause" | "resume" | "cancel" }`.
- Status (Polling): `apiScanDomainStatus(id)` → `GET /api/scan/domain/[id]/status`.
- Laufende Scans **abbrechen** über Control-API (`cancel` → `cancelling` → Worker setzt `cancelled`). `DELETE /api/scans/domain/[id]` löscht nur die Zeile und ist für laufende Jobs ungeeignet (Zombie-Arbeit möglich).

## Statuswerte (`DomainScanStatus`)

| Status | Bedeutung |
|--------|-----------|
| `queued` | Anstehend |
| `scanning` | Läuft |
| `paused` | Nutzer hat pausiert; keine neuen Seiten aus der Queue, laufende `runScan` laufen zu Ende |
| `cancelling` | Abbruch angefordert; Queue verworfen, `inFlight` wird geleert |
| `cancelled` | Beendet ohne vollständige Persistenz der Einzelseiten (`scans`); Payload kann Teilgrafik/Aggregate aus bereits gescannten Seiten haben |
| `complete` / `error` | wie bisher |

## Technik

- Spider: [`lib/spider.ts`](../lib/spider.ts) – `getScanControl`, Pause-Wait vor Dequeue, Cancel drain, Fortschritt `progress.total = maxPages`.
- Worker: [`lib/domain-scan-start.ts`](../lib/domain-scan-start.ts) – `getScanControl` liest `getDomainScan`, mappt Status auf `run`/`pause`/`cancel`; Abbruch-Branch ohne `addScan` / `rebuildDomainIssuesFromPages`.
