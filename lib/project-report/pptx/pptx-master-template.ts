/**
 * MSQDX master template: slide indices and placeholder shape names.
 * @see knowledge/msqdx-ppt-master-layout-mapping.md
 */
import {
    PPTX_MSQDX_TEMPLATE_ALIAS,
    PPTX_MSQDX_TEMPLATE_SLIDES,
} from '@/lib/paths/report-export-templates';
import type { ReportSlide } from '@/lib/project-report/pptx/types';

export const MSQDX_TEMPLATE_ALIAS = PPTX_MSQDX_TEMPLATE_ALIAS;

export const MSQDX_TEMPLATE_SLIDES = PPTX_MSQDX_TEMPLATE_SLIDES;

export const MSQDX_TEMPLATE_SHAPES = {
    TITLE: {
        title: 'Titel 2',
        body: 'Textplatzhalter 1',
    },
    SECTION: {
        title: 'Titel 1',
        body: 'Textplatzhalter 2',
        footer: 'Fußzeilenplatzhalter 4',
    },
    CONTENT: {
        title: 'Titel 2',
        /** Main body area on the sample slide (holds Lorem ipsum in master). */
        body: 'Inhaltsplatzhalter 1',
        eyebrow: 'Textplatzhalter 3',
        footer: 'Fußzeilenplatzhalter 5',
    },
    TWO_COLUMN: {
        title: 'Titel 4',
        left: 'Inhaltsplatzhalter 1',
        right: 'Inhaltsplatzhalter 5',
        eyebrow: 'Textplatzhalter 2',
        footer: 'Fußzeilenplatzhalter 6',
    },
    METRICS: {
        title: 'Titel 1',
        eyebrow: 'Textplatzhalter 2',
        values: ['Textplatzhalter 8', 'Textplatzhalter 4', 'Textplatzhalter 6'] as const,
        labels: ['Textplatzhalter 3', 'Textplatzhalter 5', 'Textplatzhalter 7'] as const,
        footer: 'Fußzeilenplatzhalter 9',
    },
    CLOSING: {
        title: 'Titel 4',
        footer: 'Fußzeilenplatzhalter 2',
    },
} as const;

/** Wide 16:9 slide size (inches) — matches MSQDX master. */
export const MSQDX_SLIDE_SIZE = {
    width: 13.33,
    height: 7.5,
} as const;

export function templateSlideForLayout(layout: ReportSlide['layout']): number {
    switch (layout) {
        case 'TITLE':
            return MSQDX_TEMPLATE_SLIDES.TITLE;
        case 'SECTION':
            return MSQDX_TEMPLATE_SLIDES.SECTION;
        case 'TWO_COLUMN':
            return MSQDX_TEMPLATE_SLIDES.TWO_COLUMN;
        case 'METRICS':
            return MSQDX_TEMPLATE_SLIDES.METRICS;
        case 'CLOSING':
            return MSQDX_TEMPLATE_SLIDES.CLOSING;
        case 'CONTENT':
        default:
            return MSQDX_TEMPLATE_SLIDES.CONTENT;
    }
}
