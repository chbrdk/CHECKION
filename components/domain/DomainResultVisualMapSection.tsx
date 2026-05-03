'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { useQuery } from '@tanstack/react-query';
import { apiScanDomainGraph } from '@/lib/constants';
import type { DomainScanResult } from '@/lib/types';

const DomainGraph = dynamic(
    () => import('@/components/DomainGraph').then((m) => ({ default: m.DomainGraph })),
    { ssr: false, loading: () => <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box> }
);

export type DomainResultVisualMapSectionProps = {
    t: (key: string) => string;
    domainId: string;
};

function DomainResultVisualMapSectionInner({ t, domainId }: DomainResultVisualMapSectionProps) {
    const { data, isPending, isError } = useQuery({
        queryKey: ['domain-scan-graph', domainId],
        queryFn: async () => {
            const res = await fetch(apiScanDomainGraph(domainId), { credentials: 'same-origin' });
            if (!res.ok) throw new Error('graph');
            return (await res.json()) as { graph: DomainScanResult['graph'] };
        },
        enabled: Boolean(domainId?.trim()),
        staleTime: 300_000,
        refetchOnWindowFocus: false,
    });

    const graph = data?.graph;

    return (
        <Box>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                {t('domainResult.visualMapDescription')}
            </MsqdxTypography>
            {isPending && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={36} sx={{ color: 'var(--color-theme-accent)' }} />
                </Box>
            )}
            {isError && (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-secondary-dx-pink)' }}>
                    {t('domainResult.visualMapLoadError')}
                </MsqdxTypography>
            )}
            {!isPending && !isError && graph ? <DomainGraph data={graph} width={1200} height={800} /> : null}
        </Box>
    );
}

export const DomainResultVisualMapSection = memo(DomainResultVisualMapSectionInner);
