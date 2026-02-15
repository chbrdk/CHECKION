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

- **Nav/Sidebar**: Dashboard, New Scan, History, Developers, Settings
- **Auth**: Login- und Register-Seite (Titel, Labels, CTA, Fehler, Links)
- **Settings**: komplette Seite (Profil, Erscheinungsbild, Passwort, Sitzung, Standard-Konfiguration, Über CHECKION, Meldungen)
- **Dashboard** (`app/page.tsx`): Titel, Subtitle, Neuer Scan, Stats (Scans/Errors/Warnings/Notices), Scan-Historie & Deep-Scan-Historie (Titel, leere Zustände, CTAs)
- **Scan** (`app/scan/page.tsx`): Titel, Konfiguration, Tabs (Single/Deep), URL-Labels, Standard/Engines, Fehlermeldungen, PDF-Button
- **Scan Domain** (`app/scan/domain/page.tsx`): Formular (Titel, Subtitle, URL, Start), Fortschritt (Status, Live Log), Log-Texte
- **Developers** (`app/developers/page.tsx`): Titel, Subtitle, Micro-Tools/Scan Data, Endpoint-Beschreibungen, Example Usage
- **Results** (`app/results/[id]/page.tsx`): Fehler/Zurück, Scan-Ergebnis, SCORE, PDF exportieren/erstellen, Scan Verifiziert, Tabs (Alle, Errors, Warnings, Notices, Validiert)
- **Domain Result** (`app/domain/[id]/page.tsx`): Loading, Titel, Back/Share, Domain Score, Pages Scanned, Systemic Issues, Scanned Pages, alle Tab-Labels

## Noch offen (optional)

- **History**: Seite leitet aktuell auf `/` weiter; bei künftigem Inhalt gleiche Keys wie Dashboard/Scan nutzen.
- Weitere Einzelstrings in Results/Domain (z. B. View-Mode-Namen, Section-Titel in Unterkomponenten) bei Bedarf ergänzen.

## Zentral

- Locale-Cookie/Key: `LOCALE_STORAGE_KEY` in `lib/constants.ts` („checkion_locale“).
