'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

export function PdfMetricInterpretationBlock({ label, text }: { label: string; text: string }) {
    return (
        <View style={pdfStyles.metricInterpretationBlock}>
            <Text style={pdfStyles.metricInterpretationLabel}>{label}</Text>
            <Text style={pdfStyles.metricInterpretationText}>{text}</Text>
        </View>
    );
}
