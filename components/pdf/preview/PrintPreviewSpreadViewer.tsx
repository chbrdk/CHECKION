'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDF_PAGE_HEIGHT_PT, PDF_PAGE_WIDTH_PT } from '@/lib/paths/pdf-print-tokens';
import { pdfPtToCssPx } from '@/lib/paths/pdf-print-preview';
import { pdfSpreadSlots, type PdfSpreadSlot } from '@/lib/paths/pdf-spread-groups';
import { loadPdfDocumentFromBlob } from '@/lib/paths/pdfjs-viewer';

const PAGE_ASPECT = PDF_PAGE_HEIGHT_PT / PDF_PAGE_WIDTH_PT;
const SPREAD_PAGE_WIDTH_PX = pdfPtToCssPx(PDF_PAGE_WIDTH_PT);

function PdfPageCanvas({
    pdf,
    pageNumber,
    widthPx,
}: {
    pdf: PDFDocumentProxy;
    pageNumber: number;
    widthPx: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let cancelled = false;
        let cancelRender: (() => void) | null = null;

        void (async () => {
            const page = await pdf.getPage(pageNumber);
            if (cancelled || !canvasRef.current) return;
            const base = page.getViewport({ scale: 1 });
            const scale = widthPx / base.width;
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const task = page.render({ canvasContext: ctx, viewport });
            cancelRender = () => task.cancel();
            await task.promise;
        })();

        return () => {
            cancelled = true;
            cancelRender?.();
        };
    }, [pdf, pageNumber, widthPx]);

    return (
        <Box
            component="canvas"
            ref={canvasRef}
            sx={{
                display: 'block',
                width: widthPx,
                height: widthPx * PAGE_ASPECT,
                bgcolor: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
        />
    );
}

function SpreadPageSlot({
    pdf,
    pageNumber,
    widthPx,
}: {
    pdf: PDFDocumentProxy;
    pageNumber: number | null;
    widthPx: number;
}) {
    if (pageNumber == null) {
        return (
            <Box
                sx={{
                    width: widthPx,
                    height: widthPx * PAGE_ASPECT,
                    flexShrink: 0,
                }}
            />
        );
    }
    return <PdfPageCanvas pdf={pdf} pageNumber={pageNumber} widthPx={widthPx} />;
}

function SpreadRow({
    pdf,
    slot,
    pageWidthPx,
}: {
    pdf: PDFDocumentProxy;
    slot: PdfSpreadSlot;
    pageWidthPx: number;
}) {
    const [left, right] = slot;
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 0,
                mb: 4,
            }}
        >
            <SpreadPageSlot pdf={pdf} pageNumber={left} widthPx={pageWidthPx} />
            <SpreadPageSlot pdf={pdf} pageNumber={right} widthPx={pageWidthPx} />
        </Box>
    );
}

/** Renders the react-pdf blob as `twoPageRight` spreads via pdf.js. */
export function PrintPreviewSpreadViewer({ blob }: { blob: Blob }) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void loadPdfDocumentFromBlob(blob)
            .then((doc) => {
                if (!cancelled) {
                    setPdf(doc);
                    setError(null);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'PDF spread preview failed');
                    setPdf(null);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [blob]);

    if (error) {
        return (
            <Box sx={{ p: 2, color: 'error.main', fontSize: 14 }} role="alert">
                {error}
            </Box>
        );
    }

    if (!pdf) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 480 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    const slots = pdfSpreadSlots(pdf.numPages);
    const pageWidthPx = Math.min(SPREAD_PAGE_WIDTH_PX, 420);

    return (
        <Box
            sx={{
                width: '100%',
                maxHeight: { md: 'calc(100vh - 120px)' },
                overflow: 'auto',
                py: 2,
            }}
        >
            {slots.map((slot, index) => (
                <SpreadRow
                    key={`spread-${index}-${slot[0] ?? 'x'}-${slot[1] ?? 'x'}`}
                    pdf={pdf}
                    slot={slot}
                    pageWidthPx={pageWidthPx}
                />
            ))}
        </Box>
    );
}
