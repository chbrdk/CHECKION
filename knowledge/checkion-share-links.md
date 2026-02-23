# CHECKION – Share-Links (öffentliche Landingpage)

Scan-Ergebnisse (Seiten-Scan, Deep Scan) und **UX Journeys** können per Link geteilt werden. Der Link verweist auf eine **öffentlich erreichbare Landingpage** ohne Login.

- **DB:** Tabelle `share_links` (token PK, user_id, resource_type 'single'|'domain'|'journey', resource_id, created_at, expires_at). Schema in `lib/db/schema.ts`, CRUD in `lib/db/shares.ts`. Migration: `npm run db:push` (bzw. beim Deploy über Coolify).
- **Konstanten:** `SHARE_PATH = '/share'` in `lib/constants.ts`. Voll-URL = Origin + SHARE_PATH + '/' + token.
- **API:**
  - **POST /api/share** (Auth nötig): Body `{ type: 'single'|'domain'|'journey', id: string }`. Erstellt Share-Eintrag, gibt `{ token, url }` zurück. Bei `type: 'journey'` muss die Journey abgeschlossen sein (status complete).
  - **GET /api/share/[token]** (öffentlich, ohne Auth): Gibt `{ type, data }` zurück (data = ScanResult bei single, DomainSummaryResponse bei domain, Journey-Result inkl. videoUrl bei journey). 404 wenn Token ungültig oder abgelaufen.
  - **GET /api/share/[token]/video** (öffentlich): Streamt das Journey-Video nur bei gültigem journey-Share-Token (Proxy zum UX Journey Agent).
- **Landingpage:** **/share/[token]** – lädt GET /api/share/[token], rendert read-only:
  - **Domain (Deep Scan):** Domain-Score, Aggregierte Issues (Errors/Warnings/Notices), systemische Issues, Liste der gescannten Seiten (URL + Score + Issue-Anzahl).
  - **Single (Seiten-Scan):** URL, Datum, Device, Score, Issue-Counts, UX-Score, Liste der ersten 50 Issues.
  - **Journey (UX Journey):** Aufgabe, Site, Erfolgsstatus, Aufzeichnung (Video), Schritte.
- **UI:** Share-Button auf der Domain-Ergebnisseite, auf der Einzelseiten-Ergebnisseite (/results/[id]) und auf der UX-Journey-Ergebnisseite (/journey-agent/[jobId]) wenn die Journey abgeschlossen ist. Klick → POST /api/share → Link in Zwischenablage kopieren, kurze Meldung „Link kopiert“.
- **Middleware:** /share und /api/share sind nicht in protectedPaths, daher öffentlich abrufbar.
- **Ablauf:** Optional `expiresAt` bei createShare (z. B. expiresInDays); GET prüft Ablauf und liefert 404 bei abgelaufenem Token.

Erweiterungen (optional): Ablaufdatum beim Erzeugen setzen, Liste „Meine geteilten Links“ in den Einstellungen, Link widerrufen (DELETE /api/share/[token]).
