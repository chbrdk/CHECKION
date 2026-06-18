import { describe, expect, it } from 'vitest';
import { buildPlexonAssistantPptxDebugPayload } from '@/lib/integrations/plexon/debug-plexon-assistant-pptx-plan';
import { plexonAssistantReportFixture } from '@/lib/integrations/plexon/fixtures/assistant-report-ui-layout.fixture';
import {
    isPlexonAssistantPptxDebugPlanRequest,
    withPlexonAssistantPptxDebugPlan,
} from '@/lib/paths/plexon-assistant-export';

describe('buildPlexonAssistantPptxDebugPayload', () => {
    it('returns slide summaries and full plan', () => {
        const debug = buildPlexonAssistantPptxDebugPayload(plexonAssistantReportFixture());
        expect(debug.success).toBe(true);
        expect(debug.mode).toBe('plan');
        expect(debug.slideCount).toBe(debug.slides.length);
        expect(debug.plan.slides).toHaveLength(debug.slideCount);
        expect(debug.slides[0]?.kind).toBe('cover');
        expect(debug.emptySlideCount).toBe(0);
    });

    it('flags compacted block counts', () => {
        const debug = buildPlexonAssistantPptxDebugPayload(plexonAssistantReportFixture());
        expect(debug.uiLayoutBlockCount).toBeGreaterThan(0);
        expect(debug.compactedBlockCount).toBeGreaterThan(0);
        expect(debug.compactedBlockCount).toBeLessThanOrEqual(debug.uiLayoutBlockCount);
    });
});

describe('plexon-assistant-export paths', () => {
    it('detects debug=plan', () => {
        expect(
            isPlexonAssistantPptxDebugPlanRequest(
                'https://checkion.example/api/integrations/plexon/assistant-report/pptx?debug=plan'
            )
        ).toBe(true);
        expect(isPlexonAssistantPptxDebugPlanRequest('/api/integrations/plexon/assistant-report/pptx')).toBe(
            false
        );
    });

    it('appends debug query', () => {
        expect(withPlexonAssistantPptxDebugPlan('/api/integrations/plexon/assistant-report/pptx')).toBe(
            '/api/integrations/plexon/assistant-report/pptx?debug=plan'
        );
    });
});
