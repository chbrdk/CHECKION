/**
 * Integration: react-pdf embed with Helvetica and German report text.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf, Document, Page, Text, StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_FAMILIES } from '@/lib/paths/pdf-fonts';

describe('pdf Helvetica render', () => {
    it('embeds umlauts and quotes in headline and body', async () => {
        const styles = StyleSheet.create({
            page: { padding: 24, fontFamily: PDF_FONT_FAMILIES.body, fontSize: 11 },
            headline: {
                fontFamily: PDF_FONT_FAMILIES.headline,
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 8,
            },
        });
        const doc = React.createElement(
            Document,
            null,
            React.createElement(
                Page,
                { style: styles.page },
                React.createElement(
                    Text,
                    { style: styles.headline },
                    'Kapitel 06 — Zielgruppen & „Übersicht“'
                ),
                React.createElement(
                    Text,
                    null,
                    'WCAG/SEO/GEO · „äöüß“ · model: gpt-4 citation_score: 0.82'
                )
            )
        );
        await expect(pdf(doc).toBuffer()).resolves.toBeTruthy();
    });
});
