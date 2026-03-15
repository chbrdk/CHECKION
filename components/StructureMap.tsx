'use client';

import React, { useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { StructureNode } from '@/lib/types';
import { MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import { STRUCTURE_MAP_HEADINGS_INITIAL } from '@/lib/constants';
import { useI18n } from '@/components/i18n/I18nProvider';

interface StructureMapProps {
    nodes: StructureNode[];
    /** Max headings to show initially before "show more". Default from constants. */
    maxHeadingsInitial?: number;
}

function NodeRow({ node, isLandmark }: { node: StructureNode; isLandmark: boolean }) {
    const indent = node.level > 0 ? (node.level - 1) * 20 : 0;
    return (
        <Box
            sx={{
                marginLeft: indent,
                display: 'flex',
                alignItems: 'center',
                py: 0.5,
                px: 1,
                borderRadius: 1,
                bgcolor: isLandmark ? 'var(--color-secondary-dx-grey-light-tint)' : 'transparent',
                borderLeft: isLandmark ? `3px solid ${MSQDX_BRAND_PRIMARY.purple}` : 'none',
            }}
        >
            <Box
                component="span"
                sx={{
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    mr: 1,
                    color: isLandmark ? MSQDX_BRAND_PRIMARY.purple : MSQDX_NEUTRAL[500],
                    textTransform: 'uppercase',
                    minWidth: 40,
                }}
            >
                {node.tag}
            </Box>
            <Box
                component="span"
                sx={{
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: MSQDX_NEUTRAL[900],
                }}
            >
                {node.text || '<No Text>'}
            </Box>
        </Box>
    );
}

export const StructureMap: React.FC<StructureMapProps> = ({ nodes, maxHeadingsInitial = STRUCTURE_MAP_HEADINGS_INITIAL }) => {
    const { t } = useI18n();
    const [expandedHeadings, setExpandedHeadings] = useState(false);

    if (!nodes || nodes.length === 0) {
        return (
            <Box sx={{ p: 2, color: MSQDX_NEUTRAL[600] }}>
                {t('results.structureMapNoData')}
            </Box>
        );
    }

    const landmarks = nodes.filter((n) => n.level === 0);
    const headings = nodes.filter((n) => n.level >= 1 && n.level <= 6);
    const headingsVisible = expandedHeadings ? headings.length : Math.min(headings.length, maxHeadingsInitial);
    const hasMoreHeadings = headings.length > maxHeadingsInitial && !expandedHeadings;
    const remainingCount = headings.length - maxHeadingsInitial;

    return (
        <Box
            sx={{
                p: 2,
                bgcolor: 'var(--color-card-bg)',
                borderRadius: 1,
                border: `1px solid ${MSQDX_NEUTRAL[200]}`,
            }}
        >
            {landmarks.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Box component="h4" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1, color: 'var(--color-text-on-light)' }}>
                        {t('results.structureMapLandmarks')}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {landmarks.map((node, index) => (
                            <NodeRow key={`lm-${index}`} node={node} isLandmark />
                        ))}
                    </Box>
                </Box>
            )}
            {headings.length > 0 && (
                <Box>
                    <Box component="h4" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1, color: 'var(--color-text-on-light)' }}>
                        {t('results.structureMapHeadings')}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {headings.slice(0, headingsVisible).map((node, index) => (
                            <NodeRow key={`h-${index}`} node={node} isLandmark={false} />
                        ))}
                    </Box>
                    {hasMoreHeadings && (
                        <MsqdxButton variant="text" size="small" onClick={() => setExpandedHeadings(true)} sx={{ mt: 1 }}>
                            {t('results.structureMapShowMore', { count: remainingCount })}
                        </MsqdxButton>
                    )}
                </Box>
            )}
            {landmarks.length > 0 || headings.length > 0 ? (
                <Box sx={{ mt: 2, fontSize: '0.8rem', color: MSQDX_NEUTRAL[500] }}>
                    * Landmarks (nav, main, etc.) are highlighted. Headings are indented.
                </Box>
            ) : null}
        </Box>
    );
};
