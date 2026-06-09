'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

function splitPdfParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(Boolean).map((chunk) => chunk.trim());
}

export function pdfInterpretationTexts(...texts: Array<string | null | undefined>): string[] {
    return texts.filter((text): text is string => Boolean(text?.trim()));
}

export function PdfMetricInterpretationGroup({ texts }: { texts: string[] }) {
    const entries = pdfInterpretationTexts(...texts);
    if (entries.length === 0) return null;

    return (
        <View style={pdfStyles.metricInterpretationGroup}>
            {entries.map((text, entryIndex) => (
                <View
                    key={entryIndex}
                    style={entryIndex > 0 ? pdfStyles.metricInterpretationEntry : undefined}
                >
                    {splitPdfParagraphs(text).map((paragraph, paragraphIndex) => (
                        <View
                            key={paragraphIndex}
                            style={
                                paragraphIndex > 0 ? pdfStyles.metricInterpretationParagraph : undefined
                            }
                        >
                            <Text style={pdfStyles.metricInterpretationText}>{paragraph}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

/** @deprecated use PdfMetricInterpretationGroup */
export function PdfMetricInterpretationBlock({ text }: { label?: string; text: string }) {
    return <PdfMetricInterpretationGroup texts={[text]} />;
}

export function PdfRecommendationRow({
    title,
    description,
    style,
}: {
    title: string;
    description: string;
    style?: object | object[];
}) {
    return (
        <View style={[pdfStyles.recommendationRow, ...(style ? (Array.isArray(style) ? style : [style]) : [])]}>
            <View style={pdfStyles.recommendationTitleBlock}>
                <Text style={pdfStyles.recommendationTitle}>{title}</Text>
            </View>
            <View style={pdfStyles.recommendationDescBlock}>
                <Text style={pdfStyles.recommendationDesc}>{description}</Text>
            </View>
        </View>
    );
}
