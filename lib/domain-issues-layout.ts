/**
 * Scrollport-Höhen für `DomainIssuesMasterDetail` (normale HTML-Listen in `overflow: auto`).
 * Eltern (z. B. Domain-Tab in `MsqdxMoleculeCard`) haben oft `height: auto` — `maxHeight: 100%`
 * allein reicht nicht; Viewport-Caps (`vh`/`min()`) begrenzen die sichtbare Fläche zuverlässig.
 */
export const DOMAIN_ISSUES_SCROLL = {
    xs: 'min(52vh, 420px)',
    gridRowLg: 'min(68vh, 780px)',
    groupsLgStep1: 'min(62vh, 720px)',
    groupsLgStep23: 'min(50vh, 560px)',
    pagesLgStep2: 'min(58vh, 640px)',
    pagesLgStep3: 'min(26vh, 320px)',
    issuesLg: 'min(58vh, 520px)',
} as const;
