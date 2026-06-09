'use client';

import { StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_FAMILIES } from '@/lib/paths/pdf-fonts';
import { PDF_TYPE_LINE_HEIGHT, PDF_TYPE_WEIGHT } from '@/lib/paths/pdf-typography';
import { PDF_RADIUS_BUTTON_PT } from '@/lib/paths/pdf-print-tokens';
import { pdfColors } from '@/components/pdf/shared/pdf-styles';

export const scanPdfStyles = StyleSheet.create({
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    pillText: {
        fontSize: 8,
        color: pdfColors.white,
    },
    issueRow: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: PDF_RADIUS_BUTTON_PT / 2,
        backgroundColor: pdfColors.white,
    },
    issueSeverity: {
        fontFamily: PDF_FONT_FAMILIES.headline,
        width: 52,
        fontSize: 7,
        fontWeight: PDF_TYPE_WEIGHT.bold,
    },
    issueContent: {
        flex: 1,
    },
    issueMessage: {
        fontSize: 8,
        fontWeight: PDF_TYPE_WEIGHT.regular,
        color: pdfColors.gray700,
        lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
    },
    kvInline: {
        flexDirection: 'row',
        marginBottom: 3,
        gap: 6,
    },
    kvKey: {
        width: 100,
        fontSize: 8,
        fontWeight: PDF_TYPE_WEIGHT.light,
        color: pdfColors.gray500,
        lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
    },
    kvVal: {
        flex: 1,
        fontSize: 8,
        fontWeight: PDF_TYPE_WEIGHT.regular,
        color: pdfColors.gray700,
        lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
    },
    outlineItem: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    outlineLevel: {
        fontFamily: PDF_FONT_FAMILIES.headline,
        width: 24,
        fontSize: 8,
        color: pdfColors.gray500,
    },
    outlineText: {
        flex: 1,
        fontSize: 9,
        color: pdfColors.gray700,
    },
});

export const scanSeverityColors: Record<string, string> = {
    error: pdfColors.error,
    warning: pdfColors.warning,
    notice: pdfColors.notice,
};
