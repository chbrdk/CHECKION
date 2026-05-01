# Domain-Scan-Tags aus Projekt (Docker / Coolify)

## Was passiert?

`scripts/sync-domain-scan-tags-from-projects.ts` führt dieselbe Logik wie **`POST /api/admin/domain-scans/sync-project-tags`** aus: **`domain_scans.tags`** werden aus **`projects.tags`** für alle Scans mit `project_id` abgeglichen (Modus `replaceFromProject` oder `fillEmpty`). Anschließend werden die Domain-Listen-Caches pro betroffenem Nutzer invalidiert.

**Kein** LLM, **kein** Crawl — nur SQL + Cache.

## Trigger beim Container-Start

Im Runner-Image ist das Script vorhanden. Der Entrypoint kann es optional vor `npm run start` ausführen:

| Env | Bedeutung |
|-----|-----------|
| `CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START=1` | Sync ausführen (wie manuell `npx tsx …`) |
| `CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START=0` / leer | überspringen (Default) |

**Modus** (optional):

| Env | Bedeutung |
|-----|-----------|
| `CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE=replaceFromProject` | Default: Projekt-Tags auf alle zugeordneten Scans kopieren (überschreibt Scan-Tags) |
| `CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE=fillEmpty` | Nur Scans ohne Tags befüllen, wenn das Projekt Tags hat |

**Empfehlung:** Variable **einmalig** nach Deploy setzen, danach entfernen oder `0`, damit jeder Neustart nicht erneut alle Zeilen updated.

## Manuell im Container

```sh
docker exec -it <container> npx tsx scripts/sync-domain-scan-tags-from-projects.ts
docker exec -it <container> npx tsx scripts/sync-domain-scan-tags-from-projects.ts --mode=fillEmpty
```

Voraussetzung: `DATABASE_URL` wie für die App.

## Admin-HTTP-Alternative

Siehe `knowledge/checkion-project-classification.md` (`CHECKION_ADMIN_API_KEY`, `API_ADMIN_DOMAIN_SCANS_SYNC_PROJECT_TAGS`).
