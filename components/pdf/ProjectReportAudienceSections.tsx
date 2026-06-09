'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { AudienceFitLevel, AudienceReportOverlay } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfContentPage, PdfLeadText, PdfStatGrid, contentSideForIndex } from '@/components/pdf/shared/PdfLayout';

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
    note,
    labels,
}: {
    pillar: string;
    level: AudienceFitLevel;
    score: number | null;
    note?: string | null;
    labels: ProjectReportPdfLabels;
}) {
    return (
        <View style={pdfStyles.geoQuestionTableRow}>
            <Text style={[pdfStyles.geoQuestionCell, { width: '22%' }]}>{pillar}</Text>
            <Text style={[pdfStyles.geoQuestionCell, { width: '18%', color: fitColor(level), fontWeight: 'bold' }]}>
                {fitLabel(level, labels)}
            </Text>
            <Text style={[pdfStyles.geoQuestionCell, { width: '12%' }]}>
                {score != null ? String(score) : '–'}
            </Text>
            <Text style={[pdfStyles.geoQuestionCell, { width: '48%', fontSize: 7 }]}>
                {note?.trim() ? note : '–'}
            </Text>
        </View>
    );
}

function PersonaAudienceCard({
    persona,
    labels,
    isFirst = false,
}: {
    persona: AudienceReportOverlay['personas'][number];
    labels: ProjectReportPdfLabels;
    isFirst?: boolean;
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
        <View
            wrap={false}
            minPresenceAhead={72}
            style={isFirst ? { ...pdfStyles.personaCard, marginTop: 0 } : pdfStyles.personaCard}
        >
            <View wrap={false} style={pdfStyles.personaCardHeader}>
                <View style={pdfStyles.personaCardIdentity}>
                    <Text style={pdfStyles.personaCardName}>{persona.personaName}</Text>
                    <Text style={pdfStyles.personaCardSubtitle}>
                        {persona.targetGroupName ?? '–'} · {persona.headline.slice(0, 80)}
                    </Text>
                </View>
                <Text style={[pdfStyles.personaCardFit, { color: fitColor(persona.overallFit) }]}>
                    {fitLabel(persona.overallFit, labels)}
                </Text>
            </View>

            {persona.personaPerspective ? (
                <Text style={[pdfStyles.metaText, { fontSize: 7, marginBottom: 4, fontStyle: 'italic' }]}>
                    {labels.audiencePersonaPerspective}: {persona.personaPerspective}
                </Text>
            ) : null}

            {persona.painPoints.length > 0 ? (
                <Text style={[pdfStyles.metaText, { fontSize: 7, marginBottom: 3 }]}>
                    {labels.audiencePainPoints}: {persona.painPoints.slice(0, 3).join(' · ')}
                </Text>
            ) : null}

            <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 3 }]}>
                <View style={pdfStyles.geoQuestionTableHeader}>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '22%' }]}>
                        {labels.audiencePillar}
                    </Text>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '18%' }]}>
                        {labels.audienceFit}
                    </Text>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '12%' }]}>
                        {labels.audienceScore}
                    </Text>
                    <Text style={[pdfStyles.geoQuestionTableHeaderCell, { width: '48%' }]}>
                        {labels.audiencePillarNote}
                    </Text>
                </View>
                {persona.pillars.map((p) => (
                    <PillarRow
                        key={p.pillar}
                        pillar={pillarLabels[p.pillar] ?? p.pillar}
                        level={p.level}
                        score={p.score}
                        note={p.note}
                        labels={labels}
                    />
                ))}
            </View>

            {persona.subScores && persona.subScores.length > 0 ? (
                <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 4 }]}>
                    <Text style={pdfStyles.geoQuestionSectionLabel}>{labels.audienceSubScores}</Text>
                    {persona.subScores.map((s) => (
                        <View key={s.id} style={pdfStyles.geoQuestionTableRow}>
                            <Text style={[pdfStyles.geoQuestionCell, { width: '28%' }]}>{s.label}</Text>
                            <Text
                                style={[
                                    pdfStyles.geoQuestionCell,
                                    { width: '14%', color: fitColor(s.level), fontWeight: 'bold' },
                                ]}
                            >
                                {fitLabel(s.level, labels)}
                            </Text>
                            <Text style={[pdfStyles.geoQuestionCell, { width: '10%' }]}>{s.score}</Text>
                            <Text style={[pdfStyles.geoQuestionCell, { width: '48%', fontSize: 7 }]}>{s.note}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

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
                <PdfRecommendationRow
                    key={ins.id}
                    title={ins.title}
                    description={ins.description}
                    style={{ marginTop: 4, paddingVertical: 4 }}
                />
            ))}
        </View>
    );
}

export function buildAudienceReportPages(
    audience: AudienceReportOverlay,
    labels: ProjectReportPdfLabels,
    startPageIndex: number
): React.ReactElement[] {
    if (!audience.available || audience.personas.length === 0) return [];

    const introSide = contentSideForIndex(startPageIndex);
    const personasSide = contentSideForIndex(startPageIndex + 1);
    const personas = audience.personas.slice(0, 8);

    return [
        <PdfContentPage key="audience-intro" side={introSide}>
            <PdfSectionHeader title={labels.audienceReality} chapter="ux" />
            <PdfSectionIntro text={labels.chapterIntros.audience} />
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
        </PdfContentPage>,
        <PdfContentPage key="audience-personas" side={personasSide}>
            {personas.map((persona, index) => (
                <PersonaAudienceCard
                    key={persona.personaId}
                    persona={persona}
                    labels={labels}
                    isFirst={index === 0}
                />
            ))}
            {audience.personas.length > 8 ? (
                <Text style={pdfStyles.metaText}>
                    + {audience.personas.length - 8} {labels.audienceMorePersonas}
                </Text>
            ) : null}
        </PdfContentPage>,
    ];
}
