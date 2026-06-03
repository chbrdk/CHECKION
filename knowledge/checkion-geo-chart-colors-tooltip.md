# GEO / Rank Charts – Series Colors & Line Tooltip

## Central module

- `lib/chart-series-colors.ts` – `CHART_SERIES_PALETTE`, `getChartSeriesColor(index)`, `buildSeriesColorMap(keys, { highlightKey?, highlightColor? })`
- `components/chart/GeoPositionLineTooltip.tsx` – used with Recharts `<Tooltip shared={false} />` so hover shows **one** line: date, series name, position

## Consumers

- `GeoQuestionCard` – GEO query position history (domains or models)
- `RankTrackingChart` – SERP rank lines
- `RankIntentCompareChart` – intent variant comparison
- `CompetitivePositionDiagram` – per-model bar colors

## Behavior

- Own domain / highlight key: `THEME_ACCENT_CSS` (user brand)
- Other series: distinct palette indices (no `% 8` wrap until 16+ series; then golden-angle HSL)
- Line hover: `shared={false}` + `GeoPositionLineTooltip` shows e.g. `Pos. 3` or `Nicht genannt`

## Tests

- `__tests__/lib/chart-series-colors.test.ts`
