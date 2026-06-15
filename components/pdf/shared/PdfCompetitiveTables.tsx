'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type {
    CompetitorScoreComparison,
    CompetitorScanChangeFact,
    GeoCompetitiveDomainFact,
    RankKeywordDetailFact,
    TopicOverlapRow,
} from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    bestCompetitorForTheme,
    classifyTopicOverlapRow,
    formatGeoAvgPosition,
    formatGeoShareOfVoice,
    shortenPdfDomain,
} from '@/lib/project-report/pdf-competitive-display';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';

function formatScore(value: number | null | undefined): string {
    return value != null ? String(Math.round(value)) : '–';
}

function formatDelta(delta: number | null | undefined, isOwn: boolean): string {
    if (isOwn || delta == null || delta === 0) return '';
    const sign = delta > 0 ? '+' : '';
    return ` (${sign}${Math.round(delta)})`;
}

function formatLcp(value: number | null | undefined): string {
    return value != null ? String(Math.round(value)) : '–';
}

function formatWcagErrors(value: number | null | undefined): string {
    if (value == null) return '–';
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return String(value);
}

export function PdfCompetitiveScoreboardTable({
    rows,
    labels,
}: {
    rows: CompetitorScoreComparison[];
    labels: ProjectReportPdfLabels;
}) {
    return (
        <View style={pdfStyles.contentPanel}>
            <View style={pdfStyles.competitiveTableHeader}>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '24%' }]}>
                    {labels.geoDomain}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '11%' }]}>UX</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '11%' }]}>SEO</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '11%' }]}>GEO</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '11%' }]}>
                    {labels.audiencePillarRankings}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '16%' }]}>WCAG</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '16%' }]}>LCP</Text>
            </View>
            {rows.map((row) => (
                <View key={row.domain} style={pdfStyles.competitiveTableRow}>
                    <Text
                        style={[
                            pdfStyles.competitiveTableCell,
                            { width: '24%', fontWeight: 'bold' },
                            row.isOwn ? { color: pdfColors.brand } : {},
                        ]}
                        wrap
                    >
                        {shortenPdfDomain(row.domain)}
                        {row.isOwn ? ' *' : ''}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '11%' }]}>
                        {formatScore(row.domainScore)}
                        {formatDelta(row.domainScoreDeltaVsOwn, row.isOwn)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '11%' }]}>
                        {formatScore(row.seoOnPageScore)}
                        {formatDelta(row.seoDeltaVsOwn, row.isOwn)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '11%' }]}>
                        {formatScore(row.geoScore)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '11%' }]}>
                        {formatScore(row.rankingScore)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '16%' }]}>
                        {formatWcagErrors(row.wcagErrors)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '16%' }]}>
                        {formatLcp(row.avgLcp)}
                    </Text>
                </View>
            ))}
            <Text style={[pdfStyles.metaText, { marginTop: 4 }]}>* {labels.competitiveOwnDomainNote}</Text>
        </View>
    );
}

