import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { plexonAssistantReportFixture } from '@/lib/integrations/plexon/fixtures/assistant-report-ui-layout.fixture';
import {
    isPptxBuffer,
    renderPlexonAssistantReportPptx,
} from '@/lib/integrations/plexon/render-assistant-report-pptx';
import { assertNoTemplateLoremInActiveSlides } from '@/lib/project-report/pptx/pptx-output-assertions';
import { getReportPptxMasterAbsolutePath } from '@/lib/paths/report-export-templates';

describe('renderPlexonAssistantReportPptx', () => {
    it('produces valid pptx zip buffer', async () => {
        const buf = await renderPlexonAssistantReportPptx(plexonAssistantReportFixture());
        expect(isPptxBuffer(buf)).toBe(true);
        expect(buf.length).toBeGreaterThan(2000);
    }, 60000);

    it('has no lorem ipsum when MSQDX master is present', async () => {
        const masterPath = getReportPptxMasterAbsolutePath(process.cwd());
        if (!fs.existsSync(masterPath)) {
            return;
        }
        const buf = await renderPlexonAssistantReportPptx(plexonAssistantReportFixture());
        assertNoTemplateLoremInActiveSlides(buf);
    }, 90000);
});
