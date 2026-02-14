# CHECKION – Einstellungen & Brand-Farbe

## Settings-Page

- **Route:** `/settings`
- **Karten:** Alle Cards (Profil, Erscheinungsbild, Passwort, Sitzung, Standard Konfiguration, Über CHECKION) nutzen **hellen Hintergrund**: `bgcolor: 'var(--color-card-bg)'`, `color: 'var(--color-text-on-light)'`.

## Brand-Farbe (wie AUDION)

- **Speicherung:** `localStorage` unter dem Key `checkion-sidebar-color` (siehe `lib/brand-color-utils.ts`: `BRAND_COLOR_STORAGE_KEY`).
- **Wert:** CSS-Variablenname, z. B. `--color-secondary-dx-green`, `--color-secondary-dx-purple`.
- **Anwendung:** `applyBrandColorVars(varName, themeMode)` setzt am `document.documentElement` u. a.:
  - `--color-theme-accent`
  - `--color-theme-accent-contrast` (Text auf Sidebar/Akzent)
  - `--audion-sidebar-text-color`, `--audion-sidebar-hover-bg`, `--audion-sidebar-active-bg`
  - `--color-input-label` (für Formulare)

## Wo die Farbe sichtbar wird

- **BrandColorInitializer** (in `AppShell`) ruft beim Mount `initBrandColorFromStorage('dark')` auf und wendet die gespeicherte Farbe an.
- **Sidebar:** `MsqdxAdminNav` bekommt kein festes `brandColor`, sondern `sx` mit `THEME_ACCENT_WITH_FALLBACK` aus `lib/theme-accent.ts` (Hintergrund, Rahmen, Text über `--color-theme-accent-contrast`).
- **App-Layout:** `MsqdxAppLayout` bekommt kein `brandColor`; per `sx` werden der äußere Bereich und die Logo-Ecke mit `THEME_ACCENT_WITH_FALLBACK` eingefärbt.
- **BrandColorSelector** (auf der Settings-Page unter „Erscheinungsbild“): Bei Klick auf eine Farbe wird `localStorage.setItem(BRAND_COLOR_STORAGE_KEY, varName)` ausgeführt und `applyBrandColorVars(varName, themeMode)` aufgerufen – Nav und Layout färben sich sofort um.

## Referenzen

- `app/settings/page.tsx`
- `components/settings/BrandColorSelector.tsx`, `components/settings/BrandColorInitializer.tsx`
- `lib/brand-color-utils.ts`
- `lib/theme-accent.ts` (THEME_ACCENT_WITH_FALLBACK)
- `components/Sidebar.tsx`, `components/AppShell.tsx`