export function PdfTopicOverlapTable({
    rows,
    labels,
}: {
    rows: TopicOverlapRow[];
    labels: ProjectReportPdfLabels;
}) {
    if (rows.length === 0) return null;

    const statusLabel = (status: ReturnType<typeof classifyTopicOverlapRow>) => {
        if (status === 'gap') return labels.topicOverlapStatusGap;
        if (status === 'lead') return labels.topicOverlapStatusLead;
        return labels.topicOverlapStatusShared;
    };

    return (
        <View style={pdfStyles.contentPanel}>
            <View style={pdfStyles.competitiveTableHeader}>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '34%' }]}>
                    {labels.topicOverlapTheme}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '14%' }]}>
                    {labels.topicOverlapOwn}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '22%' }]}>
                    {labels.topicOverlapBestCompetitor}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '30%' }]}>
                    {labels.topicOverlapStatus}
                </Text>
            </View>
            {rows.map((row) => {
                const best = bestCompetitorForTheme(row);
                const status = classifyTopicOverlapRow(row);
                return (
                    <View key={row.themeTagKey} style={pdfStyles.competitiveTableRow}>
                        <Text style={[pdfStyles.competitiveTableCell, { width: '34%' }]} wrap>
                            {row.themeTag}
                        </Text>
                        <Text style={[pdfStyles.competitiveTableCell, { width: '14%' }]}>
                            {row.own?.score != null ? String(Math.round(row.own.score)) : '–'}
                        </Text>
                        <Text style={[pdfStyles.competitiveTableCell, { width: '22%' }]} wrap>
                            {best
                                ? `${shortenPdfDomain(best.domain)} (${Math.round(best.score)})`
                                : '–'}
                        </Text>
                        <Text style={[pdfStyles.competitiveTableCell, { width: '30%' }]}>
                            {statusLabel(status)}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

export function PdfGeoCompetitiveTable({
    domains,
    labels,
}: {
    domains: GeoCompetitiveDomainFact[];
    labels: ProjectReportPdfLabels;
}) {
    if (domains.length === 0) return null;

    return (
        <View style={[pdfStyles.contentPanel, { marginTop: 6 }]}>
            <View style={pdfStyles.competitiveTableHeader}>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '40%' }]}>
                    {labels.geoDomain}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '20%' }]}>
                    {labels.geoScore}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '20%' }]}>SoV</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '20%' }]}>
                    {labels.geoAvgPosition}
                </Text>
            </View>
            {domains.map((domain) => (
                <View key={domain.domain} style={pdfStyles.competitiveTableRow}>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '40%' }]} wrap>
                        {shortenPdfDomain(domain.domain)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '20%' }]}>
                        {formatScore(domain.score)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '20%' }]}>
                        {formatGeoShareOfVoice(domain.shareOfVoice)}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '20%' }]}>
                        {formatGeoAvgPosition(domain.avgPosition)}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export function PdfKeywordSerpTable({
    rows,
    labels,
}: {
    rows: RankKeywordDetailFact[];
    labels: ProjectReportPdfLabels;
}) {
    if (rows.length === 0) return null;

    return (
        <View style={[pdfStyles.contentPanel, { marginTop: 6 }]}>
            <View style={pdfStyles.competitiveTableHeader}>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '42%' }]}>
                    {labels.keywords}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '12%' }]}>Pos.</Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '46%' }]}>
                    {labels.serpLeader}
                </Text>
            </View>
            {rows.map((row) => (
                <View key={row.id} style={pdfStyles.competitiveTableRow}>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '42%' }]} wrap>
                        {row.keyword}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '12%' }]}>
                        {row.position != null ? `#${row.position}` : '–'}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '46%' }]} wrap>
                        {row.serpLeaderDomain
                            ? shortenPdfDomain(row.serpLeaderDomain)
                            : labels.noData}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export function PdfScanChangesTable({
    rows,
    labels,
}: {
    rows: CompetitorScanChangeFact[];
    labels: ProjectReportPdfLabels;
}) {
    if (rows.length === 0) return null;

    return (
        <View style={pdfStyles.contentPanel}>
            <View style={pdfStyles.competitiveTableHeader}>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '28%' }]}>
                    {labels.scanChangesDomain}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '18%' }]}>
                    {labels.scanChangesNewPages}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '18%' }]}>
                    {labels.scanChangesUpdatedPages}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '18%' }]}>
                    {labels.scanChangesNewThemes}
                </Text>
                <Text style={[pdfStyles.competitiveTableHeaderCell, { width: '18%' }]}>
                    Removed
                </Text>
            </View>
            {rows.map((row) => (
                <View key={row.evidenceId} style={pdfStyles.competitiveTableRow}>
                    <Text
                        style={[
                            pdfStyles.competitiveTableCell,
                            { width: '28%', fontWeight: 'bold' },
                            row.isOwn ? { color: pdfColors.brand } : {},
                        ]}
                        wrap
                    >
                        {shortenPdfDomain(row.domain)}
                        {row.isOwn ? ' *' : ''}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '18%' }]}>
                        {row.summary.newCount}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '18%' }]}>
                        {row.summary.likelyUpdatedCount}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '18%' }]}>
                        {row.topNewThemes.length}
                    </Text>
                    <Text style={[pdfStyles.competitiveTableCell, { width: '18%' }]}>
                        {row.summary.removedCount}
                    </Text>
                </View>
            ))}
        </View>
    );
}
