# CHECKION – Lokaler Build und Deploy (Coolify)

## Beides mit einer package.json

Die **gleiche** `package.json` wird lokal und in Coolify/Docker genutzt. Es ist **kein Bereinigen** oder Umschalten nötig vor dem Push.

- **Lokal:** `file:../msqdx-design-system/...` zeigt auf ein Verzeichnis neben CHECKION-1 (Symlink oder echter Ordner).
- **Coolify/Docker:** Das Dockerfile klont das Design-System nach `/msqdx-design-system`; von `/app` aus löst `../msqdx-design-system` dort auf.

## Lokaler Build (mit MSQDX-DS neben CHECKION-1)

Wenn das Design-System unter `ANTIGRAVITY/MSQDX-DS/msqdx-design-system` liegt:

```bash
cd CHECKION-1
npm run build:local
```

`build:local` macht:

1. Prüfen, ob `../MSQDX-DS/msqdx-design-system` existiert.
2. Falls `../msqdx-design-system` noch nicht existiert: Symlink anlegen  
   `../msqdx-design-system` → `../MSQDX-DS/msqdx-design-system`.
3. `npm run build` ausführen (dieselbe Next-Build-Pipeline wie in Docker).

So kannst du Build-Fehler **lokal** sehen, bevor du nach GitHub/Coolify pushst.

## Alternative: Design-System direkt neben CHECKION-1

Wenn du das Repo so klonst, dass `msqdx-design-system` ein Geschwisterordner von CHECKION-1 ist:

```
ANTIGRAVITY/
  CHECKION-1/
  msqdx-design-system/   # geklont von GitHub
```

dann reicht lokal `npm run build` (ohne `build:local`). Der Symlink aus `build:local` erzeugt genau diese Auflösung, wenn du nur `MSQDX-DS/msqdx-design-system` hast.

## Workflow: Erst lokal, dann Sync

1. **Lokal arbeiten** in CHECKION-1 (und ggf. MSQDX-DS).
2. **Build prüfen:** `npm run build:local` (oder `npm run build`, wenn der Link schon existiert).
3. **Tests:** `npm run test` bzw. `npm run test:api` nach Bedarf.
4. **Sync:** Push zu GitHub; Coolify baut aus dem gleichen Stand. Es ist **keine** Anpassung der `package.json` oder anderer Dateien für Remote nötig.

## Agent-Hinweis

Bei Änderungen an Next/React/Frontend oder an der Projektseite sollte vor dem Abschluss **lokal gebaut** werden, z. B.:

- `npm run build:local` (stellt den Symlink her und baut), oder  
- `npm run build` (wenn `../msqdx-design-system` bereits existiert).

Damit treten Build-Fehler (z. B. Parser/JSX) lokal statt erst in Coolify auf.
