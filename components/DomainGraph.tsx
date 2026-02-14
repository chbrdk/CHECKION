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
    vx: number;
    vy: number;
}

interface Link {
    source: Node;
    target: Node;
}

export const DomainGraph = ({ data, width = 800, height = 600 }: DomainGraphProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

    // Initialize simulation
    useEffect(() => {
        if (!data || !data.nodes.length) return;

        // Clone and initialize nodes
        const initialNodes: Node[] = data.nodes.map((n) => ({
            ...n,
            x: width / 2 + (Math.random() - 0.5) * 50,
            y: height / 2 + (Math.random() - 0.5) * 50,
            vx: 0,
            vy: 0,
        }));

        // Map links to node objects
        const nodeMap = new Map(initialNodes.map((n) => [n.url, n]));
        const initialLinks: Link[] = data.links
            .map((l) => ({
                source: nodeMap.get(l.source)!,
                target: nodeMap.get(l.target)!,
            }))
            .filter((l) => l.source && l.target);

        setNodes(initialNodes);
        setLinks(initialLinks);
    }, [data, width, height]);

    // Run simulation loop
    useEffect(() => {
        if (!nodes.length) return;

        let animationFrameId: number;

        const tick = () => {
            setNodes(prevNodes => {
                const newNodes = [...prevNodes];
                const k = 0.05; // Force constant
                const repulsion = 500;
                const centerForce = 0.01;

                // 1. Repulsion
                for (let i = 0; i < newNodes.length; i++) {
                    for (let j = i + 1; j < newNodes.length; j++) {
                        const dx = newNodes[i].x - newNodes[j].x;
                        const dy = newNodes[i].y - newNodes[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (dist < 300) {
                            const force = repulsion / (dist * dist);
                            const fx = (dx / dist) * force;
                            const fy = (dy / dist) * force;
                            newNodes[i].vx += fx;
                            newNodes[i].vy += fy;
                            newNodes[j].vx -= fx;
                            newNodes[j].vy -= fy;
                        }
                    }
                }

                // 2. Spring force (Links)
                links.forEach(link => {
                    // We must find the *current* node objects in newNodes array by ID/URL to update them
                    const source = newNodes.find(n => n.url === link.source.url);
                    const target = newNodes.find(n => n.url === link.target.url);

                    if (source && target) {
                        const dx = target.x - source.x;
                        const dy = target.y - source.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = (dist - 100) * k; // Resting distance 100
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        source.vx += fx;
                        source.vy += fy;
                        target.vx -= fx;
                        target.vy -= fy;
                    }
                });

                // 3. Center force & Velocity update
                newNodes.forEach(node => {
                    // Pull to center
                    node.vx += (width / 2 - node.x) * centerForce;
                    node.vy += (height / 2 - node.y) * centerForce;

                    // Apply friction
                    node.vx *= 0.9;
                    node.vy *= 0.9;

                    // Update position
                    node.x += node.vx;
                    node.y += node.vy;
                });

                return newNodes;
            });

            animationFrameId = requestAnimationFrame(tick);
        };

        // Run for a few seconds then stop to save CPU
        const timeout = setTimeout(() => {
            cancelAnimationFrame(animationFrameId);
        }, 5000); // 5 seconds of simulation

        animationFrameId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animationFrameId);
            clearTimeout(timeout);
        };
    }, [links.length, width, height]); // Only restart if graph structure changes

    // Interaction handlers
    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const setHover = nodes.find(n => {
            const dist = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
            return dist < 10; // Node radius
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
                    // Find current positions
                    const s = nodes.find(n => n.url === link.source.url);
                    const t = nodes.find(n => n.url === link.target.url);
                    if (!s || !t) return null;

                    return (
                        <line
                            key={i}
                            x1={s.x}
                            y1={s.y}
                            x2={t.x}
                            y2={t.y}
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

                    return (
                        <g key={i} transform={`translate(${node.x},${node.y})`}>
                            <circle
                                r={hoveredNode?.url === node.url ? 8 : 6}
                                fill={color}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                            {/* Label for hovered or high-level nodes */}
                            {(hoveredNode?.url === node.url || node.depth === 0) && (
                                <text
                                    y={-10}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#333"
                                    style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                                >
                                    {node.depth === 0 ? 'Home' : new URL(node.url).pathname}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hoveredNode && (
                <MsqdxCard
                    variant="glass"
                    sx={{
                        position: 'absolute',
                        top: hoveredNode.y + 10,
                        left: hoveredNode.x + 10,
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
            )}
        </Box>
    );
};
