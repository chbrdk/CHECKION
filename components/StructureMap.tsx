
import React from 'react';
import { StructureNode } from '../lib/types';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';

interface StructureMapProps {
    nodes: StructureNode[];
}

export const StructureMap: React.FC<StructureMapProps> = ({ nodes }) => {
    if (!nodes || nodes.length === 0) {
        return <div style={{ padding: '16px', color: MSQDX_NEUTRAL[600] }}>No structure data available.</div>;
    }

    return (
        <div style={{
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: `1px solid ${MSQDX_NEUTRAL[200]}`
        }}>
            <h3 style={{ marginBottom: '16px' }}>Semantic Structure Map</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nodes.map((node, index) => {
                    const indent = node.level > 0 ? (node.level - 1) * 20 : 0;
                    const isLandmark = node.level === 0;

                    return (
                        <div key={index} style={{
                            marginLeft: `${indent}px`,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            background: isLandmark ? '#f0f4f8' : 'transparent',
                            borderRadius: '4px',
                            borderLeft: isLandmark ? `3px solid ${MSQDX_BRAND_PRIMARY.purple}` : 'none'
                        }}>
                            <span style={{
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                marginRight: '8px',
                                color: isLandmark ? MSQDX_BRAND_PRIMARY.purple : MSQDX_NEUTRAL[500],
                                textTransform: 'uppercase',
                                minWidth: '40px'
                            }}>
                                {node.tag}
                            </span>
                            <span style={{
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: MSQDX_NEUTRAL[900]
                            }}>
                                {node.text || '<No Text>'}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: MSQDX_NEUTRAL[500] }}>
                * Landmarks (nav, main, etc.) are highlighted. Headings are indented.
            </div>
        </div>
    );
};
