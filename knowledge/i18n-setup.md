# CHECKION i18n – Deutsch / Englisch

## Übersicht

CHECKION nutzt ein eigenes i18n-System (wie AUDION): JSON-Übersetzungsdateien, Platzhalter `{key}` für dynamische Werte, Cookie + localStorage für Sprachwahl.

## Struktur

| Ort | Inhalt |
|-----|--------|
| `locales/de.json`, `locales/en.json` | Übersetzungsdateien (Namespaces: common, nav, auth, settings, …) |
| `lib/i18n/index.ts` | `createTranslator`, `normalizeLocale`, `resolveLocale`, Typ `Locale` |
| `lib/i18n/server.ts` | `getServerLocale()`, `getServerT()` (für Server Components) |
| `components/i18n/I18nProvider.tsx` | `I18nProvider`, `useI18n()` (Client) |
| `lib/constants.ts` | `LOCALE_STORAGE_KEY` = Cookie- und localStorage-Key (`checkion_locale`) |

## Verwendung

### Client Components

```tsx
import { useI18n } from '@/components/i18n/I18nProvider';

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  return <span>{t('nav.settings')}</span>;
}
```

### Server Components

```tsx
import { getServerT } from '@/lib/i18n/server';

export default async function Page() {
  const t = await getServerT();
  return <h1>{t('settings.title')}</h1>;
}
```

### Interpolation

```ts
t('settings.messages.profileUpdated')
t('some.key', { name: 'Value' })  // Key: "Hello {name}" → "Hello Value"
```

## Sprachumschaltung

- **Einstellungen**: Unter „Profil“ kann der User **Sprache** (Deutsch / English) wählen. Beim Speichern wird `setUiLocale(locale)` aufgerufen, die UI wechselt sofort.
- **Persistenz**: Cookie `checkion_locale` + `localStorage` (gleicher Key). Beim nächsten Besuch wird die gespeicherte Sprache ausgelesen.
- **Layout**: Root-Layout ist async, liest `getServerLocale()` (Cookie / Accept-Language) und setzt `<html lang={locale}>` sowie `I18nProvider initialLocale={locale}`.

## Unterstützte Sprachen

- `de` (Standard)
- `en`

## Bereits auf t() umgestellt

- **Nav/Sidebar**: Dashboard, New Scan, History, Settings, Einstellungen
- **Auth**: Login- und Register-Seite (Titel, Labels, CTA, Fehler, Links)
- **Settings**: komplette Seite (Profil, Erscheinungsbild, Passwort, Sitzung, Standard-Konfiguration, Über CHECKION, Meldungen)

## Noch offen (optional)

- Scan-Seite, History, Results, Developers, Domain-Seiten: weitere Strings schrittweise auf `t('...')` umstellen und Keys in `locales/de.json` / `locales/en.json` ergänzen.

## Zentral

- Locale-Cookie/Key: `LOCALE_STORAGE_KEY` in `lib/constants.ts` („checkion_locale“).
