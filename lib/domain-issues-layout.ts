/**
 * Scrollport-Höhen für `DomainIssuesMasterDetail` (@tanstack/react-virtual).
 * Eltern (z. B. Domain-Tab in `MsqdxMoleculeCard`) haben oft `height: auto` — dann ist
 * `maxHeight: 100%` wirkungslos und die Virtual-List wächst mit `getTotalSize()` mit.
 * Viewport-basierte Caps sind deshalb zwingend.
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
