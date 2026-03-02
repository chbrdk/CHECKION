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

## Buttons (Theming)

- **Alle Primary-Buttons** (contained/outlined) in der App nutzen die **gesetzte Brand-Farbe** (`--color-theme-accent`), wie die Navigation.
- **ThemeProvider** (`components/ThemeProvider.tsx`): `palette.primary.main` und MUI-Overrides für `MuiButton` (containedPrimary, outlinedPrimary) setzen Hintergrund/Rahmen auf `var(--color-theme-accent)` und Text auf `var(--color-theme-accent-contrast)`.
- **globals.css**: Zusätzliche Regeln unter `[data-checkion-content]` für `.MuiButton-contained` und `.MuiButton-outlined` (ohne Error/Warning) erzwingen die Theme-Akzent-Farbe mit `!important`, damit auch Design-System-Buttons (z. B. MsqdxButton) die gewählte Farbe übernehmen.
- Buttons mit semantischen Farben (z. B. `color="error"`, `color="warning"`) bleiben unverändert.

## Labels & Formular-Elemente (Theming)

- **Alle Input-/Form-Labels**, Tab-Labels, Checkbox- und FormControlLabel-Texte nutzen die **gesetzte Brand-Farbe** über `--color-input-label` (wird von `applyBrandColorVars()` gesetzt; bei hellen Akzentfarben z. B. Gelb/Grau wird Schwarz verwendet).
- **ThemeProvider**: MUI-Overrides für `MuiInputLabel`, `MuiFormLabel`, `MuiFormControlLabel`, `MuiCheckbox`, `MuiTab` setzen die Label-/Icon-Farbe auf `var(--color-input-label, var(--color-theme-accent))` bzw. bei Fokus/Selected auf `--color-theme-accent`.
- **globals.css**: Unter `[data-checkion-content]` verwenden `.MuiFormLabel-root`, `.MuiInputLabel-root`, `.MuiFormControlLabel-label`, `.MuiCheckbox-root`, `.MuiTab-root` dieselbe Variable, damit alle Form-Labels und Tabs die gewählte Brand-Farbe übernehmen.

## Referenzen

- `app/settings/page.tsx`
- `components/settings/BrandColorSelector.tsx`, `components/settings/BrandColorInitializer.tsx`
- `lib/brand-color-utils.ts`
- `lib/theme-accent.ts` (THEME_ACCENT_WITH_FALLBACK)
- `components/Sidebar.tsx`, `components/AppShell.tsx`
- `components/ThemeProvider.tsx` (primary palette + MuiButton styleOverrides)
- `styles/globals.css` (Button-Overrides unter [data-checkion-content])
