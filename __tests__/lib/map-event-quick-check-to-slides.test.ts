import { describe, expect, it } from 'vitest';
import { buildPlexonAssistantPptxPlan } from '@/lib/integrations/plexon/build-plexon-assistant-pptx-plan';
import { eventQuickCheckReportModelFixture } from '@/lib/integrations/plexon/fixtures/event-quick-check-report.fixture';

describe('mapEventQuickCheckReportToSlides', () => {
  it('uses dedicated slide plan for event_quick_check_report block', () => {
    const report = eventQuickCheckReportModelFixture();
    const plan = buildPlexonAssistantPptxPlan({
      title: report.meta.title,
      locale: 'de',
      uiLayout: {
        version: 1,
        blocks: [{ id: 'eqc-1', type: 'event_quick_check_report', props: { report } }],
      },
    });
    expect(plan.slides.length).toBeGreaterThanOrEqual(5);
    expect(plan.slides.some((s) => s.title === 'Kernkennzahlen')).toBe(true);
  });
});
