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

const ROW_HEIGHT = 72;
const NODE_WIDTH = 128;
const NODE_HEIGHT = 40;

export const DomainGraph = ({ data, width = 800, height = 600 }: DomainGraphProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

    // Flowchart layout: rows by depth, boxes with arrows
    useEffect(() => {
        if (!data || !data.nodes.length) return;

        // Scale spacing with node count so 100 nodes don’t collapse into a blob (factor from 25-node baseline)
        const PAD = 24;
        const NODE_W = NODE_WIDTH;
        const NODE_H = NODE_HEIGHT;

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

        const byDepth = new Map<number, Node[]>();
        layoutNodes.forEach((n) => {
            const d = n.depth ?? 0;
            if (!byDepth.has(d)) byDepth.set(d, []);
            byDepth.get(d)!.push(n);
        });

        let layoutWidth = 400;
        byDepth.forEach((list) => {
            layoutWidth = Math.max(layoutWidth, list.length * (NODE_W + PAD));
        });

        byDepth.forEach((list, depth) => {
            const rowWidth = Math.max(layoutWidth, list.length * (NODE_W + PAD));
            const step = list.length > 1 ? (rowWidth - NODE_W) / (list.length - 1) : 0;
            const startX = (rowWidth - (list.length - 1) * step - NODE_W) / 2 + NODE_W / 2;
            list.forEach((node, i) => {
                node.x = startX + i * step;
                node.y = depth * ROW_HEIGHT + ROW_HEIGHT / 2;
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

    // Scale-to-fit including node box size so nothing is clipped
    const padding = 48;
    const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) - NODE_WIDTH / 2 : 0;
    const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x)) + NODE_WIDTH / 2 : width;
    const minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) - NODE_HEIGHT / 2 : 0;
    const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y)) + NODE_HEIGHT / 2 : height;
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
        const halfW = (NODE_WIDTH / 2) * scale;
        const halfH = (NODE_HEIGHT / 2) * scale;
        const setHover = nodes.find((n) => {
            const d = toDisplay(n.x, n.y);
            return Math.abs(mx - d.x) <= halfW && Math.abs(my - d.y) <= halfH;
        }) || null;
        setHoveredNode(setHover);
    };

    return (
        <Box sx={{ position: 'relative', width: width, height: height, background: '#f5f5f5', borderRadius: 2, overflow: 'hidden' }}>
            <svg
                width={width}
                height={height}
                onMouseMove={handleMouseMove}
                style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
            >
                <defs>
                    <marker id="flowchart-arrow" markerWidth={10} markerHeight={8} refX={9} refY={4} orient="auto">
                        <path d="M0,0 L10,4 L0,8 Z" fill="#6b8cae" />
                    </marker>
                </defs>
                {/* Links: from bottom of source box to top of target box, with arrow */}
                {links.map((link, i) => {
                    const s = nodes.find((n) => n.url === link.source.url);
                    const t = nodes.find((n) => n.url === link.target.url);
                    if (!s || !t) return null;
                    const d1 = toDisplay(s.x, s.y + NODE_HEIGHT / 2);
                    const d2 = toDisplay(t.x, t.y - NODE_HEIGHT / 2);
                    return (
                        <line
                            key={i}
                            x1={d1.x}
                            y1={d1.y}
                            x2={d2.x}
                            y2={d2.y}
                            stroke="#6b8cae"
                            strokeWidth={2}
                            markerEnd="url(#flowchart-arrow)"
                        />
                    );
                })}

                {/* Nodes: flowchart boxes */}
                {nodes.map((node, i) => {
                    const color = node.score >= 90 ? '#7cb87c' : node.score >= 50 ? '#e8a64a' : '#c75c5c';
                    const d = toDisplay(node.x, node.y);
                    let label: string;
                    if (node.title?.trim()) {
                        label = node.title.trim();
                        if (label.length > 22) label = label.slice(0, 19) + '…';
                    } else {
                        try {
                            const pathname = new URL(node.url).pathname || '/';
                            label = pathname === '/' ? 'Home' : pathname.replace(/^\//, '').slice(0, 18) || 'Page';
                            if (pathname.length > 18) label += '…';
                        } catch {
                            label = 'Page';
                        }
                    }
                    const isHovered = hoveredNode?.url === node.url;
                    const w = NODE_WIDTH * scale;
                    const h = NODE_HEIGHT * scale;
                    return (
                        <g key={i} transform={`translate(${d.x},${d.y})`}>
                            <rect
                                x={-w / 2}
                                y={-h / 2}
                                width={w}
                                height={h}
                                rx={6}
                                ry={6}
                                fill={color}
                                fillOpacity={isHovered ? 1 : 0.85}
                                stroke={isHovered ? '#333' : '#5a7a9a'}
                                strokeWidth={isHovered ? 2 : 1}
                            />
                            <text
                                y={0}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={11}
                                fill="#fff"
                                style={{ pointerEvents: 'none', fontWeight: isHovered ? 'bold' : 'normal' }}
                            >
                                {label}
                            </text>
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
