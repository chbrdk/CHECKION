'use client';

import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Divider, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { ArrowLeft } from 'lucide-react';
import { SharePanel } from '@/components/SharePanel';
import { AddToProject } from '@/components/AddToProject';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useDomainScan } from '@/context/DomainScanContext';
import { apiScanDomainSummary, PATH_HOME } from '@/lib/constants';
import { MSQDX_BUTTON_THEME_ACCENT_SX } from '@/lib/theme-accent';
import { DomainResultNav } from '@/components/domain/DomainResultNav';

export function DomainResultShell({ children }: { children: React.ReactNode }) {
    const { t } = useI18n();
    const router = useRouter();
    const { loadError, result, domainId, projectId, setProjectId, activeSection, fromProjectId, domainLinkQuery } = useDomainScan();

    if (loadError) {
        return (
            <Box
                sx={{
                    py: 'var(--msqdx-spacing-md)',
                    px: 1.5,
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
                    <MsqdxButton
                        variant="contained"
                        startIcon={<ArrowLeft size={16} />}
                        onClick={() => router.push(PATH_HOME)}
                        sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                    >
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
                    py: 'var(--msqdx-spacing-md)',
                    px: 1.5,
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
                py: 'var(--msqdx-spacing-md)',
                px: 1.5,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minHeight: 320,
            }}
        >
            <Stack sx={{ gap: 2 }}>
                <MsqdxMoleculeCard
                    title={t('domainResult.title')}
                    titleVariant="h4"
                    subtitle={`${result.domain} • ${new Date(result.timestamp).toLocaleDateString()}`}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    headerActions={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                            <InfoTooltip title={t('info.domainResult')} ariaLabel={t('common.info')} />
                            <MsqdxButton
                                variant="outlined"
                                startIcon={<ArrowLeft size={16} />}
                                onClick={() => router.push(PATH_HOME)}
                                sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                            >
                                {t('domainResult.back')}
                            </MsqdxButton>
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
                    }
                >
                    <Divider sx={{ borderColor: 'var(--color-secondary-dx-grey-light-tint)' }} />
                    <Box sx={{ pt: 1.5 }}>
                        <DomainResultNav
                            domainId={domainId}
                            activeSection={activeSection}
                            domainLinkQuery={domainLinkQuery}
                            embedded
                        />
                    </Box>
                </MsqdxMoleculeCard>

                {children}
            </Stack>
        </Box>
    );
}
