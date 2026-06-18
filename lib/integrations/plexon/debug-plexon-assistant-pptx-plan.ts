/**
 * Debug payload for Plexon assistant PPTX slide plans (pre-render inspection).
 */
import { buildPlexonAssistantPptxPlan, PLEXON_ASSISTANT_PPTX_MAX_SLIDES } from '@/lib/integrations/plexon/build-plexon-assistant-pptx-plan';
import type { PlexonAssistantReportPayload } from '@/lib/integrations/plexon/assistant-report-types';
import { compactPlexonReportBlocks, slideHasVisibleContent } from '@/lib/integrations/plexon/prune-plexon-assistant-pptx-plan';
import type { ProjectReportPptxPlan, ReportSlide } from '@/lib/project-report/pptx/types';

export type PlexonAssistantPptxDebugSlideSummary = {
    index: number;
    kind: ReportSlide['kind'];
    layout: ReportSlide['layout'];
    title: string;
    summary: string;
    hasVisibleContent: boolean;
};

export type PlexonAssistantPptxDebugPayload = {
    success: true;
    mode: 'plan';
    title: string;
    locale: 'de' | 'en';
    variant: string;
    slideCount: number;
    emptySlideCount: number;
    maxSlides: number;
    uiLayoutBlockCount: number;
    compactedBlockCount: number;
    slides: PlexonAssistantPptxDebugSlideSummary[];
    plan: ProjectReportPptxPlan;
};

function summarizeSlideContent(slide: ReportSlide): string {
    switch (slide.kind) {
        case 'cover':
            return `subtitle: ${slide.subtitle}`;
        case 'section':
            return slide.chapterNumber ? `chapter ${slide.chapterNumber}` : 'section divider';
        case 'bullets':
            return [
                slide.lead?.trim() ? `lead ${slide.lead.trim().length}ch` : null,
                `${slide.bullets.length} bullets`,
            ]
                .filter(Boolean)
                .join(', ');
        case 'metrics':
            return [
                `${slide.items.length} tiles`,
                slide.bullets?.length ? `${slide.bullets.length} notes` : null,
            ]
                .filter(Boolean)
                .join(', ');
        case 'table':
            return `${slide.headers.length} cols × ${slide.rows.length} rows`;
        case 'two_column':
            return `left ${columnKind(slide.left)}, right ${columnKind(slide.right)}`;
        case 'chart':
            return `${slide.chartType}, ${slide.series.length} series, ${slide.bullets?.length ?? 0} context bullets`;
        case 'closing':
            return `${slide.bullets.length} bullets`;
        default:
            return slide.kind;
    }
}

function columnKind(content: { kind: string; bullets?: string[]; text?: string }): string {
    if (content.kind === 'text') return `${content.text?.trim().length ?? 0}ch`;
    return `${content.bullets?.length ?? 0} bullets`;
}

export function buildPlexonAssistantPptxDebugPayload(
    payload: PlexonAssistantReportPayload
): PlexonAssistantPptxDebugPayload {
    const locale = payload.locale ?? 'de';
    const rawBlocks = payload.uiLayout.blocks ?? [];
    const compactedBlocks = compactPlexonReportBlocks(rawBlocks, payload.title);
    const plan = buildPlexonAssistantPptxPlan(payload);

    const slides: PlexonAssistantPptxDebugSlideSummary[] = plan.slides.map((slide, index) => ({
        index,
        kind: slide.kind,
        layout: slide.layout,
        title: 'title' in slide ? String(slide.title ?? '').trim() : '',
        summary: summarizeSlideContent(slide),
        hasVisibleContent: slideHasVisibleContent(slide),
    }));

    const emptySlideCount = slides.filter((slide) => !slide.hasVisibleContent).length;

    return {
        success: true,
        mode: 'plan',
        title: payload.title,
        locale,
        variant: plan.variant,
        slideCount: plan.slides.length,
        emptySlideCount,
        maxSlides: PLEXON_ASSISTANT_PPTX_MAX_SLIDES,
        uiLayoutBlockCount: rawBlocks.length,
        compactedBlockCount: compactedBlocks.length,
        slides,
        plan,
    };
}
