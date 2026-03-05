# CHECKION – Vorbeugende Fixes & bekannte Fallstricke

Kurze Übersicht über bereits behobene und zu beachtende Punkte, damit Build und Typen stabil bleiben.

## Bereits behoben

### MSQDX Design System (React)

- **Styled-Komponenten (MUI `styled()`):** Alle Styled-Komponenten in `@msqdx/react` haben eine Typ-Assertion `as React.ComponentType<any>`, damit sie unter React 18/19 und strengen TS-Checks zuverlässig als JSX-Komponenten gelten (Fehler „cannot be used as a JSX component“ / `ReactNode | Promise<ReactNode>`). Betroffen u. a.: MsqdxButton, MsqdxIconButton, MsqdxAvatar, MsqdxBadge, MsqdxLogo, MsqdxLogoMark, MsqdxUserBadge, MsqdxTabs, MsqdxTooltip, MsqdxToolbar, MsqdxStepper, MsqdxSwitchField, MsqdxTextareaField, MsqdxAccordion, MsqdxSnackbar, MsqdxSlider, MsqdxSelect, MsqdxFormField, MsqdxDialog, MsqdxGlassCard, MsqdxCheckboxField, MsqdxTypography, MsqdxRadioField, MsqdxPopover, MsqdxCircleContextMenu, MsqdxScrollbar, Prismion-Komponenten (Ports, ConnectorMenu, Toolbar, Result).
- **Implizites `any`:** In Tabs, ConnectorMenu, PrismionPorts, PrismionToolbar wurden Event-Handler-Parameter explizit typisiert (`React.SyntheticEvent`, `React.MouseEvent<HTMLElement>`).
- **Figma-Plugin:** Wird in CHECKION per `tsconfig.json` (exclude) nicht mitkompiliert; Änderungen am Schema (z. B. `cornerRadius`, `lineHeight`, `strokes.opacity`) nur im MSQDX-DS-Repo.

### CHECKION App

- **Dynamic Route Params:** `params.id`, `params.jobId`, `params.token` werden überall sicher ausgelesen (`string | string[]` → `string | undefined` mit Fallback).
- **Next.js 16:** `middleware.ts` wurde auf `proxy.ts` umgestellt, Export von `middleware` auf `proxy` umbenannt (Deprecation-Warnung entfernt).

## Zu beachten

- **Design-System-Build:** CHECKION baut nicht gegen lokale Quellen von `@msqdx/react`/`@msqdx/tokens`; bei Monorepo/Link-Setup müssen die Pakete gebaut und verlinkt sein, damit der CHECKION-Build durchläuft.
- **Stories:** `**/*.stories.tsx` sind im MSQDX-React-`tsconfig` ausgeschlossen; implizite `any` in Stories können den Paket-Build nicht brechen.
- **Zod/node_modules:** `as any` / `@ts-ignore` in `mcp-server/node_modules/zod` sind Drittanbieter-Code; nicht anfassen.

## Nützliche Befehle

- Design-System bauen: `cd msqdx-design-system && npm run build`
- Nach Middleware→Proxy: Build prüfen, ob Proxy korrekt geladen wird (keine Deprecation-Warnung mehr).
