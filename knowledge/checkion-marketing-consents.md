# Marketing-Einwilligungen (`user_marketing_consents`)

Audit-Log für verpflichtendes E-Mail-Marketing-Opt-in (z. B. AMC-Registrierung unter `CHECKION-AMC`).

## Schema

- Tabelle: `user_marketing_consents`
- Migration: `lib/db/migrations/0022_user_marketing_consents.sql`
- Drizzle: `userMarketingConsents` in `lib/db/schema.ts`
- Helper: `recordMarketingConsent()` in `lib/marketing-consent.ts`

## Anlegen / aktualisieren

Auf der **Haupt-CHECKION**-Instanz (nicht AMC): beim Deploy oder Container-Start läuft `drizzle-kit push` und legt die Tabelle an.

Manuell (falls nötig):

```bash
# Im CHECKION-Projekt, mit Production-DB-URL:
npx drizzle-kit push
# oder:
psql "$DATABASE_URL" -f lib/db/migrations/0022_user_marketing_consents.sql
```

**AMC** (`CHECKION-AMC`) nutzt dieselbe DB, startet aber **kein** Schema-Push — Migration immer über Haupt-CHECKION.
