import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxCard } from '@msqdx/react';
import { MSQDX_COLORS, MSQDX_STATUS } from '@msqdx/tokens';
import type { DomainScanResult } from '@/lib/types';

interface DomainGraphProps {
    data: DomainScanResult['graph'];
    width?: number;
    height?: number;
}

type NodeData = DomainScanResult['graph']['nodes'][number];

interface Node extends NodeData {
    x: number;
    y: number;
}

interface Link {
    source: Node;
    target: Node;
}

function normalizeId(urlOrId: string): string {
    try {
        const u = new URL(urlOrId);
        return u.origin + (u.pathname.replace(/\/$/, '') || '');
    } catch {
        return urlOrId;
    }
}

function pathDepthFromUrl(url: string): number {
    try {
        const path = new URL(url).pathname.replace(/\/$/, '');
        return path ? path.split('/').filter(Boolean).length : 0;
    } catch {
        return 0;
    }
}

export const DomainGraph = ({ data, width = 800, height = 600 }: DomainGraphProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

    // Radial mind-map layout: level by level, root at center, children on rings
    useEffect(() => {
        if (!data || !data.nodes.length) return;

        // Scale spacing with node count so 100 nodes don’t collapse into a blob (factor from 25-node baseline)
        const R_BASE = 140;
        const TWO_PI = 2 * Math.PI;

        const layoutNodes: Node[] = data.nodes.map((n) => ({
            ...n,
            x: 0,
            y: 0,
            depth: n.depth ?? pathDepthFromUrl(n.url),
        }));
        const nodeMap = new Map<string, Node>();
        layoutNodes.forEach((n) => {
            nodeMap.set(normalizeId(n.id), n);
            nodeMap.set(normalizeId(n.url), n);
        });

        const childrenMap = new Map<string, string[]>();
        data.links.forEach((l) => {
            const src = normalizeId(l.source);
            const tgt = normalizeId(l.target);
            if (!childrenMap.has(src)) childrenMap.set(src, []);
            if (!childrenMap.get(src)!.includes(tgt)) childrenMap.get(src)!.push(tgt);
        });

        const placed = new Set<string>();

        function placeNode(nodeIdNorm: string, angle: number, span: number) {
            const node = nodeMap.get(nodeIdNorm);
            if (!node || placed.has(nodeIdNorm)) return;
            const depth = node.depth ?? 0;
            const r = depth === 0 ? 0 : R_BASE * depth;
            node.x = r * Math.cos(angle);
            node.y = r * Math.sin(angle);
            placed.add(nodeIdNorm);

            const children = childrenMap.get(nodeIdNorm) ?? [];
            if (children.length === 0) return;
            const childSpan = span / children.length;
            children.forEach((childId, i) => {
                const childAngle = angle - span / 2 + childSpan * (i + 0.5);
                placeNode(childId, childAngle, childSpan);
            });
        }

        const roots = layoutNodes.filter((n) => (n.depth ?? 0) === 0);
        if (roots.length >= 1) {
            const rootId = normalizeId(roots[0].id);
            if (roots.length === 1) {
                placeNode(rootId, 0, TWO_PI);
            } else {
                roots.forEach((r, i) => placeNode(normalizeId(r.id), (TWO_PI * i) / roots.length, TWO_PI / roots.length));
            }
        }

        const unplaced = layoutNodes.filter((n) => !placed.has(normalizeId(n.id))).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
        const byDepth = new Map<number, Node[]>();
        unplaced.forEach((n) => {
            const d = n.depth ?? 0;
            if (!byDepth.has(d)) byDepth.set(d, []);
            byDepth.get(d)!.push(n);
        });
        byDepth.forEach((list, depth) => {
            const r = depth === 0 ? 0 : R_BASE * depth;
            list.forEach((node, i) => {
                const angle = (TWO_PI * i) / list.length;
                node.x = r * Math.cos(angle);
                node.y = r * Math.sin(angle);
            });
        });

        const initialLinks: Link[] = data.links
            .map((l) => ({
                source: nodeMap.get(normalizeId(l.source))!,
                target: nodeMap.get(normalizeId(l.target))!,
            }))
            .filter((l) => l.source && l.target);

        setNodes(layoutNodes);
        setLinks(initialLinks);
    }, [data, width, height]);

    // Scale-to-fit: map simulation space to display (width x height)
    const padding = 40;
    const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) : 0;
    const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x)) : width;
    const minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) : 0;
    const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y)) : height;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = nodes.length
        ? Math.min((width - padding) / rangeX, (height - padding) / rangeY)
        : 1;
    const offsetX = nodes.length ? width / 2 - (minX + maxX) / 2 * scale : 0;
    const offsetY = nodes.length ? height / 2 - (minY + maxY) / 2 * scale : 0;

    const toDisplay = (x: number, y: number) => ({ x: x * scale + offsetX, y: y * scale + offsetY });
    const toSim = (x: number, y: number) => ({ x: (x - offsetX) / scale, y: (y - offsetY) / scale });

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const sim = toSim(mx, my);
        const hitRadiusSim = scale > 0 ? 14 / scale : 1000;
        const setHover = nodes.find(n => {
            const dist = Math.sqrt((n.x - sim.x) ** 2 + (n.y - sim.y) ** 2);
            return dist < hitRadiusSim;
        });
        setHoveredNode(setHover || null);
    };

    return (
        <Box sx={{ position: 'relative', width: width, height: height, background: '#f5f5f5', borderRadius: 2, overflow: 'hidden' }}>
            <svg
                width={width}
                height={height}
                onMouseMove={handleMouseMove}
                style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
            >
                {/* Links */}
                {links.map((link, i) => {
                    const s = nodes.find(n => n.url === link.source.url);
                    const t = nodes.find(n => n.url === link.target.url);
                    if (!s || !t) return null;
                    const d1 = toDisplay(s.x, s.y);
                    const d2 = toDisplay(t.x, t.y);
                    return (
                        <line
                            key={i}
                            x1={d1.x}
                            y1={d1.y}
                            x2={d2.x}
                            y2={d2.y}
                            stroke="#ccc"
                            strokeWidth={1}
                        />
                    );
                })}

                {/* Nodes */}
                {nodes.map((node, i) => {
                    const color = node.score >= 90 ? MSQDX_STATUS.success.base :
                        node.score >= 50 ? MSQDX_STATUS.warning.base :
                            MSQDX_STATUS.error.base;
                    const d = toDisplay(node.x, node.y);
                    let label: string;
                    if (node.title?.trim()) {
                        label = node.title.trim();
                        if (label.length > 32) label = label.slice(0, 29) + '…';
                    } else {
                        try {
                            const pathname = new URL(node.url).pathname || '/';
                            label = pathname === '/' ? 'Home' : pathname;
                            if (label.length > 28) label = label.slice(0, 25) + '…';
                        } catch {
                            label = node.url;
                        }
                    }
                    const isHovered = hoveredNode?.url === node.url;
                    return (
                        <g key={i} transform={`translate(${d.x},${d.y})`}>
                            <circle
                                r={isHovered ? 8 : 6}
                                fill={color}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                            {(isHovered || nodes.length <= 25) && (
                                <text
                                    y={-10}
                                    textAnchor="middle"
                                    fontSize={isHovered ? 11 : 9}
                                    fill="#333"
                                    style={{ pointerEvents: 'none', fontWeight: isHovered ? 'bold' : 'normal' }}
                                >
                                    {label}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hoveredNode && (() => {
                const d = toDisplay(hoveredNode.x, hoveredNode.y);
                return (
                <MsqdxCard
                    variant="glass"
                    sx={{
                        position: 'absolute',
                        top: d.y + 10,
                        left: d.x + 10,
                        p: 1,
                        zIndex: 10,
                        pointerEvents: 'none',
                        minWidth: 150
                    }}
                >
                    <MsqdxTypography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                        {hoveredNode.url}
                    </MsqdxTypography>
                    <MsqdxTypography
                        variant="caption"
                        color={hoveredNode.score >= 90 ? 'success' : hoveredNode.score >= 50 ? 'warning' : 'error'}
                    >
                        Score: {hoveredNode.score}
                    </MsqdxTypography>
                </MsqdxCard>
                );
            })()}
        </Box>
    );
};
