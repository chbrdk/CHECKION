/**
 * Slide plan types for project report PPTX export.
 */

export type ReportSlideMetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export type ReportSlideContent =
    | { kind: 'text'; text: string }
    | { kind: 'bullets'; bullets: string[] };

export type ReportSlide =
    | {
          kind: 'cover';
          layout: 'TITLE';
          title: string;
          subtitle: string;
          date: string;
          variant: string;
          footer: string;
      }
    | {
          kind: 'section';
          layout: 'SECTION';
          title: string;
          chapterNumber?: string;
          footer: string;
      }
    | {
          kind: 'bullets';
          layout: 'CONTENT';
          title: string;
          bullets: string[];
          lead?: string;
          footer: string;
      }
    | {
          kind: 'metrics';
          layout: 'METRICS';
          title: string;
          items: Array<{ label: string; value: string; tone?: ReportSlideMetricTone }>;
          bullets?: string[];
          footer: string;
      }
    | {
          kind: 'table';
          layout: 'CONTENT';
          title: string;
          headers: string[];
          rows: string[][];
          footer: string;
      }
    | {
          kind: 'two_column';
          layout: 'TWO_COLUMN';
          title: string;
          left: ReportSlideContent;
          right: ReportSlideContent;
          footer: string;
      }
    | {
          kind: 'closing';
          layout: 'CLOSING';
          title: string;
          bullets: string[];
          footer: string;
      };

export type ProjectReportPptxPlan = {
    locale: 'de' | 'en';
    variant: string;
    projectName: string;
    slides: ReportSlide[];
};

export const PPTX_MAX_SLIDES = 25;
export const PPTX_MAX_BULLETS = 6;
export const PPTX_MAX_TABLE_ROWS = 8;
