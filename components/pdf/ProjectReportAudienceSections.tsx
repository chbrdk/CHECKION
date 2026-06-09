'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { AudienceFitLevel, AudienceReportOverlay } from '@/lib/project-report/types';
import type { ProjectReportLocale } from '@/lib/project-report/types';
import { formatAudiencePersonasPdfCaption, type ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    chunkPersonasForPdfPages,
    PDF_AUDIENCE_GEO_MATCH_LIMIT,
    PDF_AUDIENCE_PERSONA_INSIGHT_LIMIT,
    rankPersonaInsightsForPdf,
    selectDistinctPersonasForPdf,
} from '@/lib/project-report/audience-pdf-personas';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';
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

function PersonaPillarStrip({
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
        <View style={pdfStyles.personaPillarStrip}>
            {persona.pillars.map((pillar) => (
                <Text
                    key={pillar.pillar}
                    style={[
                        pdfStyles.personaPillarChip,
                        { color: fitColor(pillar.level) },
                    ]}
                >
                    {pillarLabels[pillar.pillar] ?? pillar.pillar}:{' '}
                    {pillar.score != null ? pillar.score : '–'} · {fitLabel(pillar.level, labels)}
                </Text>
            ))}
        </View>
    );
}

function PersonaInsightsBlock({
    insights,
}: {
    insights: AudienceReportOverlay['personas'][number]['insights'];
}) {
    const ranked = rankPersonaInsightsForPdf(insights, PDF_AUDIENCE_PERSONA_INSIGHT_LIMIT);
    if (ranked.length === 0) return null;

    return (
        <View style={pdfStyles.personaInsightsBlock}>
            {ranked.map((insight) => (
                <Text key={insight.id} style={pdfStyles.personaInsightText} wrap>
                    <Text style={pdfStyles.personaInsightTitle}>{insight.title}. </Text>
                    {insight.description}
                </Text>
            ))}
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
    const topGeo = persona.geoQuestionMatches[0];

    return (
        <View
            wrap={false}
            style={isFirst ? { ...pdfStyles.personaCard, marginTop: 0 } : pdfStyles.personaCard}
        >
            <View wrap={false} style={pdfStyles.personaCardHeader}>
                <View style={pdfStyles.personaCardIdentity}>
                    <Text style={pdfStyles.personaCardName}>{persona.personaName}</Text>
                    <Text style={pdfStyles.personaCardSubtitle} wrap>
                        {persona.targetGroupName ?? '–'}
                        {persona.headline ? ` · ${persona.headline}` : ''}
                    </Text>
                </View>
                <Text style={[pdfStyles.personaCardFit, { color: fitColor(persona.overallFit) }]}>
                    {fitLabel(persona.overallFit, labels)}
                </Text>
            </View>

            {persona.personaPerspective ? (
                <Text style={[pdfStyles.metaText, { fontSize: 6.5, marginBottom: 3 }]} wrap>
                    {persona.personaPerspective}
                </Text>
            ) : null}

            <PersonaPillarStrip persona={persona} labels={labels} />
            <PersonaInsightsBlock insights={persona.insights} />

            {topGeo ? (
                <Text style={pdfStyles.personaGeoMatchText} wrap>
                    GEO: {topGeo.queryText}
                    {topGeo.latestPosition != null ? ` (#${topGeo.latestPosition})` : ''}
                    {persona.geoQuestionMatches.length > PDF_AUDIENCE_GEO_MATCH_LIMIT
                        ? ` (+${persona.geoQuestionMatches.length - PDF_AUDIENCE_GEO_MATCH_LIMIT})`
                        : ''}
                </Text>
            ) : null}
        </View>
    );
}

export function buildAudienceReportPages(
    audience: AudienceReportOverlay,
    labels: ProjectReportPdfLabels,
    startPageIndex: number,
    locale: ProjectReportLocale = 'de'
): React.ReactElement[] {
    if (!audience.available || audience.personas.length === 0) return [];

    const selected = selectDistinctPersonasForPdf(audience.personas);
    const personaChunks = chunkPersonasForPdfPages(selected);
    const introSide = contentSideForIndex(startPageIndex);

    const pages: React.ReactElement[] = [
        <PdfContentPage key="audience-intro" side={introSide}>
            <PdfSectionHeader outlineId="audience" title={labels.audienceReality} chapter="ux" />
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
    ];

    personaChunks.forEach((chunk, chunkIndex) => {
        const side = contentSideForIndex(startPageIndex + 1 + chunkIndex);
        const pageKey = chunkIndex === 0 ? 'audience-personas' : `audience-personas-${chunkIndex + 1}`;

        pages.push(
            <PdfContentPage key={pageKey} side={side}>
                {chunkIndex === 0 ? (
                    <>
                        <PdfSectionHeader
                            outlineId="audience.personas"
                            title={labels.audiencePersonas}
                            chapter="ux"
                        />
                        <Text style={[pdfStyles.metaText, { marginBottom: 8 }]}>
                            {formatAudiencePersonasPdfCaption(
                                locale,
                                selected.length,
                                audience.personas.length,
                                labels.audienceMorePersonas
                            )}
                        </Text>
                    </>
                ) : null}
                {chunk.map((persona, index) => (
                    <PersonaAudienceCard
                        key={persona.personaId}
                        persona={persona}
                        labels={labels}
                        isFirst={chunkIndex === 0 && index === 0}
                    />
                ))}
            </PdfContentPage>
        );
    });

    return pages;
}
