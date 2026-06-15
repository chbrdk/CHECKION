/**
 * Theme diff between consecutive domain scans (aggregated + per-page signals).
 */

import { getDomainScanAggregatedPageClassification } from '@/lib/db/domain-scan-lineage-queries';
import type { DomainPageDiffInput, DomainThemeChange } from '@/lib/domain-scan-diff';
import { normalizeDiffUrl } from '@/lib/domain-scan-diff';
import type { AggregatedPageClassification, AggregatedPageClassificationTheme } from '@/lib/types';

const SCORE_DELTA_THRESHOLD = 5;

function themeKey(theme: AggregatedPageClassificationTheme): string {
    return (theme.themeTagKey ?? theme.tag).trim().toLowerCase().replace(/\s+/g, ' ');
}

function themeSnapshot(theme: AggregatedPageClassificationTheme) {
    return {
        score: theme.score,
        pageCount: theme.pageCount,
        maxTier: theme.maxTier,
        avgTier: theme.avgTier,
    };
}

function parseAggregatedPageClassification(raw: unknown): AggregatedPageClassification | null {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const agg = raw as AggregatedPageClassification;
    if (!Array.isArray(agg.topThemes)) return null;
    return agg;
}

function pageThemeKeys(page: DomainPageDiffInput): string[] {
    const tag = page.pageClassification?.primaryTag?.trim();
    if (!tag) return [];
    return [tag.trim().toLowerCase().replace(/\s+/g, ' ')];
}

export interface BuildDomainScanThemeDiffParams {
    userId: string;
    currentScanId: string;
    previousScanId: string;
    currentPages: DomainPageDiffInput[];
    previousPages: DomainPageDiffInput[];
}

export async function buildDomainScanThemeDiff(
    params: BuildDomainScanThemeDiffParams,
): Promise<DomainThemeChange[]> {
    const [currentRaw, previousRaw] = await Promise.all([
        getDomainScanAggregatedPageClassification(params.currentScanId, params.userId),
        getDomainScanAggregatedPageClassification(params.previousScanId, params.userId),
    ]);

    const currentAgg = parseAggregatedPageClassification(currentRaw);
    const previousAgg = parseAggregatedPageClassification(previousRaw);

    const currentThemes = new Map<string, AggregatedPageClassificationTheme>();
    const previousThemes = new Map<string, AggregatedPageClassificationTheme>();

    for (const t of currentAgg?.topThemes ?? []) {
        currentThemes.set(themeKey(t), t);
    }
    for (const t of previousAgg?.topThemes ?? []) {
        previousThemes.set(themeKey(t), t);
    }

    const urlToCurrentThemes = new Map<string, Set<string>>();
    const urlToPreviousThemes = new Map<string, Set<string>>();

    for (const p of params.currentPages) {
        const url = normalizeDiffUrl(p.url);
        const keys = pageThemeKeys(p);
        if (keys.length === 0) continue;
        urlToCurrentThemes.set(url, new Set(keys));
    }
    for (const p of params.previousPages) {
        const url = normalizeDiffUrl(p.url);
        const keys = pageThemeKeys(p);
        if (keys.length === 0) continue;
        urlToPreviousThemes.set(url, new Set(keys));
    }

    const allKeys = new Set([...currentThemes.keys(), ...previousThemes.keys()]);
    const changes: DomainThemeChange[] = [];

    for (const key of allKeys) {
        const cur = currentThemes.get(key);
        const prev = previousThemes.get(key);

        const newPageUrls: string[] = [];
        const removedPageUrls: string[] = [];

        for (const [url, themes] of urlToCurrentThemes) {
            if (themes.has(key) && !urlToPreviousThemes.get(url)?.has(key)) {
                newPageUrls.push(url);
            }
        }
        for (const [url, themes] of urlToPreviousThemes) {
            if (themes.has(key) && !urlToCurrentThemes.get(url)?.has(key)) {
                removedPageUrls.push(url);
            }
        }

        if (cur && !prev) {
            changes.push({
                themeTag: cur.tag,
                themeTagKey: key,
                kind: 'new',
                current: themeSnapshot(cur),
                ...(newPageUrls.length > 0 ? { newPageUrls } : {}),
            });
            continue;
        }

        if (!cur && prev) {
            changes.push({
                themeTag: prev.tag,
                themeTagKey: key,
                kind: 'removed',
                previous: themeSnapshot(prev),
                ...(removedPageUrls.length > 0 ? { removedPageUrls } : {}),
            });
            continue;
        }

        if (cur && prev) {
            const scoreDelta = cur.score - prev.score;
            const tierChanged = cur.maxTier !== prev.maxTier;

            let kind: DomainThemeChange['kind'] | null = null;
            if (tierChanged) {
                kind = 'tier_changed';
            } else if (scoreDelta >= SCORE_DELTA_THRESHOLD) {
                kind = 'strengthened';
            } else if (scoreDelta <= -SCORE_DELTA_THRESHOLD) {
                kind = 'weakened';
            } else if (newPageUrls.length > 0 || removedPageUrls.length > 0) {
                kind = scoreDelta >= 0 ? 'strengthened' : 'weakened';
            }

            if (kind) {
                changes.push({
                    themeTag: cur.tag,
                    themeTagKey: key,
                    kind,
                    previous: themeSnapshot(prev),
                    current: themeSnapshot(cur),
                    ...(newPageUrls.length > 0 ? { newPageUrls } : {}),
                    ...(removedPageUrls.length > 0 ? { removedPageUrls } : {}),
                });
            }
        }
    }

    changes.sort((a, b) => {
        const kindOrder = (k: DomainThemeChange['kind']) => {
            switch (k) {
                case 'new':
                    return 0;
                case 'strengthened':
                    return 1;
                case 'tier_changed':
                    return 2;
                case 'weakened':
                    return 3;
                case 'removed':
                    return 4;
                default:
                    return 5;
            }
        };
        const o = kindOrder(a.kind) - kindOrder(b.kind);
        if (o !== 0) return o;
        return (b.current?.score ?? 0) - (a.current?.score ?? 0);
    });

    return changes;
}
