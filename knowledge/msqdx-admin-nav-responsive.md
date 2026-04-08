# MsqdxAdminNav – Mobile & Tablet (CHECKION)

- **Quelle:** `@msqdx/react` → `packages/react/src/components/molecules/AdminNav/MsqdxAdminNav.tsx`.
- **Drawer-Breakpoint:** `useMediaQuery(theme.breakpoints.down('lg'))` — unter **1200px** ist die Nav ein **fixes Overlay** (Slide-in), ab **lg** **dock** rechts im Flex-Layout wie zuvor.
- **Größe im Drawer:** Zeilenhöhe **48px**, Icons **28px**, Labels **16px** (`fontSize.md`); kompakt nur im docked Layout (**32px / 24px / 14px**).
- **Breite Drawer:** `min(420–440px, 100vw − Abstand)` statt flaches **95%**, damit die Leiste auf Tablets lesbar und dennoch nicht vollflächig ist.
- **CHECKION AppShell:** `useMediaQuery(..., 'lg')` für Menü-Button und Drawer-State muss mit der Nav übereinstimmen; schwebender Menü-Button: `z-index: 100003`, `size="large"`, Icon **28px**.
- **CHECKION AppShell-Header (Projekt-Tabs):** Der Bereich neben der `MsqdxCornerBox` darf **kein** festes `left: 240px` haben — Logo sitzt bereits in der linken Layout-Spalte; zusätzlicher Offset hat die **ProjectHeaderNav** auf Mobile auf ~200px Breite zusammengestaucht. Header: `left: 0`, `right: 0`, `minWidth: 0`. `ProjectHeaderNav`: unter `lg` volle Breite, Tabs-Zeile `width: 100%`, Zeilenhöhe 44px, optional Spalte statt Zeile.
- **Innenrahmen links (Smartphone):** `MsqdxAppLayout` setzt bei `hasSidebar` `borderLeft: none` (Anbindung an die dockte Sidebar). Unter `lg` ist die Sidebar ein Drawer — dann fehlt die linke Kante. CHECKION setzt per `AppShell` `layoutProps.sx` auf der inneren Kachel unter `lg` wieder `border-left` in Brand-Farbe (`APP_LAYOUT_INNER_BORDER_WIDTH_PX`, gleich Msqdx `thin`).
- **Build:** Nach Änderungen am Design-System `npm run build` in `msqdx-design-system/packages/react`; CHECKION nutzt `file:../msqdx-design-system/packages/react` — bei Bedarf `npm install` im CHECKION-Root erneut ausführen, damit `node_modules` die aktuelle `dist` zieht.
