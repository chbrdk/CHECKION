'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

function splitPdfParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(Boolean).map((chunk) => chunk.trim());
}

export function PdfMetricInterpretationBlock({ label, text }: { label: string; text: string }) {
    const paragraphs = splitPdfParagraphs(text);
    return (
        <View style={pdfStyles.metricInterpretationBlock}>
            <Text style={pdfStyles.metricInterpretationLabel}>{label}</Text>
            {paragraphs.map((paragraph, index) => (
                <View key={index} style={index > 0 ? pdfStyles.metricInterpretationParagraph : undefined}>
                    <Text style={pdfStyles.metricInterpretationText}>{paragraph}</Text>
                </View>
            ))}
        </View>
    );
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
