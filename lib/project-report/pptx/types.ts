/**
 * Slide plan types for project report PPTX export.
 */

export type ReportSlideMetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export type ReportSlideContent =
    | { kind: 'text'; text: string }
    | { kind: 'bullets'; bullets: string[] };

export type ReportSlideChartType = 'bar' | 'barHorizontal' | 'line' | 'radar';

export type ReportSlideChartSeries = {
    name: string;
    labels: string[];
    values: number[];
};

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
          kind: 'chart';
          layout: 'CONTENT';
          title: string;
          subtitle?: string;
          chartType: ReportSlideChartType;
          series: ReportSlideChartSeries[];
          colors?: string[];
          bullets?: string[];
          footer: string;
          valAxisTitle?: string;
          catAxisTitle?: string;
          showLegend?: boolean;
          showValue?: boolean;
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

export const PPTX_MAX_SLIDES_EXECUTIVE = 22;
export const PPTX_MAX_SLIDES_COMPREHENSIVE = 36;
/** @deprecated use getPptxMaxSlides() */
export const PPTX_MAX_SLIDES = PPTX_MAX_SLIDES_COMPREHENSIVE;
export const PPTX_MAX_BULLETS = 6;
export const PPTX_MAX_TABLE_ROWS = 8;

export function getPptxMaxSlides(variant: string): number {
    return variant === 'comprehensive' || variant === 'full'
        ? PPTX_MAX_SLIDES_COMPREHENSIVE
        : PPTX_MAX_SLIDES_EXECUTIVE;
}
