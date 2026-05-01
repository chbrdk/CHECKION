# Deep Scan hängt in `cancelling`

## Bedeutung

- **`cancelling`**: Nutzer hat „Abbrechen“ gewählt; der Worker soll den Spider beenden und den Datensatz auf **`cancelled`** setzen.
- Wenn der **Hintergrundprozess** nicht zu Ende läuft (Deployment/Neustart, Serverless-Timeout, Crash), bleibt der Status in der DB auf `cancelling`.

## Lösung in der App (ab Fix)

1. **Erneut „Abbrechen“** (Button heißt im Zustand `cancelling` z. B. „Abbruch abschließen“ / „Mark scan as cancelled“):  
   `POST /api/scan/domain/[id]/control` mit `{ "action": "cancel" }` setzt bei bereits **`cancelling`** den Scan direkt auf **`cancelled`** (Finalize).

2. Projektseite: Cancel-Button wird auch bei **`cancelling`** angezeigt (vorher war er ausgeblendet).

## Manuell (DB)

Nur falls API nicht erreichbar: in `domain_scans` für die betroffene `id` Status und Payload-Feld `status` konsistent auf `cancelled` setzen (über Team/Migration; Payload merge wie `updateDomainScan`).
