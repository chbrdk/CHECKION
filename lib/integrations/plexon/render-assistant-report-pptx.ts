import { buildPlexonAssistantPptxPlan } from '@/lib/integrations/plexon/build-plexon-assistant-pptx-plan';
import type { PlexonAssistantReportPayload } from '@/lib/integrations/plexon/assistant-report-types';
import { renderProjectReportPptx } from '@/lib/project-report/pptx/render-pptx';

export async function renderPlexonAssistantReportPptx(
    payload: PlexonAssistantReportPayload,
    cwd = process.cwd()
): Promise<Buffer> {
    const plan = buildPlexonAssistantPptxPlan(payload);
    return renderProjectReportPptx(plan, cwd);
}

export function isPptxBuffer(data: Buffer): boolean {
    return data.length >= 2 && data[0] === 0x50 && data[1] === 0x4b;
}
