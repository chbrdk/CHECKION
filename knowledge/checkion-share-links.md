# CHECKION – Share-Links (öffentliche Landingpage)

Scan-Ergebnisse (Seiten-Scan oder Deep Scan) können per Link geteilt werden. Der Link verweist auf eine **öffentlich erreichbare Landingpage** ohne Login.

- **DB:** Tabelle `share_links` (token PK, user_id, resource_type 'single'|'domain', resource_id, created_at, expires_at). Schema in `lib/db/schema.ts`, CRUD in `lib/db/shares.ts`. Migration: `npm run db:push` (bzw. beim Deploy über Coolify).
- **Konstanten:** `SHARE_PATH = '/share'` in `lib/constants.ts`. Voll-URL = Origin + SHARE_PATH + '/' + token.
- **API:**
  - **POST /api/share** (Auth nötig): Body `{ type: 'single'|'domain', id: string }`. Erstellt Share-Eintrag, gibt `{ token, url }` zurück.
  - **GET /api/share/[token]** (öffentlich, ohne Auth): Gibt `{ type, data }` zurück (data = ScanResult bei single, DomainSummaryResponse bei domain). 404 wenn Token ungültig oder abgelaufen.
- **Landingpage:** **/share/[token]** – lädt GET /api/share/[token], rendert read-only:
  - **Domain:** Domain-Score, Aggregierte Issues (Errors/Warnings/Notices), systemische Issues, Liste der gescannten Seiten (URL + Score + Issue-Anzahl).
  - **Single:** URL, Datum, Device, Score, Issue-Counts, UX-Score, Liste der ersten 50 Issues.
- **UI:** Share-Button auf der Domain-Ergebnisseite und auf der Einzelseiten-Ergebnisseite. Klick → POST /api/share → Link in Zwischenablage kopieren, kurze Meldung „Link kopiert“.
- **Middleware:** /share und /api/share sind nicht in protectedPaths, daher öffentlich abrufbar.
- **Ablauf:** Optional `expiresAt` bei createShare (z. B. expiresInDays); GET prüft Ablauf und liefert 404 bei abgelaufenem Token.

Erweiterungen (optional): Ablaufdatum beim Erzeugen setzen, Liste „Meine geteilten Links“ in den Einstellungen, Link widerrufen (DELETE /api/share/[token]).
