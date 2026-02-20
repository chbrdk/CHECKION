'use client';

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Box, TextField } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxButton } from '@msqdx/react';
import type { DomainScanResult } from '@/lib/types';
import {
    domainGraphToForceData,
    filterForceGraphData,
    type ForceGraphData,
    type ForceGraphNode,
} from '@/lib/domain-graph-data';

const ForceGraph2D = dynamic(
    () => import('react-force-graph-2d').then((m) => m.default),
    { ssr: false }
);

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

interface DomainGraphProps {
    data: DomainScanResult['graph'];
    width?: number;
    height?: number;
    /** Called when user selects a node (e.g. to scroll to page in list). */
    onNodeClick?: (node: { url: string; id: string }) => void;
}

function nodeColorByScore(score: number): string {
    if (score >= 90) return '#7cb87c';
    if (score >= 50) return '#e8a64a';
    return '#c75c5c';
}

function getNodeLabel(node: ForceGraphNode): string {
    if (node.title?.trim()) return node.title.trim();
    try {
        const pathname = new URL(node.url).pathname || '/';
        return pathname === '/' ? 'Home' : pathname.replace(/^\//, '').slice(0, 24) || 'Page';
    } catch {
        return 'Page';
    }
}

/** Short label for node box (truncated). */
function getNodeShortLabel(node: ForceGraphNode, maxLen: number): string {
    const full = getNodeLabel(node);
    if (full.length <= maxLen) return full;
    return full.slice(0, maxLen - 1) + '…';
}

export const DomainGraph = ({
    data,
    width = 800,
    height = 600,
    onNodeClick,
}: DomainGraphProps) => {
    const fgRef = useRef<{ zoom: (scale?: number, ms?: number) => number; zoomToFit: (ms?: number, padding?: number, nodeFilter?: (n: ForceGraphNode) => boolean) => void } | undefined>(undefined);
    const hasFittedRef = useRef(false);

    const [hoveredNode, setHoveredNode] = useState<ForceGraphNode | null>(null);
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [scoreFilter, setScoreFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
    const [depthMax, setDepthMax] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all');

    const fullGraphData = useMemo(() => domainGraphToForceData(data), [data]);

    useEffect(() => {
        hasFittedRef.current = false;
    }, [data]);

    /** Increase node spacing: larger link distance and stronger repulsion (charge). */
    useEffect(() => {
        if (!filteredData.nodes.length) return;
        const id = setTimeout(() => {
            const g = fgRef.current as { d3Force?: (name: string) => { distance?: (v: number) => void; strength?: (v: number) => void } | undefined; d3ReheatSimulation?: () => void } | undefined };
            if (!g?.d3Force) return;
            const linkForce = g.d3Force('link');
            const chargeForce = g.d3Force('charge');
            if (linkForce && typeof linkForce.distance === 'function') linkForce.distance(100);
            if (chargeForce && typeof chargeForce.strength === 'function') chargeForce.strength(-80);
            g.d3ReheatSimulation?.();
        }, 150);
        return () => clearTimeout(id);
    }, [filteredData]);

    const filteredData = useMemo(() => {
        let opts: Parameters<typeof filterForceGraphData>[1] = {};
        if (search.trim()) opts.search = search.trim();
        if (scoreFilter === 'low') opts.scoreMax = 49;
        if (scoreFilter === 'medium') {
            opts.scoreMin = 50;
            opts.scoreMax = 89;
        }
        if (scoreFilter === 'high') opts.scoreMin = 90;
        if (depthMax !== '') opts.depthMax = Number(depthMax);
        if (statusFilter !== 'all') opts.status = statusFilter;
        return filterForceGraphData(fullGraphData, opts);
    }, [fullGraphData, search, scoreFilter, depthMax, statusFilter]);

    /** When a node is focused: set of that node + all directly linked nodes (for highlight-only, no hiding). */
    const focusedNodeSet = useMemo(() => {
        if (!focusedNodeId || !filteredData.nodes.length) return null;
        const nodeMap = new Map(filteredData.nodes.map((n) => [n.id, n]));
        const node = nodeMap.get(focusedNodeId);
        if (!node) return null;
        const set = new Set<string>([node.id]);
        filteredData.links.forEach((l) => {
            if (l.source === node.id || l.target === node.id) {
                set.add(l.source);
                set.add(l.target);
            }
        });
        return set;
    }, [focusedNodeId, filteredData]);

    /** Always show all nodes (no hiding on click). */
    const nodeVisibility = useCallback(() => true, []);

    /** Focus = highlight: linked nodes in full score color, rest dimmed. No hiding. */
    const nodeColor = useCallback(
        (node: ForceGraphNode | { id?: string; score?: number }) => {
            const n = node as ForceGraphNode;
            const base = nodeColorByScore(n.score ?? 0);
            if (!focusedNodeSet || !n.id) return base;
            if (focusedNodeSet.has(n.id)) return base;
            return '#e0e0e0';
        },
        [focusedNodeSet]
    );

    /** Always show all links (no hiding on click). */
    const linkVisibility = useCallback(() => true, []);

    /** Focus = highlight: links between focused nodes in full color, rest dimmed. */
    const linkColor = useCallback(
        (link: { source?: string | object; target?: string | object }) => {
            if (!focusedNodeSet) return '#6b8cae';
            const src = typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode)?.id;
            const tgt = typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode)?.id;
            if (!!src && !!tgt && focusedNodeSet.has(src) && focusedNodeSet.has(tgt)) return '#6b8cae';
            return '#d0d0d0';
        },
        [focusedNodeSet]
    );

    const handleNodeClick = useCallback(
        (node: ForceGraphNode) => {
            setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
            onNodeClick?.({ url: node.url, id: node.id });
        },
        [onNodeClick]
    );

    const handleBackgroundClick = useCallback(() => {
        setFocusedNodeId(null);
    }, []);

    const nodeCanvasObject = useCallback(
        (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as ForceGraphNode & { x?: number; y?: number };
            const label = getNodeShortLabel(n, globalScale > 1.5 ? 22 : 14);
            const fontSize = globalScale > 1.5 ? 11 : 9;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const w = Math.max(textWidth + 12, 48);
            const h = 28;
            const x = (n.x ?? 0) - w / 2;
            const y = (n.y ?? 0) - h / 2;
            const color = nodeColor(n);
            ctx.fillStyle = color;
            ctx.strokeStyle = hoveredNode?.id === n.id ? '#333' : '#5a7a9a';
            ctx.lineWidth = hoveredNode?.id === n.id ? 2 : 1;
            ctx.beginPath();
            roundRect(ctx, x, y, w, h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#111';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, (n.x ?? 0), n.y ?? 0);
        },
        [hoveredNode?.id, nodeColor]
    );

    const zoomIn = useCallback(() => {
        const g = fgRef.current;
        if (g) {
            const z = g.zoom();
            g.zoom(Math.min(ZOOM_MAX, z * 1.4), 200);
        }
    }, []);

    const zoomOut = useCallback(() => {
        const g = fgRef.current;
        if (g) {
            const z = g.zoom();
            g.zoom(Math.max(ZOOM_MIN, z / 1.4), 200);
        }
    }, []);

    const resetView = useCallback(() => {
        setFocusedNodeId(null);
        fgRef.current?.zoomToFit(200, 40);
    }, []);

    const showFilterBar =
        fullGraphData.nodes.length > 20 ||
        search ||
        scoreFilter !== 'all' ||
        depthMax !== '' ||
        statusFilter !== 'all';

    return (
        <Box
            sx={{
                position: 'relative',
                width,
                height,
                background: '#f5f5f5',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            {showFilterBar && (
                <Box
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        right: 8,
                        zIndex: 10,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="URL or title…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{
                            width: 180,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'background.paper',
                                borderRadius: 1,
                            },
                        }}
                        inputProps={{ 'aria-label': 'Search pages by URL or title' }}
                    />
                    <select
                        aria-label="Filter by score"
                        value={scoreFilter}
                        onChange={(e) =>
                            setScoreFilter(e.target.value as 'all' | 'low' | 'medium' | 'high')
                        }
                        style={{
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            background: '#fff',
                            fontSize: 14,
                        }}
                    >
                        <option value="all">Score: all</option>
                        <option value="high">Score ≥ 90</option>
                        <option value="medium">Score 50–89</option>
                        <option value="low">Score &lt; 50</option>
                    </select>
                    <TextField
                        size="small"
                        type="number"
                        placeholder="Max depth"
                        value={depthMax}
                        onChange={(e) => setDepthMax(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0, 'aria-label': 'Max URL depth' }}
                        sx={{
                            width: 100,
                            '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1 },
                        }}
                    />
                    <select
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as 'all' | 'ok' | 'error')
                        }
                        style={{
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            background: '#fff',
                            fontSize: 14,
                        }}
                    >
                        <option value="all">Status: all</option>
                        <option value="ok">OK</option>
                        <option value="error">Error</option>
                    </select>
                    {(search || scoreFilter !== 'all' || depthMax !== '' || statusFilter !== 'all') && (
                        <MsqdxTypography variant="caption" sx={{ color: 'text.secondary' }}>
                            {filteredData.nodes.length} / {fullGraphData.nodes.length} nodes
                        </MsqdxTypography>
                    )}
                </Box>
            )}

            <ForceGraph2D
                ref={fgRef as never}
                graphData={filteredData}
                width={width}
                height={height}
                backgroundColor="#f5f5f5"
                nodeId="id"
                linkSource="source"
                linkTarget="target"
                nodeVal={() => 6}
                nodeLabel={(n: unknown) => {
                    const node = n as ForceGraphNode;
                    return `${node.url}\nScore: ${node.score}`;
                }}
                nodeVisibility={nodeVisibility as (n: unknown) => boolean}
                nodeColor={nodeColor as (n: unknown) => string}
                nodeCanvasObject={nodeCanvasObject}
                nodeCanvasObjectMode="replace"
                onNodeHover={(n: unknown) => setHoveredNode(n as ForceGraphNode | null)}
                onNodeClick={(n: unknown) => handleNodeClick(n as ForceGraphNode)}
                onBackgroundClick={handleBackgroundClick}
                linkVisibility={linkVisibility as (l: unknown) => boolean}
                linkColor={linkColor as (l: unknown) => string}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkWidth={filteredData.links.length > 200 ? 0.8 : 1.2}
                enableNodeDrag
                enableZoomInteraction
                enablePanInteraction
                minZoom={ZOOM_MIN}
                maxZoom={ZOOM_MAX}
                showPointerCursor
                onEngineStop={() => {
                    if (!hasFittedRef.current && filteredData.nodes.length > 0) {
                        hasFittedRef.current = true;
                        fgRef.current?.zoomToFit(0, 40);
                    }
                }}
            />

            <Box
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    zIndex: 10,
                }}
            >
                <MsqdxButton
                    variant="contained"
                    size="small"
                    onClick={zoomIn}
                    sx={{ minWidth: 36 }}
                    aria-label="Zoom in"
                >
                    +
                </MsqdxButton>
                <MsqdxButton
                    variant="contained"
                    size="small"
                    onClick={zoomOut}
                    sx={{ minWidth: 36 }}
                    aria-label="Zoom out"
                >
                    −
                </MsqdxButton>
                <MsqdxButton
                    variant="outlined"
                    size="small"
                    onClick={resetView}
                    sx={{ minWidth: 36 }}
                    aria-label="Reset view"
                >
                    ⟲
                </MsqdxButton>
            </Box>

            {hoveredNode && (
                <MsqdxCard
                    variant="glass"
                    sx={{
                        position: 'absolute',
                        top: showFilterBar ? 52 : 10,
                        left: 10,
                        p: 1,
                        zIndex: 10,
                        pointerEvents: 'none',
                        minWidth: 180,
                        maxWidth: 360,
                        color: '#111',
                    }}
                >
                    <MsqdxTypography
                        variant="caption"
                        display="block"
                        sx={{ fontWeight: 'bold', wordBreak: 'break-all', color: '#111' }}
                    >
                        {hoveredNode.url}
                    </MsqdxTypography>
                    <MsqdxTypography
                        variant="caption"
                        sx={{
                            color:
                                hoveredNode.score >= 90
                                    ? '#2e7d32'
                                    : hoveredNode.score >= 50
                                      ? '#ed6c02'
                                      : '#d32f2f',
                        }}
                    >
                        Score: {hoveredNode.score}
                    </MsqdxTypography>
                </MsqdxCard>
            )}

            {filteredData.nodes.length === 0 && fullGraphData.nodes.length > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <MsqdxTypography variant="body2">No nodes match the current filters.</MsqdxTypography>
                </Box>
            )}
        </Box>
    );
};

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
}
