import { describe, expect, it } from 'vitest';
import React from 'react';
import { buildEventQuickCheckReportPages } from '@/components/pdf/EventQuickCheckReportPdfDocument';
import { eventQuickCheckReportModelFixture } from '@/lib/integrations/plexon/fixtures/event-quick-check-report.fixture';

describe('EventQuickCheckReportPdfDocument', () => {
  it('builds branded pages for cover and all report chapters', () => {
    const report = eventQuickCheckReportModelFixture();
    const pages = buildEventQuickCheckReportPages(report);
    expect(pages.length).toBeGreaterThanOrEqual(7);
    expect(pages[0]?.key).toBe('cover');
  });
});
