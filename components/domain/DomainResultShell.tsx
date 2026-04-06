'use client';

import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import { ArrowLeft } from 'lucide-react';
import { SharePanel } from '@/components/SharePanel';
import { AddToProject } from '@/components/AddToProject';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useDomainScan } from '@/context/DomainScanContext';
import { apiScanDomainSummary, PATH_HOME } from '@/lib/constants';
import { DomainResultNav } from '@/components/domain/DomainResultNav';

export function DomainResultShell({ children }: { children: React.ReactNode }) {
    const { t } = useI18n();
    const router = useRouter();
    const { loadError, result, domainId, projectId, setProjectId, activeSection, fromProjectId, domainLinkQuery } = useDomainScan();

    if (loadError) {
        return (
            <Box
                sx={{
                    p: 'var(--msqdx-spacing-md)',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minHeight: 320,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', py: 8 }}>
                    <MsqdxTypography variant="h5" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center', maxWidth: 480 }}>
                        {t('domainResult.notFound')}
                    </MsqdxTypography>
                    <MsqdxButton variant="contained" startIcon={<ArrowLeft size={16} />} onClick={() => router.push(PATH_HOME)}>
                        {t('domainResult.back')}
                    </MsqdxButton>
                </Box>
            </Box>
        );
    }

    if (!result) {
        return (
            <Box
                sx={{
                    p: 'var(--msqdx-spacing-md)',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minHeight: 320,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', py: 8 }}>
                    <MsqdxTypography variant="h5" sx={{ mb: 'var(--msqdx-spacing-md)' }}>{t('domainResult.loading')}</MsqdxTypography>
                    <CircularProgress sx={{ color: 'var(--color-theme-accent)' }} />
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                p: 'var(--msqdx-spacing-md)',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minHeight: 320,
            }}
        >
            <Box sx={{ mb: 'var(--msqdx-spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                        <MsqdxTypography variant="h4" weight="bold">{t('domainResult.title')}</MsqdxTypography>
                        <InfoTooltip title={t('info.domainResult')} ariaLabel={t('common.info')} />
                    </Box>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {result.domain} • {new Date(result.timestamp).toLocaleDateString()}
                    </MsqdxTypography>
                </Box>
                <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-md)', flexWrap: 'wrap' }}>
                    <MsqdxButton variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => router.push(PATH_HOME)}>
                        {t('domainResult.back')}
                    </MsqdxButton>
                    <Box sx={{ display: 'inline-flex', gap: 'var(--msqdx-spacing-sm)' }}>
                        {!fromProjectId && (
                            <AddToProject
                                resourceType="domain"
                                resourceId={domainId}
                                currentProjectId={projectId}
                                onAssigned={() =>
                                    fetch(apiScanDomainSummary(domainId, { light: true }))
                                        .then((r) => r.json())
                                        .then((d: { projectId?: string | null }) => setProjectId(d.projectId ?? null))
                                }
                            />
                        )}
                        <SharePanel resourceType="domain" resourceId={domainId} labelNamespace="domainResult" />
                    </Box>
                </Box>
            </Box>

            <DomainResultNav domainId={domainId} activeSection={activeSection} domainLinkQuery={domainLinkQuery} />

            {children}
        </Box>
    );
}
