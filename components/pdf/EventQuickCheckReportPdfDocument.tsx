import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { EventQuickCheckReportModel } from '@/lib/integrations/plexon/event-quick-check-report-types';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import {
  PdfCoverPage,
  PdfContentPage,
  PdfLeadText,
  PdfStatGrid,
  PdfDataTable,
  applyReportFooters,
  contentSideForIndex,
  PDF_DOCUMENT_PAGE_LAYOUT,
} from '@/components/pdf/shared/PdfLayout';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfProjectReportCoverContent } from '@/components/pdf/shared/PdfCoverContent';
import { Document } from '@react-pdf/renderer';

function pushContent(pages: React.ReactElement[], key: string, children: React.ReactNode): React.ReactElement[] {
  const side = contentSideForIndex(pages.length);
  return [...pages, <PdfContentPage key={key} side={side}>{children}</PdfContentPage>];
}

function toPdfDataTable(columns: string[], rows: Array<Array<string | number | null>>) {
  const width = `${100 / Math.max(columns.length, 1)}%`;
  return (
    <PdfDataTable
      columns={columns.map((label, i) => ({ key: `col-${i}`, label, width }))}
      rows={rows.map((row) =>
        Object.fromEntries(columns.map((_, ci) => [`col-${ci}`, String(row[ci] ?? '—')]))
      )}
    />
  );
}

function TraitBarsPdf({ traits }: { traits: NonNullable<EventQuickCheckReportModel['persona']>['traits'] }) {
  return (
    <View>
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score);
        return (
          <View key={t.name} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={pdfStyles.metaText}>{t.displayName}</Text>
              <Text style={pdfStyles.metaText}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
              <View style={{ height: 6, width: `${Math.min(100, pct)}%`, backgroundColor: '#e91e63', borderRadius: 2 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function buildEventQuickCheckReportPages(report: EventQuickCheckReportModel): React.ReactElement[] {
  let pages: React.ReactElement[] = [];

  pages.push(
    <PdfCoverPage key="cover">
      <PdfProjectReportCoverContent
        eyebrow={pdfCoverEyebrow('Event Quick Check')}
        title={report.meta.title}
        projectLine={`${report.meta.url} · ${report.meta.domain}`}
        leadText={report.executive.summary ?? null}
      />
    </PdfCoverPage>
  );

  pages = pushContent(
    pages,
    'executive',
    <View>
      <PdfLeadText>Kernkennzahlen und Workflow-Übersicht.</PdfLeadText>
      {report.executive.fazit ? (
        <View style={[pdfStyles.cardBox, { marginBottom: 8 }]}>
          <Text style={pdfStyles.subsectionTitle}>Fazit</Text>
          <Text style={pdfStyles.bodyText}>{report.executive.fazit}</Text>
        </View>
      ) : null}
      <PdfStatGrid
        items={report.executive.kpiTiles.map((k) => ({
          label: k.label,
          value: `${k.value}${k.unit ? ` ${k.unit}` : ''}`,
        }))}
      />
      <PdfSectionHeader title="Workflow" />
      {report.workflow.steps.map((step) => (
        <Text key={step.id} style={pdfStyles.metaText}>
          {step.label}: {step.detail}
        </Text>
      ))}
    </View>
  );

  pages = pushContent(
    pages,
    'domain',
    <View>
      <PdfSectionHeader title="Domain & Top Issues" />
      {report.domain ? (
        <>
          <PdfStatGrid
            items={[
              { label: 'Score', value: `${report.domain.score}/100` },
              { label: 'Seiten', value: String(report.domain.totalPages) },
              { label: 'Fehler', value: String(report.domain.stats.errors) },
            ]}
          />
          {toPdfDataTable(
            ['Issue', 'Count'],
            report.domain.topIssues.map((i) => [i.title, i.count])
          )}
        </>
      ) : (
        <PdfSectionIntro text="Kein Domain-Scan verfügbar." />
      )}
    </View>
  );

  pages = pushContent(
    pages,
    'persona',
    <View>
      <PdfSectionHeader title="AUDION Persona" />
      {report.persona ? (
        <>
          <View style={[pdfStyles.cardBox, { marginBottom: 8 }]}>
            <Text style={pdfStyles.subsectionTitle}>{report.persona.name}</Text>
            <Text style={pdfStyles.metaText}>
              {report.persona.segment} · {Math.round(report.persona.confidence * 100)} %
            </Text>
            <Text style={pdfStyles.bodyText}>{report.persona.headline}</Text>
          </View>
          <PdfSectionHeader title="Traits" />
          <TraitBarsPdf traits={report.persona.traits} />
          <PdfSectionHeader title="Ziele & Pain Points" />
          {report.persona.goals.map((g, i) => (
            <Text key={`g-${i}`} style={pdfStyles.bodyText}>• {g}</Text>
          ))}
          {report.persona.painPoints.map((p, i) => (
            <Text key={`p-${i}`} style={pdfStyles.bodyText}>• {p}</Text>
          ))}
        </>
      ) : (
        <PdfSectionIntro text="Keine Persona verfügbar." />
      )}
    </View>
  );

  pages = pushContent(
    pages,
    'geo',
    <View>
      <PdfSectionHeader title="GEO Competitive Check" />
      {(report.geo.status === 'failed' || report.geo.status === 'partial') && (
        <View style={[pdfStyles.cardBox, { marginBottom: 8 }]}>
          <Text style={pdfStyles.subsectionTitle}>GEO nicht vollständig</Text>
          <Text style={pdfStyles.bodyText}>{report.geo.errorMessage ?? 'Unbekannter Fehler'}</Text>
        </View>
      )}
      {report.geo.questions.map((q, i) => (
        <Text key={i} style={pdfStyles.bodyText}>{i + 1}. {q}</Text>
      ))}
      {report.geo.competitors.length > 0
        ? toPdfDataTable(
            ['Name', 'Score', 'SoV'],
            report.geo.competitors.map((c) => [
              c.name,
              c.score ?? '—',
              c.shareOfVoice != null ? `${Math.round(c.shareOfVoice * 100)}%` : '—',
            ])
          )
        : null}
    </View>
  );

  pages = pushContent(
    pages,
    'insights',
    <View>
      <PdfSectionHeader title="Erkenntnisse & Empfehlungen" />
      {report.insights?.findings.map((f, i) => (
        <PdfRecommendationRow
          key={i}
          title={f.severity ? `[${f.severity}] ${f.title}` : f.title}
          description={f.description}
        />
      )) ?? null}
      {report.insights?.recommendations.map((r, i) => (
        <PdfRecommendationRow
          key={`r-${i}`}
          title={[r.priority != null ? `[P${r.priority}]` : null, r.title].filter(Boolean).join(' ')}
          description={r.description}
        />
      )) ?? null}
      {report.appendix.scanId ? (
        <Text style={[pdfStyles.metaText, { marginTop: 8 }]}>
          Scan-ID: {report.appendix.scanId}
          {report.appendix.geoJobId ? ` · GEO-Job: ${report.appendix.geoJobId}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return applyReportFooters(pages, {
    title: report.meta.title,
    locale: 'de',
    skipFooter: (_page, index) => index === 0,
  });
}

export function EventQuickCheckReportPdfDocument({ report }: { report: EventQuickCheckReportModel }) {
  const pages = buildEventQuickCheckReportPages(report);
  return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{pages}</Document>;
}
