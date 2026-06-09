'use client';

import React from 'react';
import { assignOutlineNumbers, type PdfOutlineEntry } from '@/lib/paths/pdf-chapter-numbering';

const PdfChapterNumberingContext = React.createContext<Map<string, string>>(new Map());

export function PdfChapterNumberingProvider({
    outline,
    children,
}: {
    outline: PdfOutlineEntry[];
    children: React.ReactNode;
}) {
    const numbers = React.useMemo(() => assignOutlineNumbers(outline), [outline]);
    return (
        <PdfChapterNumberingContext.Provider value={numbers}>{children}</PdfChapterNumberingContext.Provider>
    );
}

export function usePdfChapterNumber(outlineId: string | undefined): string | undefined {
    const numbers = React.useContext(PdfChapterNumberingContext);
    if (!outlineId) return undefined;
    return numbers.get(outlineId);
}
