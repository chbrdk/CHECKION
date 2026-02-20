/**
 * Transforms DomainScanResult graph data into the format expected by react-force-graph-2d.
 * Keeps the same semantic (nodes = pages, links = references) with normalized ids for linking.
 */

import type { DomainScanResult } from '@/lib/types';

export type DomainGraph = DomainScanResult['graph'];

export interface ForceGraphNode {
    id: string;
    url: string;
    score: number;
    depth: number;
    status: 'ok' | 'error';
    title?: string | null;
    /** Used by force-graph for node size (optional). */
    val?: number;
}

export interface ForceGraphLink {
    source: string;
    target: string;
}

export interface ForceGraphData {
    nodes: ForceGraphNode[];
    links: ForceGraphLink[];
}

/**
 * Normalize a URL or id to a canonical form (origin + path without trailing slash).
 * Used to match link source/target to node ids.
 */
export function normalizeGraphId(urlOrId: string): string {
    try {
        const u = new URL(urlOrId);
        return u.origin + (u.pathname.replace(/\/$/, '') || '/');
    } catch {
        return urlOrId;
    }
}

/**
 * Get path depth from URL (number of path segments).
 */
export function pathDepthFromUrl(url: string): number {
    try {
        const path = new URL(url).pathname.replace(/\/$/, '');
        return path ? path.split('/').filter(Boolean).length : 0;
    } catch {
        return 0;
    }
}

const DEFAULT_NODE_VAL = 6;

/**
 * Transform domain scan graph to force-graph format.
 * - Nodes keep id, url, score, depth, status, title and get normalized id; val is set for node size.
 * - Links use normalized source/target ids; links whose source or target are not in the node set are dropped.
 */
export function domainGraphToForceData(data: DomainGraph | null | undefined): ForceGraphData {
    if (!data?.nodes?.length) {
        return { nodes: [], links: [] };
    }

    const idSet = new Set<string>();
    const nodes: ForceGraphNode[] = data.nodes.map((n) => {
        const id = normalizeGraphId(n.id);
        idSet.add(id);
        const depth = n.depth ?? pathDepthFromUrl(n.url);
        return {
            id,
            url: n.url,
            score: n.score,
            depth,
            status: n.status,
            title: n.title ?? null,
            val: DEFAULT_NODE_VAL,
        };
    });

    const links: ForceGraphLink[] = data.links
        .map((l) => ({
            source: normalizeGraphId(l.source),
            target: normalizeGraphId(l.target),
        }))
        .filter((l) => l.source !== l.target && idSet.has(l.source) && idSet.has(l.target));

    return { nodes, links };
}

/**
 * Filter force graph data by optional score range, depth range, status, and search (url/title).
 * Nodes that don't match are removed; links between remaining nodes are kept.
 */
export function filterForceGraphData(
    data: ForceGraphData,
    options: {
        scoreMin?: number;
        scoreMax?: number;
        depthMin?: number;
        depthMax?: number;
        status?: 'ok' | 'error';
        search?: string;
    }
): ForceGraphData {
    const { scoreMin, scoreMax, depthMin, depthMax, status, search } = options;
    const hasFilter =
        scoreMin != null ||
        scoreMax != null ||
        depthMin != null ||
        depthMax != null ||
        status != null ||
        (search != null && search.trim() !== '');

    if (!hasFilter) return data;

    const searchLower = search?.trim().toLowerCase() ?? '';
    const nodeSet = new Set<string>();

    const nodes = data.nodes.filter((n) => {
        if (scoreMin != null && n.score < scoreMin) return false;
        if (scoreMax != null && n.score > scoreMax) return false;
        if (depthMin != null && n.depth < depthMin) return false;
        if (depthMax != null && n.depth > depthMax) return false;
        if (status != null && n.status !== status) return false;
        if (searchLower) {
            const inUrl = n.url.toLowerCase().includes(searchLower);
            const inTitle = (n.title ?? '').toLowerCase().includes(searchLower);
            if (!inUrl && !inTitle) return false;
        }
        nodeSet.add(n.id);
        return true;
    });

    const links = data.links.filter(
        (l) => nodeSet.has(l.source) && nodeSet.has(l.target)
    );

    return { nodes, links };
}
