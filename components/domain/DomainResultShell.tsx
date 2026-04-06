'use client';

import Link from 'next/link';
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
import { pathDomainSection } from '@/lib/domain-result-sections';

const NAV_SLUGS = [
    { slug: 'overview' as const, labelKey: 'domainResult.tabOverview' },
    { slug: 'visual-map' as const, labelKey: 'domainResult.tabVisualMap' },
    { slug: 'list-details' as const, labelKey: 'domainResult.tabListDetails' },
    { slug: 'ux-cx' as const, labelKey: 'domainResult.tabUxCx' },
    { slug: 'visual-analysis' as const, labelKey: 'domainResult.tabVisualAnalysis' },
    { slug: 'ux-audit' as const, labelKey: 'domainResult.tabUxAudit' },
    { slug: 'structure' as const, labelKey: 'domainResult.tabStructure' },
    { slug: 'links-seo' as const, labelKey: 'domainResult.tabLinksSeo' },
    { slug: 'infra' as const, labelKey: 'domainResult.tabInfra' },
    { slug: 'generative' as const, labelKey: 'domainResult.tabGenerative' },
    { slug: 'page-topics' as const, labelKey: 'domainResult.tabPageTopics' },
    { slug: 'journey' as const, labelKey: 'domainResult.tabJourney' },
] as const;

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

            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mb: 'var(--msqdx-spacing-lg)',
                    pb: 1,
                    borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    rowGap: 0.75,
                }}
            >
                {NAV_SLUGS.map(({ slug, labelKey }) => {
                    const href = pathDomainSection(
                        domainId,
                        slug,
                        Object.keys(domainLinkQuery).length ? domainLinkQuery : undefined
                    );
                    const selected = activeSection === slug;
                    return (
                        <Link key={slug} href={href} style={{ textDecoration: 'none' }}>
                            <Box
                                component="span"
                                sx={{
                                    display: 'inline-block',
                                    px: 1.25,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.875rem',
                                    fontWeight: selected ? 600 : 400,
                                    color: selected ? 'var(--color-theme-accent)' : 'var(--color-text-on-light)',
                                    bgcolor: selected ? 'var(--color-secondary-dx-grey-light-tint)' : 'transparent',
                                    border: selected ? '1px solid var(--color-theme-accent)' : '1px solid transparent',
                                    '&:hover': { bgcolor: 'var(--color-secondary-dx-grey-light-tint)' },
                                }}
                            >
                                {t(labelKey)}
                            </Box>
                        </Link>
                    );
                })}
            </Box>

            {children}
        </Box>
    );
}
