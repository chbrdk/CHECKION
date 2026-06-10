/**
 * Project setup / research context for report agents.
 * Combines persisted project fields + last research snapshot + tracking gaps.
 */

import type { GeoQueriesByMarket } from '@/lib/geo-queries-by-market';
import { projectResearchResultSchema, type ProjectResearchResult } from '@/lib/research/schema';
import type { RankingFacts } from '@/lib/project-report/types';

export interface ProjectSetupGaps {
    /** Suggested SEO keywords from research not yet in rank tracking. */
    untrackedSuggestedKeywords: string[];
    /** Suggested GEO queries from research not yet on the project. */
    missingGeoQueries: string[];
    noValueProposition: boolean;
    noCompetitors: boolean;
    noGeoQueries: boolean;
    noRankTracking: boolean;
    noResearchSnapshot: boolean;
}

export interface ProjectSetupContext {
    available: boolean;
    valueProposition: string | null;
    industry: string | null;
    tags: string[];
    targetGroups: string[];
    configuredCompetitors: string[];
    geoQueries: string[];
    geoQueriesByMarket: Record<string, string[]> | null;
    suggestedSeoKeywords: string[];
    trackedKeywords: string[];
    gaps: ProjectSetupGaps;
    researchCapturedAt: string | null;
}

function normKeyword(s: string): string {
    return s.trim().toLowerCase();
}

function uniqueStrings(items: string[], max: number): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
        const t = item.trim();
        if (!t) continue;
        const key = normKeyword(t);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(t);
        if (out.length >= max) break;
    }
    return out;
}

function flattenSuggestedSeoKeywords(snapshot: ProjectResearchResult | null): string[] {
    if (!snapshot) return [];
    const fromFlat = snapshot.seoKeywords ?? [];
    const fromMarkets = snapshot.seoKeywordsByMarket
        ? Object.values(snapshot.seoKeywordsByMarket).flat()
        : [];
    return uniqueStrings([...fromFlat, ...fromMarkets], 20);
}

function flattenSuggestedGeoQueries(snapshot: ProjectResearchResult | null): string[] {
    if (!snapshot) return [];
    const fromFlat = snapshot.geoQueries ?? [];
    const fromMarkets = snapshot.geoQueriesByMarket
        ? Object.values(snapshot.geoQueriesByMarket).flat()
        : [];
    return uniqueStrings([...fromFlat, ...fromMarkets], 20);
}

export function emptyProjectSetupContext(): ProjectSetupContext {
    return buildProjectSetupContext({
        valueProposition: null,
        industry: null,
        tags: [],
        competitors: [],
        geoQueries: [],
        geoQueriesByMarket: {},
        researchSnapshot: null,
        researchCapturedAt: null,
        rankings: null,
    });
}

export function parseProjectResearchSnapshot(raw: unknown): ProjectResearchResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const parsed = projectResearchResultSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}

export function buildProjectSetupContext(input: {
    valueProposition: string | null;
    industry: string | null;
    tags: string[];
    competitors: string[];
    geoQueries: string[];
    geoQueriesByMarket: GeoQueriesByMarket;
    researchSnapshot: ProjectResearchResult | null;
    researchCapturedAt: string | null;
    rankings: RankingFacts | null;
}): ProjectSetupContext {
    const configuredGeo = uniqueStrings(input.geoQueries, 30);
    const configuredCompetitors = uniqueStrings(input.competitors, 15);
    const trackedKeywords = uniqueStrings(
        input.rankings?.topKeywords.map((k) => k.keyword) ?? [],
        20
    );
    const trackedSet = new Set(trackedKeywords.map(normKeyword));
    const configuredGeoSet = new Set(configuredGeo.map(normKeyword));

    const suggestedSeoKeywords = flattenSuggestedSeoKeywords(input.researchSnapshot);
    const suggestedGeo = flattenSuggestedGeoQueries(input.researchSnapshot);

    const untrackedSuggestedKeywords = suggestedSeoKeywords.filter(
        (kw) => !trackedSet.has(normKeyword(kw))
    );
    const missingGeoQueries = suggestedGeo.filter((q) => !configuredGeoSet.has(normKeyword(q)));

    const geoByMarket =
        input.geoQueriesByMarket && Object.keys(input.geoQueriesByMarket).length > 0
            ? input.geoQueriesByMarket
            : null;

    const targetGroups = uniqueStrings(input.researchSnapshot?.targetGroups ?? [], 10);

    const gaps: ProjectSetupGaps = {
        untrackedSuggestedKeywords: untrackedSuggestedKeywords.slice(0, 8),
        missingGeoQueries: missingGeoQueries.slice(0, 8),
        noValueProposition: !input.valueProposition?.trim(),
        noCompetitors: configuredCompetitors.length === 0,
        noGeoQueries: configuredGeo.length === 0,
        noRankTracking: trackedKeywords.length === 0,
        noResearchSnapshot: input.researchSnapshot == null,
    };

    const hasContent =
        Boolean(input.valueProposition?.trim()) ||
        Boolean(input.industry?.trim()) ||
        configuredCompetitors.length > 0 ||
        configuredGeo.length > 0 ||
        trackedKeywords.length > 0 ||
        targetGroups.length > 0 ||
        suggestedSeoKeywords.length > 0;

    return {
        available: hasContent,
        valueProposition: input.valueProposition?.trim() || null,
        industry: input.industry?.trim() || null,
        tags: input.tags.slice(0, 8),
        targetGroups,
        configuredCompetitors,
        geoQueries: configuredGeo.slice(0, 12),
        geoQueriesByMarket: geoByMarket,
        suggestedSeoKeywords: suggestedSeoKeywords.slice(0, 15),
        trackedKeywords,
        gaps,
        researchCapturedAt: input.researchCapturedAt,
    };
}

/** Trimmed payload for LLM agents (token-safe). */
export function slimProjectSetupForAgent(setup: ProjectSetupContext): Record<string, unknown> | null {
    if (!setup.available) return null;
    const out: Record<string, unknown> = {};
    if (setup.valueProposition) out.valueProposition = setup.valueProposition;
    if (setup.industry) out.industry = setup.industry;
    if (setup.targetGroups.length) out.targetGroups = setup.targetGroups;
    if (setup.configuredCompetitors.length) out.competitors = setup.configuredCompetitors;
    if (setup.geoQueries.length) out.geoQueriesConfigured = setup.geoQueries;
    if (setup.trackedKeywords.length) {
        out.trackedKeywords = setup.trackedKeywords.slice(0, 12);
        out.trackedKeywordCount = setup.trackedKeywords.length;
    }
    if (setup.suggestedSeoKeywords.length) {
        out.suggestedSeoKeywords = setup.suggestedSeoKeywords.slice(0, 12);
    }
    const gapNotes: string[] = [];
    if (setup.gaps.untrackedSuggestedKeywords.length) {
        out.keywordsNotYetTracked = setup.gaps.untrackedSuggestedKeywords;
        gapNotes.push('rank_tracking_gap');
    }
    if (setup.gaps.missingGeoQueries.length) {
        out.geoQueriesNotYetConfigured = setup.gaps.missingGeoQueries;
        gapNotes.push('geo_setup_gap');
    }
    if (setup.gaps.noRankTracking) gapNotes.push('no_rank_tracking');
    if (setup.gaps.noGeoQueries) gapNotes.push('no_geo_queries');
    if (gapNotes.length) out.setupGapKinds = gapNotes;
    return Object.keys(out).length ? out : null;
}
