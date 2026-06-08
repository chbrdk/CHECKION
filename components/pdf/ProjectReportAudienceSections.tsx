'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { AudienceFitLevel, AudienceReportOverlay } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfSectionHeader } from '@/components/pdf/shared/PdfPrimitives';
import { PdfContentPage, PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';

function fitLabel(level: AudienceFitLevel, labels: ProjectReportPdfLabels): string {
    return labels.audienceFitLabels[level];
}

function fitColor(level: AudienceFitLevel): string {
    switch (level) {
        case 'strong':
            return pdfColors.success;
        case 'mixed':
            return pdfColors.warning;
        case 'weak':
            return pdfColors.error;
        default:
            return pdfColors.gray500;
    }
}

function PillarRow({
    pillar,
    level,
    score,
    labels,
}: {
    pillar: string;
    level: AudienceFitLevel;
    score: number | null;
    labels: ProjectReportPdfLabels;
}) {
    return (
        <View style={pdfStyles.geoQuestionTableRow}>
            <Text style={[pdfStyles.geoQuestionCell, { width: '28%' }]}>{pillar}</Text>
            <Text style={[pdfStyles.geoQuestionCell, { width: '22%', color: fitColor(level), fontWeight: 'bold' }]}>
                {fitLabel(level, labels)}
            </Text>
            <Text style={[pdfStyles.geoQuestionCell, { width: '18%' }]}>
                {score != null ? String(score) : '–'}
            </Text>
        </View>
    );
}

function PersonaAudienceCard({
    persona,
    labels,
}: {
    persona: AudienceReportOverlay['personas'][number];
    labels: ProjectReportPdfLabels;
}) {
    const pillarLabels: Record<string, string> = {
        wcag: labels.domainScore,
        seo: 'SEO',
        geo: 'GEO',
        rankings: labels.audiencePillarRankings,
        performance: labels.audiencePillarPerformance,
        topics: labels.audiencePillarTopics,
    };

    return (
        <View style={pdfStyles.geoQuestionCard}>
            <View style={pdfStyles.geoQuestionHeaderRow}>
                <View style={{ flex: 1 }}>
                    <Text style={pdfStyles.geoQuestionTitle}>{persona.personaName}</Text>
                    <Text style={[pdfStyles.metaText, { fontSize: 7 }]}>
                        {persona.targetGroupName ?? '–'} · {persona.headline.slice(0, 80)}
                    </Text>
                </View>
                <Text style={[pdfStyles.geoQuestionMeta, { color: fitColor(persona.overallFit), fontWeight: 'bold' }]}>
                    {fitLabel(persona.overallFit, labels)}
                </Text>
            </View>

            {persona.painPoints.length > 0 ? (
                <Text style={[pdfStyles.metaText, { fontSize: 7, marginBottom: 3 }]}>
                    {labels.audiencePainPoints}: {persona.painPoints.slice(0, 3).join(' · ')}
                </Text>
            ) : null}

            <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 3 }]}>
                <View style={pdfStyles.geoQuestionTableHeader}>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '28%' }]}>
                        {labels.audiencePillar}
                    </Text>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '22%' }]}>
                        {labels.audienceFit}
                    </Text>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '18%' }]}>
                        {labels.audienceScore}
                    </Text>
                </View>
                {persona.pillars.map((p) => (
                    <PillarRow
                        key={p.pillar}
                        pillar={pillarLabels[p.pillar] ?? p.pillar}
                        level={p.level}
                        score={p.score}
                        labels={labels}
                    />
                ))}
            </View>

            {persona.geoQuestionMatches.length > 0 ? (
                <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 4 }]}>
                    <Text style={pdfStyles.geoQuestionSectionLabel}>{labels.audienceGeoMatches}</Text>
                    {persona.geoQuestionMatches.map((g, i) => (
                        <View key={i} style={pdfStyles.geoQuestionTableRow}>
                            <Text style={[pdfStyles.geoQuestionCell, { width: '72%' }]}>
                                {g.queryText.length > 70 ? `${g.queryText.slice(0, 68)}…` : g.queryText}
                            </Text>
                            <Text style={[pdfStyles.geoQuestionCell, { width: '28%', textAlign: 'right' }]}>
                                {g.latestPosition != null ? `#${g.latestPosition}` : '–'}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {persona.insights.slice(0, 2).map((ins) => (
                <View key={ins.id} style={[pdfStyles.recommendationRow, { marginTop: 4, paddingVertical: 4 }]}>
                    <Text style={pdfStyles.recommendationTitle}>{ins.title}</Text>
                    <Text style={pdfStyles.recommendationDesc}>{ins.description}</Text>
                </View>
            ))}
        </View>
    );
}

export function buildAudienceReportPages(
    audience: AudienceReportOverlay,
    labels: ProjectReportPdfLabels
): React.ReactElement[] {
    if (!audience.available || audience.personas.length === 0) return [];

    const pages: React.ReactElement[] = [];
    pages.push(
        <PdfContentPage key="audience">
            <PdfSectionHeader title={labels.audienceReality} chapter="ux" />
            {audience.audionProjectName ? (
                <Text style={[pdfStyles.metaText, { marginBottom: 6 }]}>
                    AUDION: {audience.audionProjectName}
                </Text>
            ) : null}
            {audience.summaryInsights.length > 0 ? (
                <PdfLeadText>{audience.summaryInsights.join('\n\n')}</PdfLeadText>
            ) : null}
            <PdfStatGrid
                items={[
                    {
                        label: labels.audienceTargetGroups,
                        value: String(audience.targetGroups.length),
                    },
                    {
                        label: labels.audiencePersonas,
                        value: String(audience.personas.length),
                    },
                    {
                        label: labels.audienceStrongFit,
                        value: String(audience.personas.filter((p) => p.overallFit === 'strong').length),
                    },
                    {
                        label: labels.audienceWeakFit,
                        value: String(audience.personas.filter((p) => p.overallFit === 'weak').length),
                    },
                ]}
            />
            {audience.personas.slice(0, 8).map((persona) => (
                <PersonaAudienceCard key={persona.personaId} persona={persona} labels={labels} />
            ))}
            {audience.personas.length > 8 ? (
                <Text style={pdfStyles.metaText}>
                    + {audience.personas.length - 8} {labels.audienceMorePersonas}
                </Text>
            ) : null}
        </PdfContentPage>
    );
    return pages;
}
