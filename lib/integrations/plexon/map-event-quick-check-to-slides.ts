import type { EventQuickCheckReportModel } from '@/lib/integrations/plexon/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/integrations/plexon/event-quick-check-report-copy';
import type { ReportSlide, ReportSlideContent } from '@/lib/project-report/pptx/types';
import type { PlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';

function bullets(items: string[]): ReportSlideContent {
  return { kind: 'bullets', bullets: items.filter(Boolean) };
}

export function mapEventQuickCheckReportToSlides(
  report: EventQuickCheckReportModel,
  footer: string,
  labels: PlexonAssistantPptxLabels
): ReportSlide[] {
  const slides: ReportSlide[] = [];

  slides.push({
    kind: 'two_column',
    layout: 'TWO_COLUMN',
    title: EQC_REPORT_COPY.sectionKpi,
    footer,
    left: bullets(report.executive.kpiTiles.map((k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''}`)),
    right: bullets(report.workflow.steps.map((s) => `${s.label}: ${s.detail}`)),
  });

  if (report.domain) {
    slides.push({
      kind: 'two_column',
      layout: 'TWO_COLUMN',
      title: EQC_REPORT_COPY.sectionDomain,
      footer,
      left: bullets([
        `${EQC_REPORT_COPY.colScore}: ${report.domain.score}/100`,
        `${EQC_REPORT_COPY.colPages}: ${report.domain.totalPages}`,
        `Fehler: ${report.domain.stats.errors}`,
      ]),
      right: bullets(report.domain.topIssues.map((i) => `${i.title} (${i.count})`)),
    });
  }

  if (report.persona) {
    slides.push({
      kind: 'two_column',
      layout: 'TWO_COLUMN',
      title: EQC_REPORT_COPY.sectionPersona,
      footer,
      left: bullets([
        `${report.persona.name} · ${Math.round(report.persona.confidence * 100)}%`,
        report.persona.headline,
        ...report.persona.traits.map((t) => `${t.displayName}: ${Math.round(t.score <= 1 ? t.score * 100 : t.score)}%`),
      ]),
      right: bullets([
        ...report.persona.goals.map((g) => `${EQC_REPORT_COPY.goalPrefix}: ${g}`),
        ...report.persona.painPoints.map((p) => `${EQC_REPORT_COPY.painPrefix}: ${p}`),
      ]),
    });
  }

  slides.push({
    kind: 'two_column',
    layout: 'TWO_COLUMN',
    title: EQC_REPORT_COPY.sectionGeoCheck,
    footer,
    left: bullets([
      report.geo.status !== 'complete' ? (report.geo.errorMessage ?? EQC_REPORT_COPY.geoIncomplete) : EQC_REPORT_COPY.geoComplete,
      ...report.geo.questions.slice(0, 4),
    ]),
    right: bullets(
      report.geo.competitors.map(
        (c) =>
          `${c.name}: ${c.score ?? '—'}${c.shareOfVoice != null ? ` · ${EQC_REPORT_COPY.colShareOfVoice} ${Math.round(c.shareOfVoice * 100)}%` : ''}`
      )
    ),
  });

  const recBullets =
    report.insights?.recommendations.map((r) =>
      [r.priority != null ? `[P${r.priority}]` : null, r.title, r.description].filter(Boolean).join(' — ')
    ) ?? [];
  const findingBullets =
    report.insights?.findings.map((f) => `${f.title}: ${f.description}`) ?? [];

  const actionBullets = [
    ...findingBullets.map((b) => `${EQC_REPORT_COPY.insightPrefix}: ${b}`),
    ...(recBullets.length ? recBullets : [report.executive.fazit ?? '']).map(
      (b) => `${EQC_REPORT_COPY.recommendationPrefix}: ${b}`
    ),
  ].filter(Boolean);

  slides.push({
    kind: 'closing',
    layout: 'CLOSING',
    title: labels.recommendations,
    footer,
    bullets: actionBullets.length ? actionBullets : [EQC_REPORT_COPY.noRecommendations],
  });

  return slides;
}
