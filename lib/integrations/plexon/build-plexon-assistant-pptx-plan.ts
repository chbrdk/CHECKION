/**
 * Build MSQDX slide plan from Plexon assistant report payload.
 */
import type { PlexonAssistantReportPayload } from '@/lib/integrations/plexon/assistant-report-types';
import { getPlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';
import { isPinnedAssistantBlock, mapUiBlockToSlides } from '@/lib/integrations/plexon/map-ui-block-to-slides';
import {
    compactPlexonReportBlocks,
    pruneEmptyPptxSlides,
} from '@/lib/integrations/plexon/prune-plexon-assistant-pptx-plan';
import { normalizePptxPlan } from '@/lib/project-report/pptx/normalize-pptx-plan';
import type { ProjectReportPptxPlan, ReportSlide } from '@/lib/project-report/pptx/types';

export const PLEXON_ASSISTANT_PPTX_MAX_SLIDES = 24;

function formatReportDate(locale: 'de' | 'en'): string {
    return new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function buildFooter(title: string, locale: 'de' | 'en', labels: ReturnType<typeof getPlexonAssistantPptxLabels>): string {
    const date = formatReportDate(locale);
    return `${title} · ${date} · ${labels.footerSuffix}`;
}

export function buildPlexonAssistantPptxPlan(payload: PlexonAssistantReportPayload): ProjectReportPptxPlan {
    const locale = payload.locale ?? 'de';
    const labels = getPlexonAssistantPptxLabels(locale);
    const footer = buildFooter(payload.title, locale, labels);
    const slides: ReportSlide[] = [];

    slides.push({
        kind: 'cover',
        layout: 'TITLE',
        title: payload.title,
        subtitle: labels.coverSubtitle,
        date: formatReportDate(locale),
        variant: labels.variant,
        footer,
    });

    const blocks = compactPlexonReportBlocks(payload.uiLayout.blocks ?? [], payload.title);
    let pinnedSectionInserted = false;

    for (const block of blocks) {
        if (isPinnedAssistantBlock(block) && !pinnedSectionInserted) {
            slides.push({
                kind: 'section',
                layout: 'SECTION',
                title: labels.pinnedSection,
                footer,
            });
            pinnedSectionInserted = true;
        }
        slides.push(...mapUiBlockToSlides(block, footer, labels));
    }

    const normalized = pruneEmptyPptxSlides(
        normalizePptxPlan(slides, {
            locale,
            maxSlides: PLEXON_ASSISTANT_PPTX_MAX_SLIDES,
        })
    );

    return {
        locale,
        variant: 'plexon-assistant',
        projectName: payload.title,
        slides: normalized,
    };
}
