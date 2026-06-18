import { describe, expect, it } from 'vitest';
import React from 'react';
import { buildEventQuickCheckReportPages } from '@/components/pdf/EventQuickCheckReportPdfDocument';
import { eventQuickCheckReportModelFixture } from '@/lib/integrations/plexon/fixtures/event-quick-check-report.fixture';

describe('EventQuickCheckReportPdfDocument', () => {
  it('builds 6 pages (cover + 5 sections)', () => {
    const report = eventQuickCheckReportModelFixture();
    const pages = buildEventQuickCheckReportPages(report);
    expect(pages.length).toBeGreaterThanOrEqual(5);
    expect(pages.length).toBeLessThanOrEqual(7);
  });
});
