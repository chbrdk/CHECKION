/**
 * Scrollport-Höhen für `DomainIssuesMasterDetail` (normale HTML-Listen in `overflow: auto`).
 * Eltern (z. B. Domain-Tab in `MsqdxMoleculeCard`) haben oft `height: auto` — `maxHeight: 100%`
 * allein reicht nicht; Viewport-Caps (`vh`/`min()`) begrenzen die sichtbare Fläche zuverlässig.
 */
export const DOMAIN_ISSUES_SCROLL = {
    xs: 'min(52vh, 420px)',
    /** Eine volle Breite, gestaffelte Liste (kein 3-Spalten-Grid). */
    singleListLg: 'min(74vh, 860px)',
} as const;
