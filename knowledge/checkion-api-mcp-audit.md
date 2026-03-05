# CHECKION – API- und MCP-Audit

Stand: Nach Prüfung der Codebasis (API-Routen, MCP-Tools, Features).

---

## 1. Bestehende API-Endpunkte (nach Bereich)

### Health
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| GET | `/api/health` | Health-Check `{ status: "ok" }` |

### Auth & User
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/auth/register` | Registrierung |
| GET | `/api/auth/profile` | Profil lesen (id, email, name, company, avatar_url, locale) |
| PATCH | `/api/auth/profile` | Profil aktualisieren |
| POST | `/api/auth/change-password` | Passwort ändern |
| GET | `/api/auth/tokens` | API-Tokens auflisten |
| POST | `/api/auth/tokens` | API-Token anlegen (Body: `name?`) |
| DELETE | `/api/auth/tokens/[id]` | API-Token widerrufen |

### Projekte
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| GET | `/api/projects` | Projekte auflisten |
| POST | `/api/projects` | Projekt anlegen (name, domain?) |
| GET | `/api/projects/[id]` | Projekt inkl. Zähler (domainScans, journeyRuns, geoEeatRuns, singleScans) |
| PATCH | `/api/projects/[id]` | Projekt aktualisieren (name?, domain?) |
| DELETE | `/api/projects/[id]` | Projekt löschen |

### Single-Page-Scan
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/scan` | Scan starten (url, standard?, runners?, projectId?) → desktop/tablet/mobile |
| GET | `/api/scan` | Scans auflisten (limit, page, projectId) |
| GET | `/api/scan/[id]` | Einzelergebnis |
| DELETE | `/api/scans/[id]` | Scan löschen |
| PATCH | `/api/scan/[id]/project` | Scan einem Projekt zuweisen |
| POST | `/api/scan/[id]/summarize` | LLM-Summary für Scan |
| GET | `/api/scan/[id]/screenshot` | Screenshot abrufen |

### Domain-Scan
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/scan/domain` | Domain-Scan starten (url, useSitemap?, maxPages?, projectId?) |
| GET | `/api/scans/domain` | Domain-Scans auflisten (limit, page, projectId) |
| GET | `/api/scan/domain/[id]/status` | Fortschritt/Status |
| GET | `/api/scan/domain/[id]/summary` | Gespeicherte Summary |
| POST | `/api/scan/domain/[id]/summarize` | LLM-Domain-Summary |
| POST | `/api/scan/domain/[id]/journey` | User-Journey-Agent starten |
| DELETE | `/api/scans/domain/[id]` | Domain-Scan löschen |
| PATCH | `/api/scans/domain/[id]/project` | Domain-Scan Projekt zuweisen |

### Journey Agent (UX)
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/scan/journey-agent` | Journey starten (url, task, projectId?) |
| GET | `/api/scan/journey-agent/history` | History (limit, projectId) |
| GET | `/api/scan/journey-agent/[jobId]` | Job-Ergebnis |
| PATCH | `/api/scan/journey-agent/[jobId]/project` | Job Projekt zuweisen |
| GET | `/api/scan/journey-agent/[jobId]/video` | Video |
| GET | `/api/scan/journey-agent/[jobId]/live` | Live-Status |
| GET | `/api/scan/journey-agent/[jobId]/live/stream` | SSE-Stream |

