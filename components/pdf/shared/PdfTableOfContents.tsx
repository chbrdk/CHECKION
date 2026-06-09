'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { PdfTocResolvedEntry } from '@/lib/paths/pdf-table-of-contents';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

export function PdfTableOfContentsRow({ entry }: { entry: PdfTocResolvedEntry }) {
    const indent = entry.level === 1 ? 12 : 0;
    return (
        <View wrap={false} style={[pdfStyles.tocRow, { paddingLeft: indent }]}>
            <Text wrap={false} style={pdfStyles.tocTitle}>
                {entry.title}
            </Text>
            <View style={pdfStyles.tocLeader} />
            <Text wrap={false} style={pdfStyles.tocPageNumber}>
                {entry.pageNumber}
            </Text>
        </View>
    );
}

export function PdfTableOfContents({ entries }: { entries: PdfTocResolvedEntry[] }) {
    return (
        <View>
            {entries.map((entry) => (
                <PdfTableOfContentsRow key={`${entry.title}-${entry.pageNumber}`} entry={entry} />
            ))}
        </View>
    );
}
