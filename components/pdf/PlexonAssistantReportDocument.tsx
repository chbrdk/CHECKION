import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { PlexonAssistantReportPayload, PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import { PdfCoverPage, PdfContentPage, PdfLeadText, PdfStatGrid, applyReportFooters, contentSideForIndex, PDF_DOCUMENT_PAGE_LAYOUT } from '@/components/pdf/shared/PdfLayout';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfProjectReportCoverContent } from '@/components/pdf/shared/PdfCoverContent';

function pushContent(pages: React.ReactElement[], key: string, children: React.ReactNode): React.ReactElement[] {
  const side = contentSideForIndex(pages.length);
  return [...pages, <PdfContentPage key={key} side={side}>{children}</PdfContentPage>];
}

function blockTitle(props: Record<string, unknown>): string | null {
  return typeof props.title === 'string' && props.title.trim() ? props.title.trim() : null;
}

function renderBlock(block: PlexonUiBlock, index: number): React.ReactNode {
  const p = block.props;
  switch (block.type) {
    case 'text':
      return (
        <View key={block.id} style={index > 0 ? { marginTop: 8 } : undefined}>
          <Text style={pdfStyles.bodyText}>{String(p.markdown ?? '')}</Text>
        </View>
      );
    case 'alert':
      return (
        <View key={block.id} style={pdfStyles.cardBox}>
          {blockTitle(p) ? <Text style={pdfStyles.subsectionTitle}>{blockTitle(p)}</Text> : null}
          <Text style={pdfStyles.bodyText}>{String(p.message ?? '')}</Text>
        </View>
      );
    case 'metric_grid': {
      const items = (p.items as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
      return (
        <View key={block.id}>
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
      const items = (p.items as Array<{ title: string; description: string }>) ?? [];
      return (
        <View key={block.id}>
          <PdfSectionHeader title={blockTitle(p) ?? 'Erkenntnisse'} />
          {items.map((item, i) => (
            <PdfRecommendationRow key={i} title={item.title} description={item.description} />
          ))}
        </View>
      );
    }
    case 'recommendation_list': {
      const items = (p.items as Array<{ title: string; description?: string; priority?: number }>) ?? [];
      return (
        <View key={block.id}>
          <PdfSectionHeader title={blockTitle(p) ?? 'Handlungsempfehlungen'} />
          {items.map((item, i) => (
            <PdfRecommendationRow
              key={i}
              title={item.priority != null ? `[P${item.priority}] ${item.title}` : item.title}
              description={item.description ?? ''}
            />
          ))}
        </View>
      );
    }
    case 'key_value_list': {
      const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
      return (
        <View key={block.id}>
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
        <View key={block.id}>
          {blockTitle(p) ? <PdfSectionHeader title={blockTitle(p)!} /> : null}
          <Text style={pdfStyles.metaText}>{cols.join(' · ')}</Text>
          {rows.slice(0, 20).map((row, ri) => (
            <Text key={ri} style={pdfStyles.bodyText}>
              {row.map((c) => c ?? '—').join(' · ')}
            </Text>
          ))}
        </View>
      );
    }
    default:
      return (
        <View key={block.id}>
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
