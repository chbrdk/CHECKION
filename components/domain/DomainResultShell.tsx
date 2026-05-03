'use client';

import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Divider, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { ArrowLeft } from 'lucide-react';
import { SharePanel } from '@/components/SharePanel';
import { AddToProject } from '@/components/AddToProject';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useDomainScanChrome } from '@/context/DomainScanContext';
import { apiScanDomainSummary, LAYOUT_MAX_CONTENT_WIDTH_PX, PATH_HOME } from '@/lib/constants';
import { MSQDX_BUTTON_THEME_ACCENT_SX } from '@/lib/theme-accent';
import { industryDisplayLabel } from '@/lib/industry-pool';
import { DomainResultNav } from '@/components/domain/DomainResultNav';

const shellContainerSx = {
    py: 'var(--msqdx-spacing-md)',
    px: 1.5,
    width: '100%',
    maxWidth: LAYOUT_MAX_CONTENT_WIDTH_PX,
    mx: 'auto',
    boxSizing: 'border-box' as const,
    minHeight: 320,
};

export function DomainResultShell({ children }: { children: React.ReactNode }) {
    const { t, locale } = useI18n();
    const router = useRouter();
    const { loadError, shellHeader, domainId, projectId, setProjectId, activeSection, fromProjectId, domainLinkQuery } =
        useDomainScanChrome();

    if (loadError) {
        return (
            <Box sx={shellContainerSx}>
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

    if (!shellHeader) {
        return (
            <Box sx={shellContainerSx}>
                <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', py: 8 }}>
                    <MsqdxTypography variant="h5" sx={{ mb: 'var(--msqdx-spacing-md)' }}>{t('domainResult.loading')}</MsqdxTypography>
                    <CircularProgress sx={{ color: 'var(--color-theme-accent)' }} />
                </Box>
            </Box>
        );
    }

    const scanDateLabel = new Date(shellHeader.timestamp).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const industryRaw = shellHeader.industry?.trim() ?? '';
    const industry = industryDisplayLabel(industryRaw || null, t);
    const mergedTags = [...new Set([...shellHeader.projectTags, ...shellHeader.scanTags])];
    const showClassification = Boolean(industryRaw || mergedTags.length > 0);

    return (
        <Box sx={shellContainerSx}>
            <Stack sx={{ gap: { xs: 1.5, md: 2 } }}>
                <MsqdxMoleculeCard
                    title={t('domainResult.title')}
                    titleVariant="h4"
                    subtitle={`${shellHeader.domain} • ${scanDateLabel}`}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{
                        bgcolor: 'var(--color-card-bg)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 8,
                        boxShadow: '0 6px 20px -14px rgba(0,0,0,0.18)',
                    }}
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
                    {showClassification ? (
                        <Box sx={{ pt: 0.5, pb: 0.5 }}>
                            <MsqdxTypography
                                variant="body2"
                                sx={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
                            >
                                {industry ? (
                                    <>
                                        <Box component="span" sx={{ fontWeight: 600 }}>
                                            {t('projects.industryLabel')}
                                        </Box>
                                        : {industry}
                                    </>
                                ) : null}
                                {industry && mergedTags.length > 0 ? ' · ' : null}
                                {mergedTags.length > 0 ? (
                                    <>
                                        <Box component="span" sx={{ fontWeight: 600 }}>
                                            {t('deepScans.colTags')}
                                        </Box>
                                        : {mergedTags.join(', ')}
                                    </>
                                ) : null}
                            </MsqdxTypography>
                        </Box>
                    ) : projectId ? (
                        <MsqdxTypography
                            variant="caption"
                            sx={{ display: 'block', color: 'var(--color-text-secondary)', pt: 0.5 }}
                        >
                            {t('domainResult.classificationEmptyHint')}
                        </MsqdxTypography>
                    ) : null}
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
