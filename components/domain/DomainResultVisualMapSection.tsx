'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import type { DomainScanResult } from '@/lib/types';

const DomainGraph = dynamic(
    () => import('@/components/DomainGraph').then((m) => ({ default: m.DomainGraph })),
    { ssr: false, loading: () => <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box> }
);

export type DomainResultVisualMapSectionProps = {
    t: (key: string) => string;
    graph: DomainScanResult['graph'];
};

function DomainResultVisualMapSectionInner({ t, graph }: DomainResultVisualMapSectionProps) {
    return (
        <Box>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                {t('domainResult.visualMapDescription')}
            </MsqdxTypography>
            <DomainGraph data={graph} width={1200} height={800} />
        </Box>
    );
}

export const DomainResultVisualMapSection = memo(DomainResultVisualMapSectionInner);
