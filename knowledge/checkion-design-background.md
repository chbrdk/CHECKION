# CHECKION – Hintergrund & globale Styles (Referenz: AUDION)

CHECKION nutzt dasselbe Erscheinungsbild wie AUDION: dunkler Slate-Hintergrund, MSQDX-Tokens, DX-Palette.

## Zentrale Variable
- **App-Hintergrund:** `--checkion-app-bg: #0f172a` (in `styles/globals.css`)
- ThemeProvider (MUI) und AppShell (MsqdxAppLayout) setzen Hintergrund auf denselben Wert (#0f172a), da MUI keine CSS-Variablen in der Palette verarbeiten darf (alpha() etc.).

## Wo definiert
- **Tokens & Farben:** `styles/globals.css` (:root mit --msqdx-spacing-*, --msqdx-radius-*, DX-Palette, --color-text-primary/secondary, --color-theme-accent)
- **html/body:** `styles/globals.css` (background: var(--checkion-app-bg), color: var(--color-text-primary))
- **MUI Theme:** `components/ThemeProvider.tsx` (palette.background.default und CssBaseline body: #0f172a)
- **Layout:** `components/AppShell.tsx` (innerBackground: "grid" – dezentes Linienraster wie AUDION, 20px/1px; äußerer Bereich brandColor green)

## Form & UI auf hellem Grund
- **Scope:** Alle Inhalte liegen in einem Wrapper mit `data-checkion-content` (in `AppShell.tsx`). In `styles/globals.css` gibt es Overrides für alle MUI-/MSQDX-Form- und UI-Elemente **innerhalb** dieses Scopes:
- **Inputs:** `.MuiOutlinedInput-root` – heller Hintergrund (`--color-card-bg`), dunkle Schrift (`--color-text-on-light`), Rahmen `--color-secondary-dx-grey-light-tint`, Focus `--color-theme-accent`.
- **Tabs:** `.MuiTab-root` – Text dunkel, Selected-Text dunkel, Indicator `--color-theme-accent`.
- **Select:** gleiche Token wie Inputs.
- **Checkbox, FormLabel, FormControlLabel:** dunkle Schrift / Muted.
- **Accordion, List, Chip, Divider, LinearProgress, CircularProgress:** Karten-Hintergrund bzw. Token-Farben.
- **Dropdowns:** `.MuiMenu-paper`, `.MuiPopover-paper`, `.MuiMenuItem-root` – heller Hintergrund, dunkle Schrift.

## Design-Regeln
- Vollständige Token- und Farbregeln: AUDION `knowledge/audion-dashboard-design-rules.md` bzw. `.cursor/rules/audion-dashboard-design.mdc`.
- Abstände/Radien/Farben nur über Tokens und CSS-Variablen, keine hardcodierten px/hex in Komponenten.
