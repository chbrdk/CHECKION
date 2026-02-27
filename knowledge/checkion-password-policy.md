# CHECKION – Passwort-Richtlinie

**Stand:** Feb 2025 (Schritt 7 aus `checkion-improvement-opportunities.md`)

---

## Anforderungen

Passwörter müssen folgende Kriterien erfüllen:

| Kriterium | Anforderung |
|-----------|-------------|
| Mindestlänge | 8 Zeichen |
| Großbuchstabe | mindestens 1 |
| Kleinbuchstabe | mindestens 1 |
| Ziffer | mindestens 1 |

---

## Implementierung

- **Schema:** `lib/api-schemas.ts` – `passwordSchema` (Zod)
- **Verwendung:** `registerBodySchema`, `changePasswordBodySchema`
- **API:** `POST /api/auth/register`, `POST /api/auth/change-password`
- **UI:** Register- und Einstellungen-Seite zeigen Anforderungen als Helper-Text

---

## i18n-Keys

- `auth.register.passwordRequirements` – Hinweis bei Registrierung
- `settings.password.newRequirements` – Hinweis bei Passwort-Änderung

---

## Fehlermeldungen (API)

Die Validierung liefert spezifische Fehlermeldungen:
- "Password must be at least 8 characters"
- "Password must contain at least one uppercase letter"
- "Password must contain at least one lowercase letter"
- "Password must contain at least one digit"
