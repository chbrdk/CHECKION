import { describe, expect, it } from 'vitest';

import {
  DomainResultGenerativeEmpty,
  DomainResultGenerativeSection,
  DomainResultInfraTab,
  DomainResultJourneySection,
  DomainResultLinksSeoEmpty,
  DomainResultLinksSeoSection,
  DomainResultListDetailsSection,
  DomainResultMain,
  DomainResultOverviewSection,
  DomainResultPageTopicsEmpty,
  DomainResultPageTopicsSection,
  DomainResultShell,
  DomainResultStructureEmpty,
  DomainResultStructureSection,
  DomainResultUxAuditEmpty,
  DomainResultUxAuditSection,
  DomainResultUxCxSection,
  DomainResultVisualAnalysisSection,
  DomainResultVisualMapSection,
} from '@/components/domain';

describe('components/domain barrel', () => {
  it('exports shell, main, and all tab sections', () => {
    expect(DomainResultMain).toBeDefined();
    expect(DomainResultShell).toBeDefined();
    expect(DomainResultOverviewSection).toBeDefined();
    expect(DomainResultPageTopicsSection).toBeDefined();
    expect(DomainResultPageTopicsEmpty).toBeDefined();
    expect(DomainResultListDetailsSection).toBeDefined();
    expect(DomainResultVisualMapSection).toBeDefined();
    expect(DomainResultUxCxSection).toBeDefined();
    expect(DomainResultVisualAnalysisSection).toBeDefined();
    expect(DomainResultUxAuditSection).toBeDefined();
    expect(DomainResultUxAuditEmpty).toBeDefined();
    expect(DomainResultStructureSection).toBeDefined();
    expect(DomainResultStructureEmpty).toBeDefined();
    expect(DomainResultLinksSeoSection).toBeDefined();
    expect(DomainResultLinksSeoEmpty).toBeDefined();
    expect(DomainResultInfraTab).toBeDefined();
    expect(DomainResultGenerativeSection).toBeDefined();
    expect(DomainResultGenerativeEmpty).toBeDefined();
    expect(DomainResultJourneySection).toBeDefined();
  });
});
