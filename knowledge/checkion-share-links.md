# CHECKION – Share-Links (öffentliche Landingpage)

Scan-Ergebnisse (Seiten-Scan, Deep Scan) und **UX Journeys** können per Link geteilt werden. Der Link verweist auf eine **öffentlich erreichbare Landingpage** ohne Login. Optional kann ein **Passwortschutz** gesetzt werden.

- **DB:** Tabelle `share_links` (token PK, user_id, resource_type 'single'|'domain'|'journey', resource_id, password_hash, created_at, expires_at). Schema in `lib/db/schema.ts`, CRUD in `lib/db/shares.ts`. Migration: `npm run db:push`.
- **Konstanten:** `SHARE_PATH = '/share'` in `lib/constants.ts`. Voll-URL = Origin + SHARE_PATH + '/' + token.
- **API:**
  - **POST /api/share** (Auth): Body `{ type, id, password?: string }`. Wenn bereits ein Share für diese Ressource existiert, wird dieser zurückgegeben (alreadyShared: true). Sonst wird ein neuer Share erstellt. Optionales Passwort wird gehasht (bcrypt) gespeichert.
  - **GET /api/share/by-resource?type=&id=** (Auth): Gibt bestehenden Share für die Ressource zurück (token, url, hasPassword, createdAt) oder 404.
  - **GET /api/share/[token]** (öffentlich): Gibt `{ type, data }` zurück. Wenn der Share passwortgeschützt ist, muss `Authorization: Bearer <accessToken>` gesendet werden (accessToken von POST /api/share/[token]/access).
  - **POST /api/share/[token]/access** (öffentlich): Body `{ password?: string }`. Bei passwortgeschütztem Share wird das Passwort geprüft; bei korrekt (oder Share ohne Passwort) wird `{ accessToken }` zurückgegeben (JWT-ähnlich, 24h gültig). Mit diesem Token kann GET /api/share/[token] und Video/Pages aufgerufen werden (Header oder Query `?access=` für img/video).
  - **GET /api/share/[token]/video** (öffentlich): Wie GET [token]; bei Passwort muss Bearer oder ?access= mitgesendet werden.
  - **DELETE /api/share/[token]** (Auth): Teilung aufheben (nur eigener Share). Cache-Tag `share-${token}` wird invalidiert.
  - **PATCH /api/share/[token]** (Auth): Body `{ password: string | null }`. Passwort setzen oder entfernen.
- **Landingpage:** **/share/[token]** – lädt GET /api/share/[token]. Bei 403 und requiresPassword: Passwortformular anzeigen; nach POST /access Token in sessionStorage, dann GET mit Bearer und Anzeige der Daten. Video/Screenshot-URLs werden mit `?access=` versehen, damit der Browser sie laden kann.
- **i18n:** Alle sichtbaren Texte auf Share-Landingpage und SharePanel nutzen `useI18n()` und `t('share.*')`. Locale-Keys in `locales/de.json` und `locales/en.json` unter `share` (inkl. Fehlermeldungen, Passwortformular, Deep Scan/Einzel/Journey-Titel, Pagination, Schritte, Aufzeichnung usw.).
- **UI (SharePanel):** Auf Results-, Domain- und Journey-Seite: Wenn bereits geteilt → Anzeige „Bereits geteilt“, Link (gekürzt), [Link kopieren], [Passwort setzen/entfernen], [Teilung aufheben]. Wenn nicht geteilt → [Teilen]; Dialog mit optionalem Passwort, dann Erstellen und Link kopieren.
- **Middleware:** /share und /api/share sind nicht in protectedPaths, daher öffentlich abrufbar.
- **Ablauf:** Optional `expiresAt` bei createShare; GET prüft Ablauf und liefert 404 bei abgelaufenem Token. Access-Token für passwortgeschützte Shares: lib/share-access.ts (HMAC mit AUTH_SECRET, 24h).
