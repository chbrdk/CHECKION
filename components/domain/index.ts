/**
 * Domain scan result UI: shell, tab orchestrator, and per-tab sections.
 * Import from `@/components/domain` (avoid importing this barrel from `DomainResultMain.tsx` — use relative `./` there to prevent circular resolution).
 */
export { DomainResultMain } from './DomainResultMain';
export { DomainResultShell } from './DomainResultShell';

export { DomainResultOverviewSection } from './DomainResultOverviewSection';
export type { DomainResultOverviewSectionProps } from './DomainResultOverviewSection';

export { DomainResultListDetailsSection } from './DomainResultListDetailsSection';
export type { DomainResultListDetailsSectionProps } from './DomainResultListDetailsSection';

export { DomainResultVisualMapSection } from './DomainResultVisualMapSection';
export type { DomainResultVisualMapSectionProps } from './DomainResultVisualMapSection';

export { DomainResultUxCxSection } from './DomainResultUxCxSection';
export type { DomainResultUxCxSectionProps } from './DomainResultUxCxSection';

export { DomainResultVisualAnalysisSection } from './DomainResultVisualAnalysisSection';
export type { DomainResultVisualAnalysisSectionProps } from './DomainResultVisualAnalysisSection';

export { DomainResultUxAuditSection, DomainResultUxAuditEmpty } from './DomainResultUxAuditSection';
export type { DomainResultUxAuditSectionProps } from './DomainResultUxAuditSection';

export { DomainResultStructureSection, DomainResultStructureEmpty } from './DomainResultStructureSection';
export type { DomainResultStructureSectionProps } from './DomainResultStructureSection';

export { DomainResultLinksSeoSection, DomainResultLinksSeoEmpty } from './DomainResultLinksSeoSection';
export type { DomainResultLinksSeoSectionProps } from './DomainResultLinksSeoSection';

export { DomainResultInfraSection, DomainResultInfraTab } from './DomainResultInfraSection';
export type { DomainResultInfraSectionProps, DomainResultInfraTabProps } from './DomainResultInfraSection';

export { DomainResultGenerativeSection, DomainResultGenerativeEmpty } from './DomainResultGenerativeSection';
export type { DomainResultGenerativeSectionProps } from './DomainResultGenerativeSection';

export { DomainResultJourneySection } from './DomainResultJourneySection';
export type { DomainResultJourneySectionProps } from './DomainResultJourneySection';
