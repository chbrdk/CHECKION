import { describe, it, expect } from 'vitest';
import {
    classifyTopicOverlapRow,
    countPositionedKeywords,
    formatCompetitiveInsightKind,
    hasSeoRollupData,
    prioritizeTopicOverlapRows,
    filterScanChangesForPdf,
    shouldShowRankingKeywordChart,
    stripPdfEvidenceMarkers,
} from '@/lib/project-report/pdf-competitive-display';

describe('pdf-competitive-display', () => {
    it('strips inline evidence markers', () => {
        expect(stripPdfEvidenceMarkers('Text (ev-domain-score)')).toBe('Text');
        expect(stripPdfEvidenceMarkers('Ends with ev-topic-overlap-x')).toBe('Ends with');
    });

    it('localizes competitive insight kinds', () => {
        expect(formatCompetitiveInsightKind('topic_gap', 'de')).toBe('Themen-Lücke');
        expect(formatCompetitiveInsightKind('gap', 'en')).toBe('Gap');
    });

    it('requires at least three positioned keywords for ranking chart', () => {
        const keywords = [
            { position: 1 },
            { position: 2 },
            { position: null },
            { position: null },
        ];
        expect(countPositionedKeywords(keywords)).toBe(2);
        expect(shouldShowRankingKeywordChart(keywords)).toBe(false);
        expect(shouldShowRankingKeywordChart([...keywords, { position: 5 }])).toBe(true);
    });

    it('detects empty seo rollup', () => {
        expect(hasSeoRollupData(null)).toBe(false);
        expect(
            hasSeoRollupData({
                pagesMissingTitle: 0,
                pagesMissingMeta: null,
                pagesMissingH1: null,
                duplicateTitles: null,
                brokenLinksCount: null,
                jsonLdPages: null,
            })
        ).toBe(false);
        expect(
            hasSeoRollupData({
                pagesMissingTitle: 3,
                pagesMissingMeta: null,
                pagesMissingH1: null,
                duplicateTitles: null,
                brokenLinksCount: null,
                jsonLdPages: null,
            })
        ).toBe(true);
    });

    it('prioritizes topic gaps before shared themes', () => {
        const rows = prioritizeTopicOverlapRows([
            {
                themeTag: 'Shared',
                themeTagKey: 'shared',
                own: { score: 100, pageCount: 10, maxTier: 3, avgTier: 2 },
                competitors: { 'a.de': { score: 80, pageCount: 5, maxTier: 2, avgTier: 2 } },
                presentOn: ['own', 'a.de'],
                evidenceId: 'ev-1',
            },
            {
                themeTag: 'Gap',
                themeTagKey: 'gap',
                own: null,
                competitors: { 'a.de': { score: 50, pageCount: 2, maxTier: 2, avgTier: 2 } },
                presentOn: ['a.de'],
                evidenceId: 'ev-2',
            },
        ]);
        expect(classifyTopicOverlapRow(rows[0]!)).toBe('gap');
        expect(rows[0]!.themeTag).toBe('Gap');
    });

    it('filters scan changes for PDF by activity', () => {
        const rows = filterScanChangesForPdf([
            {
                domain: 'quiet.com',
                isOwn: false,
                previousScanId: 's1',
                currentScanId: 's2',
                scannedAt: null,
                previousScannedAt: null,
                summary: {
                    newCount: 0,
                    removedCount: 0,
                    unchangedCount: 5,
                    likelyUpdatedCount: 0,
                    totalCurrent: 5,
                    totalPrevious: 5,
                },
                highlights: [],
                topNewPages: [],
                topUpdatedPages: [],
                topNewThemes: [],
                evidenceId: 'ev-1',
            },
            {
                domain: 'rival.com',
                isOwn: false,
                previousScanId: 's1',
                currentScanId: 's2',
                scannedAt: null,
                previousScannedAt: null,
                summary: {
                    newCount: 3,
                    removedCount: 0,
                    unchangedCount: 10,
                    likelyUpdatedCount: 1,
                    totalCurrent: 14,
                    totalPrevious: 11,
                },
                highlights: [],
                topNewPages: [],
                topUpdatedPages: [],
                topNewThemes: [],
                evidenceId: 'ev-2',
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.domain).toBe('rival.com');
    });
});
