/**
 * Deterministic competitor scan change facts for reports (since previous deep scan).
 */

import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';
import type { CompetitiveInsightFact, CompetitorScanChangeFact } from '@/lib/project-report/types';

const MAX_PAGES = 8;
const MAX_THEMES = 8;

function slugDomain(domain: string): string {
    return domain.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function buildHighlights(
    domain: string,
    isOwn: boolean,
    diff: DomainScanDiffResult,
    evidenceId: string,
): CompetitiveInsightFact[] {
    const insights: CompetitiveInsightFact[] = [];
    const { summary, themes } = diff;

    if (!diff.previousScanId) return insights;

    const subject = isOwn ? 'Own site' : `Competitor ${domain}`;

    if (summary.newCount > 0) {
        insights.push({
            id: `scan-change-new-pages-${slugDomain(domain)}`,
            kind: isOwn ? 'parity' : 'gap',
            title: `${subject}: ${summary.newCount} new page${summary.newCount === 1 ? '' : 's'} since last scan`,
            description: `${summary.newCount} URL(s) appeared in the latest crawl that were not in the previous scan.`,
            evidenceId,
        });
    }

    if (summary.likelyUpdatedCount > 0) {
        insights.push({
            id: `scan-change-updated-pages-${slugDomain(domain)}`,
            kind: isOwn ? 'parity' : 'gap',
            title: `${subject}: ${summary.likelyUpdatedCount} page${summary.likelyUpdatedCount === 1 ? '' : 's'} likely updated`,
            description: `Header or content signals indicate changes on ${summary.likelyUpdatedCount} existing URL(s).`,
            evidenceId,
        });
    }

    const newThemes = (themes ?? []).filter((t) => t.kind === 'new');
    if (newThemes.length > 0) {
        const tags = newThemes.slice(0, 3).map((t) => t.themeTag).join(', ');
        insights.push({
            id: `scan-change-new-themes-${slugDomain(domain)}`,
            kind: isOwn ? 'topic_lead' : 'topic_gap',
            title: `${subject}: new topic${newThemes.length === 1 ? '' : 's'} — ${tags}`,
            description: `${newThemes.length} new theme(s) in aggregated page classification since the previous scan.`,
            evidenceId,
        });
    }

    const strengthened = (themes ?? []).filter((t) => t.kind === 'strengthened' || t.kind === 'tier_changed');
    for (const t of strengthened.slice(0, 2)) {
        const delta =
            t.current && t.previous ? t.current.score - t.previous.score : null;
        insights.push({
            id: `scan-change-theme-${t.themeTagKey}-${slugDomain(domain)}`,
            kind: isOwn ? 'topic_lead' : 'topic_gap',
            title: `${subject}: strengthened topic "${t.themeTag}"`,
            description:
                delta != null && delta !== 0
                    ? `Theme score changed by ${delta > 0 ? '+' : ''}${Math.round(delta)} points.`
                    : `Tier or coverage changed for this theme.`,
            evidenceId,
        });
    }

    return insights;
}

export interface BuildScanChangeFactInput {
    domain: string;
    isOwn: boolean;
    diff: DomainScanDiffResult;
    scannedAt: string | null;
    previousScannedAt: string | null;
}

export function buildCompetitorScanChangeFact(input: BuildScanChangeFactInput): CompetitorScanChangeFact {
    const evidenceId = `ev-scan-changes-${slugDomain(input.domain)}`;
    const topNewPages = input.diff.pages
        .filter((p) => p.kind === 'new')
        .map((p) => p.url)
        .slice(0, MAX_PAGES);
    const topUpdatedPages = input.diff.pages
        .filter((p) => p.kind === 'likely_updated')
        .map((p) => p.url)
        .slice(0, MAX_PAGES);
    const topNewThemes = (input.diff.themes ?? [])
        .filter((t) => t.kind === 'new' || t.kind === 'strengthened' || t.kind === 'tier_changed')
        .slice(0, MAX_THEMES)
        .map((t) => ({
            themeTag: t.themeTag,
            themeTagKey: t.themeTagKey,
            kind: t.kind,
            ...(t.newPageUrls?.length ? { newPageUrls: t.newPageUrls.slice(0, 5) } : {}),
        }));

    return {
        domain: input.domain,
        isOwn: input.isOwn,
        previousScanId: input.diff.previousScanId,
        currentScanId: input.diff.currentScanId,
        scannedAt: input.scannedAt,
        previousScannedAt: input.previousScannedAt,
        summary: input.diff.summary,
        highlights: buildHighlights(input.domain, input.isOwn, input.diff, evidenceId),
        topNewPages,
        topUpdatedPages,
        topNewThemes,
        evidenceId,
    };
}

export function buildCompetitorScanChangeFactsFromProjectChanges(
    ownDomain: string,
    data: {
        own: DomainScanDiffResult | null;
        competitors: Record<string, DomainScanDiffResult | null>;
    },
    timestamps: {
        own?: { current: string | null; previous: string | null };
        competitors?: Record<string, { current: string | null; previous: string | null }>;
    },
): CompetitorScanChangeFact[] {
    const facts: CompetitorScanChangeFact[] = [];

    if (data.own) {
        facts.push(
            buildCompetitorScanChangeFact({
                domain: ownDomain,
                isOwn: true,
                diff: data.own,
                scannedAt: timestamps.own?.current ?? null,
                previousScannedAt: timestamps.own?.previous ?? null,
            }),
        );
    }

    for (const [domain, diff] of Object.entries(data.competitors)) {
        if (!diff) continue;
        facts.push(
            buildCompetitorScanChangeFact({
                domain,
                isOwn: false,
                diff,
                scannedAt: timestamps.competitors?.[domain]?.current ?? null,
                previousScannedAt: timestamps.competitors?.[domain]?.previous ?? null,
            }),
        );
    }

    return facts.filter(
        (f) =>
            f.previousScanId != null &&
            (f.summary.newCount > 0 ||
                f.summary.likelyUpdatedCount > 0 ||
                f.summary.removedCount > 0 ||
                f.topNewThemes.length > 0),
    );
}
