'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { AddToProject } from '@/components/AddToProject';
import { SharePanel } from '@/components/SharePanel';
import { PATH_HOME, apiScan } from '@/lib/constants';
import type { ScanResult } from '@/lib/types';

/** Renders back to dashboard + AddToProject + SharePanel for use in the app header when on a results route. */
export function ResultsHeaderNav() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [projectId, setProjectId] = useState<string | null>(null);

    const refetchProjectId = useCallback(() => {
        if (!id) return;
        fetch(apiScan(id), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((d: ScanResult & { projectId?: string | null }) => setProjectId(d.projectId ?? null))
            .catch(() => setProjectId(null));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        refetchProjectId();
    }, [id, refetchProjectId]);

    if (!id) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 2,
                flexWrap: 'nowrap',
                marginLeft: 'auto',
                minWidth: 0,
            }}
        >
            <Link href={PATH_HOME} style={{ textDecoration: 'none' }}>
                <MsqdxButton
                    variant="outlined"
                    size="small"
                    sx={{
                        color: '#000',
                        borderColor: 'currentColor',
                        '&:hover': { borderColor: 'currentColor', backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                >
                    ← {t('results.dashboard')}
                </MsqdxButton>
            </Link>
            <AddToProject
                resourceType="single"
                resourceId={id}
                currentProjectId={projectId}
                onAssigned={refetchProjectId}
            />
            <SharePanel resourceType="single" resourceId={id} labelNamespace="results" />
        </Box>
    );
}
