# Domain-Tab „Generative Search (GEO)“ – UI

- **Komponente:** `components/domain/DomainResultGenerativeSection.tsx` — äußere `MsqdxMoleculeCard` (`borderRadius="1.5xl"`, `footerDivider={false}`), KPI-Raster wie UX-Audit (4 Spalten ab `md`), Innenkarten mit `MSQDX_INNER_CARD_BORDER_SX`.
- **GEO-Score-Farbe:** gleiche Schwellen wie UX-Score (`geoScoreColor`: ≥80 Akzent, ≥55 Warning, sonst Error).
- **Zeilen:** `GenerativePageScrollRow` — `formatUrlForList`, klickbare Zeile wie `UxAuditPageRow`, Chips für Score / llms.txt / Schema; `t('domainResult.generativeRow*')`.
- **i18n:** alle sichtbaren Strings unter `domainResult.generative*` in `locales/de.json` & `en.json`.
- **Props:** Sektion erhält `locale` für `toLocaleString` bei Brüchen (llms / robots).
