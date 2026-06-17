import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { PlexonAssistantReportPayload, PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
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

type StepStatus = 'pending' | 'running' | 'done' | 'error';

function pushContent(pages: React.ReactElement[], key: string, children: React.ReactNode): React.ReactElement[] {
  const side = contentSideForIndex(pages.length);
  return [...pages, <PdfContentPage key={key} side={side}>{children}</PdfContentPage>];
}

function blockTitle(props: Record<string, unknown>): string | null {
  return typeof props.title === 'string' && props.title.trim() ? props.title.trim() : null;
}

function blockMargin(index: number): Style {
  return index > 0 ? { marginTop: 8 } : {};
}

function stepStatusSymbol(status: StepStatus): string {
  switch (status) {
    case 'done':
      return '✓';
    case 'error':
      return '✗';
    case 'running':
      return '▶';
    default:
      return '○';
  }
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

function renderBlock(block: PlexonUiBlock, index: number): React.ReactNode {
  const p = block.props;
  const wrap = blockMargin(index);

  switch (block.type) {
    case 'text':
      return (
        <View key={block.id} style={wrap}>
          <Text style={pdfStyles.bodyText}>{String(p.markdown ?? '')}</Text>
        </View>
      );
    case 'alert':
      return (
        <View key={block.id} style={[pdfStyles.cardBox, wrap]}>
          {blockTitle(p) ? <Text style={pdfStyles.subsectionTitle}>{blockTitle(p)}</Text> : null}
          <Text style={pdfStyles.bodyText}>{String(p.message ?? '')}</Text>
        </View>
      );
    case 'metric_grid': {
      const items = (p.items as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          <PdfStatGrid
            items={items.map((i) => ({
              label: i.label,
              value: `${i.value}${i.unit ? ` ${i.unit}` : ''}`,
            }))}
          />
        </View>
      );
    }
    case 'finding_list': {
      const items = (p.items as Array<{ title: string; description: string; severity?: string }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          <PdfSectionHeader title={blockTitle(p) ?? 'Erkenntnisse'} />
          {items.map((item, i) => (
            <PdfRecommendationRow
              key={i}
              title={item.severity ? `[${item.severity}] ${item.title}` : item.title}
              description={item.description}
            />
          ))}
        </View>
      );
    }
    case 'recommendation_list': {
      const items =
        (p.items as Array<{ title: string; description?: string; priority?: number; category?: string }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          <PdfSectionHeader title={blockTitle(p) ?? 'Handlungsempfehlungen'} />
          {items.map((item, i) => (
            <PdfRecommendationRow
              key={i}
              title={
                [
                  item.priority != null ? `[P${item.priority}]` : null,
                  item.title,
                  item.category ? `· ${item.category}` : null,
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              description={item.description ?? ''}
            />
          ))}
        </View>
      );
    }
    case 'key_value_list': {
      const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {items.map((item, i) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableLabel}>{item.label}</Text>
              <Text style={pdfStyles.tableValue}>{String(item.value)}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'data_table': {
      const cols = (p.columns as string[]) ?? [];
      const rows = (p.rows as Array<Array<string | number | null>>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {toPdfDataTable(cols, rows.slice(0, 50))}
        </View>
      );
    }
    case 'link_list': {
      const links = (p.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {links.map((link, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={pdfStyles.subsectionTitle}>{link.label}</Text>
              <Text style={pdfStyles.metaText}>{link.href}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'persona_card': {
      const personas =
        (p.personas as Array<{ name: string; segment: string; headline: string; confidence?: number }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {personas.map((persona, i) => (
            <View key={i} style={[pdfStyles.cardBox, { marginBottom: 6 }]}>
              <Text style={pdfStyles.subsectionTitle}>{persona.name}</Text>
              <Text style={pdfStyles.metaText}>
                {persona.segment}
                {persona.confidence != null ? ` · ${Math.round(persona.confidence * 100)}%` : ''}
              </Text>
              <Text style={pdfStyles.bodyText}>{persona.headline}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'target_group_card': {
      const groups =
        (p.targetGroups as Array<{
          name: string;
          segment: string;
          description?: string;
          personaCount?: number;
          knowledgeEntryCount?: number;
        }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {groups.map((group, i) => (
            <View key={i} style={[pdfStyles.cardBox, { marginBottom: 6 }]}>
              <Text style={pdfStyles.subsectionTitle}>{group.name}</Text>
              <Text style={pdfStyles.metaText}>{group.segment}</Text>
              {group.description ? <Text style={pdfStyles.bodyText}>{group.description}</Text> : null}
              <Text style={pdfStyles.metaText}>
                Personas: {group.personaCount ?? 0} · Wissenseinträge: {group.knowledgeEntryCount ?? 0}
              </Text>
            </View>
          ))}
        </View>
      );
    }
    case 'summary_card': {
      const links = (p.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <View key={block.id} style={[pdfStyles.cardBox, wrap]}>
          <PdfSectionHeader title={String(p.title ?? 'Zusammenfassung')} />
          <PdfStatGrid
            items={[
              { label: 'CHECKION Scans', value: String(p.checkionScanCount ?? '—') },
              { label: 'AUDION Personas', value: String(p.audionPersonaCount ?? '—') },
            ]}
          />
          {links.map((link, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={pdfStyles.subsectionTitle}>{link.label}</Text>
              <Text style={pdfStyles.metaText}>{link.href}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'step_list': {
      const steps =
        (p.steps as Array<{ label: string; status: StepStatus; detail?: string; progress?: number }>) ?? [];
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          {steps.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 6, gap: 6 }}>
              <Text style={{ width: 14, fontWeight: 700 }}>{stepStatusSymbol(step.status)}</Text>
              <View>
                <Text style={pdfStyles.subsectionTitle}>{step.label}</Text>
                <Text style={pdfStyles.metaText}>
                  {[step.detail, step.status === 'running' && step.progress != null ? `${step.progress}%` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'corner_tab_section':
      return (
        <View key={block.id} style={[pdfStyles.cardBox, wrap]}>
          <Text style={pdfStyles.metaText}>{String(p.tabLabel ?? 'Abschnitt')}</Text>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          <Text style={pdfStyles.bodyText}>{String(p.markdown ?? '')}</Text>
        </View>
      );
    case 'collapsible':
      return (
        <View key={block.id} style={[pdfStyles.cardBox, wrap]}>
          <PdfSectionHeader title={String(p.title ?? 'Abschnitt')} />
          <Text style={pdfStyles.bodyText}>{String(p.markdown ?? '')}</Text>
        </View>
      );
    case 'chart': {
      const labels = (p.labels as string[]) ?? [];
      const datasets = (p.datasets as Array<{ label: string; values: number[] }>) ?? [];
      const columns = ['Label', ...datasets.map((ds) => ds.label)];
      const rows = labels.map((label, li) => [label, ...datasets.map((ds) => ds.values[li] ?? '—')]);
      return (
        <View key={block.id} style={wrap}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          <Text style={pdfStyles.metaText}>
            {[p.chartType === 'line' ? 'Liniendiagramm' : 'Balkendiagramm', p.xAxisLabel, p.yAxisLabel]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {toPdfDataTable(columns, rows)}
        </View>
      );
    }
    default:
      return (
        <View key={block.id} style={wrap}>
          <PdfSectionHeader title={block.type} />
          <PdfSectionIntro text={`Block-Typ „${block.type}" — Daten im Web-Report.`} />
        </View>
      );
  }
}

export function buildPlexonAssistantReportPages(payload: PlexonAssistantReportPayload): React.ReactElement[] {
  let pages: React.ReactElement[] = [];

  pages.push(
    <PdfCoverPage key="cover">
      <PdfProjectReportCoverContent
        eyebrow={pdfCoverEyebrow('PLEXON Assistent')}
        title={payload.title}
        projectLine="Kuratierter Session-Report"
        leadText={null}
      />
    </PdfCoverPage>
  );

  const blocks = payload.uiLayout.blocks ?? [];
  const chunkSize = 3;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const slice = blocks.slice(i, i + chunkSize);
    pages = pushContent(
      pages,
      `content-${i}`,
      <View>
        {i === 0 ? <PdfLeadText>Automatisch generiert aus ausgewählten Assistenten-Inhalten.</PdfLeadText> : null}
        {slice.map((block, idx) => renderBlock(block, idx))}
      </View>
    );
  }

  return applyReportFooters(pages, {
    title: payload.title,
    locale: payload.locale ?? 'de',
    skipFooter: (_page, index) => index === 0,
  });
}

export function PlexonAssistantReportDocument({ payload }: { payload: PlexonAssistantReportPayload }) {
  const pages = buildPlexonAssistantReportPages(payload);
  return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{pages}</Document>;
}