### GEO / E-E-A-T
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/scan/geo-eeat` | GEO/E-E-A-T starten (url, domainScanId?, projectId?, runCompetitive?, competitors?, queries?) |
| POST | `/api/scan/geo-eeat/suggest-competitors-queries` | AI-Vorschläge Konkurrenten + Fragen |
| GET | `/api/scan/geo-eeat/history` | History (limit, projectId) |
| GET | `/api/scan/geo-eeat/[jobId]` | Job-Ergebnis |
| GET | `/api/scan/geo-eeat/[jobId]/status` | Status |
| PATCH | `/api/scan/geo-eeat/[jobId]/project` | Job Projekt zuweisen |
| POST | `/api/scan/geo-eeat/[jobId]/rerun-competitive` | Competitive erneut laufen lassen |
| GET | `/api/scan/geo-eeat/[jobId]/competitive-history` | Competitive-Durchläufe |
| GET | `/api/scan/geo-eeat/[jobId]/competitive-history/[runId]` | Ein Durchlauf |

### Tools (einzelne Checks / Hilfsfunktionen)
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| GET | `/api/tools/contrast` | WCAG-Kontrast (f, b Hex) |
| GET | `/api/tools/extract` | Content per URL + CSS-Selector |
| POST | `/api/tools/readability` | Lesbarkeit (Body: text) |
| GET | `/api/tools/ssl-labs` | SSL-Labs-Check (host) |
| GET | `/api/tools/pagespeed` | PageSpeed Insights (url) |
| GET | `/api/tools/wayback` | Wayback-Verfügbarkeit (url) |

### Checks (Proxy zu /api/tools/*, einheitlicher Namensraum)
| Method | Pfad | Forward-Ziel |
|--------|------|----------------|
| GET | `/api/checks/contrast` | /api/tools/contrast |
| GET | `/api/checks/ssl` | /api/tools/ssl-labs |
| GET | `/api/checks/pagespeed` | /api/tools/pagespeed |
| GET | `/api/checks/wayback` | /api/tools/wayback |
| POST | `/api/checks/readability` | /api/tools/readability |

### Journeys (gespeicherte Journeys)
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| GET | `/api/journeys` | Gespeicherte Journeys (limit, page) |
| POST | `/api/journeys` | Journey speichern |
| GET | `/api/journeys/[id]` | Eine Journey |
| DELETE | `/api/journeys/[id]` | Journey löschen |

### Share
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| POST | `/api/share` | Share-Link anlegen (type, id, password?) |
| GET | `/api/share/by-resource` | Share zu Resource (type, id) |
| GET | `/api/share/[token]` | Share-Metadaten (öffentlich/Bearer) |
| PATCH | `/api/share/[token]` | Passwort setzen/entfernen |
| DELETE | `/api/share/[token]` | Share widerrufen |
| POST | `/api/share/[token]/access` | Zugang (Passwort) |
| GET | `/api/share/[token]/video` | Video |
| GET | `/api/share/[token]/pages/[pageId]` | Seite |
| GET | `/api/share/[token]/pages/[pageId]/screenshot` | Screenshot |

### Sonstiges
| Method | Pfad | Beschreibung |
|--------|------|--------------|
| GET | `/api/search` | Dashboard-Suche (q, limit) |
| POST | `/api/saliency/generate` | Saliency-Job starten |
| GET | `/api/saliency/result` | Saliency-Ergebnis (jobId, scanId) |

---

## 2. MCP-Tools (bestehend)

Scans: scan_single, scan_get, scans_list, scan_domain, scan_domain_status, scan_domain_summary, scans_domain_list, scan_assign_project, scan_domain_assign_project, scan_journey_assign_project, scan_geo_eeat_assign_project.  
Projekte: projects_list, project_get, project_create, project_update, project_delete.  
Checks/Tools: tools_contrast, tools_extract, tools_ssl, tools_pagespeed, tools_wayback, tools_readability.  
Journeys (gespeichert): journeys_list, journey_get, journey_delete.  
GEO/E-E-A-T: geo_eeat_suggest_queries, geo_eeat_history, geo_eeat_get, geo_eeat_rerun_competitive.  
Suche & Share: search, share_create, share_get, share_revoke.  
User & Health: user_profile, health.  

Vollständige Liste und Parameter siehe `mcp-server/README.md`.

---

## 2b. Noch fehlende MCP-Tools (API vorhanden, kein Tool)

**Umgesetzt (Stand):** Alle unten genannten Tools sind implementiert.

| Priorität | API | Tool-Name | Status |
|-----------|-----|-----------|--------|
| ~~Hoch~~ | POST `/api/scan/journey-agent` | `checkion/scan_journey_start` | ✅ |
| ~~Hoch~~ | GET `/api/scan/journey-agent/[jobId]` | `checkion/scan_journey_get` | ✅ |
| ~~Hoch~~ | GET `/api/scan/journey-agent/history` | `checkion/scan_journey_history` | ✅ |
| ~~Hoch~~ | POST `/api/scan/geo-eeat` | `checkion/geo_eeat_start` | ✅ |
| ~~Hoch~~ | GET `/api/scan/geo-eeat/[jobId]/status` | `checkion/geo_eeat_status` | ✅ |
| ~~Mittel~~ | GET `.../competitive-history` | `checkion/geo_eeat_competitive_history` | ✅ |
| ~~Mittel~~ | GET `.../competitive-history/[runId]` | `checkion/geo_eeat_competitive_run_get` | ✅ |
| ~~Mittel~~ | DELETE `/api/scans/[id]` | `checkion/scan_delete` | ✅ |
| ~~Mittel~~ | DELETE `/api/scans/domain/[id]` | `checkion/scan_domain_delete` | ✅ |
| ~~Mittel~~ | GET `/api/share/by-resource` | `checkion/share_by_resource` | ✅ |
| ~~Niedrig~~ | POST `/api/scan/[id]/summarize` | `checkion/scan_summarize` | ✅ |
| ~~Niedrig~~ | POST `/api/scan/domain/[id]/summarize` | `checkion/scan_domain_summarize` | ✅ |
| ~~Niedrig~~ | POST `/api/scan/domain/[id]/journey` | `checkion/scan_domain_journey_start` | ✅ |
| ~~Niedrig~~ | POST `/api/journeys` | `checkion/journey_save` | ✅ |
| ~~Nische~~ | GET `/api/scan/[id]/screenshot` | `checkion/scan_screenshot` | ✅ (URL) |
| ~~Nische~~ | POST/GET Saliency | `checkion/saliency_generate`, `checkion/saliency_result` | ✅ |

Nicht als MCP abgebildet (bewusst/sensibel): Auth (register, change-password, tokens CRUD), PATCH profile.

---

## 3. Umgesetzt (Check-API + MCP-Erweiterung)

- **API /api/checks/\***: Fünf Proxy-Routen (contrast, ssl, pagespeed, wayback, readability) leiten an /api/tools/* weiter. Konstanten in `lib/constants.ts`.
- **MCP**: Alle oben genannten Lücken geschlossen: tools_ssl, tools_pagespeed, tools_wayback, tools_readability; user_profile; project_update, project_delete; scan_assign_project, scan_domain_assign_project, scan_journey_assign_project, scan_geo_eeat_assign_project; journeys_list, journey_get, journey_delete; geo_eeat_suggest_queries, geo_eeat_history, geo_eeat_get, geo_eeat_rerun_competitive; search; share_create, share_get, share_revoke.

---

## 4. Kurzfassung (Stand nach Umsetzung)

| Bereich | API | MCP |
|---------|-----|-----|
| **Kleinteilige Checks** | /api/tools/* + /api/checks/* (Proxy) | tools_contrast, extract, ssl, pagespeed, wayback, readability |
| **User** | profile, change-password, tokens | user_profile (read-only) |
| **Projekte** | Voll CRUD + Zuweisungen | list, get, create, update, delete + 4× assign_project |
| **Journeys** | list, get, post, delete | journeys_list, journey_get, journey_delete |
| **GEO/E-E-A-T** | suggest, history, get, rerun, competitive-history | geo_eeat_suggest_queries, history, get, rerun_competitive |
| **Suche** | GET /api/search | search |
| **Share** | create, get, revoke, … | share_create, share_get, share_revoke |
