# Figma MCP: Designs in Figma erstellen

## Zwei Wege, „Design“ in Figma zu erzeugen

### 1. `generate_figma_design` – Live-UI in Figma Design erfassen

**Was es macht:** Erfasst die **laufende UI** deiner Web-App (Browser), wandelt sie in Figma-Design-Layer um und schickt sie in:
- eine **neue** Figma-Design-Datei
- eine **bestehende** Figma-Design-Datei
- die **Zwischenablage**

**Ablauf (laut [Figma Docs](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/#generate_figma_design)):**
1. Remote Figma MCP Server einrichten und authentifizieren
2. Prompt z.B.: *"Start a local server for my app and capture the UI in a new Figma file."*
3. Client startet lokalen Server, injiziert Capture-Skript, öffnet Browser
4. In der Capture-Toolbar: **Entire screen** oder **Select element** wählen
5. Am Ende: **Open file** (Figma) oder in Figma einfügen (Clipboard)

**Einschränkung:**  
Laut Doku **nur für Claude Code und Codex by OpenAI** unterstützt. In Cursor **verifiziert**: Das Tool `generate_figma_design` wird vom Figma MCP für Cursor gar nicht angeboten („tool not found“).  
→ Für „Live-UI in Figma Design erfassen“: [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code) oder [Codex](https://developers.openai.com/codex/) verwenden.

---

### 2. `generate_diagram` – FigJam-Diagramme aus Mermaid/Beschreibung

**Was es macht:** Erzeugt **FigJam-Diagramme** aus:
- Mermaid-Syntax (Flowchart, Gantt, State, Sequence …), oder
- natürlicher Sprachbeschreibung (der Agent erzeugt die Mermaid-Syntax und ruft das Tool auf)

**Unterstützte Diagrammtypen:** Flowchart, Gantt chart, State diagram, Sequence diagram.

**Beispiel-Prompts:**
- *"Erstelle ein Flowchart für den User-Login-Flow mit dem Figma MCP generate_diagram Tool."*
- *"Generate a sequence diagram for the payment flow using the Figma MCP generate_diagram tool."*

**Voraussetzung:** Figma Remote MCP Server verbunden und authentifiziert.  
In Cursor **verifiziert**: `generate_diagram` ist aufrufbar (Parameter: `name`, `mermaidSyntax`). Du bekommst einen FigJam-Link zum Bearbeiten zurück.

---

## MCP-Setup in diesem Projekt

- **Remote:** `figma` → `https://mcp.figma.com/mcp` (Plugin)
- **Desktop:** `figma-desktop` → `http://127.0.0.1:3845/mcp` (Figma Desktop App)

Authentifizierung: Einmal `mcp_auth` für den Figma-Server ausführen, wenn Cursor danach fragt oder die Tools nicht antworten.

---

## Kurzfassung

| Ziel | Tool | In Cursor? |
|------|------|------------|
| Live-Web-UI als Figma-Design | `generate_figma_design` | Nein (nur Claude Code, Codex) |
| FigJam-Diagramme (Mermaid/Text) | `generate_diagram` | Ja, wenn Remote-Server verbunden |

Quellen:
- [Tools and prompts – generate_figma_design](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/#generate_figma_design)
- [Tools and prompts – generate_diagram](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/#generate_diagram)
- [Remote server installation](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
