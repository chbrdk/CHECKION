'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxCard,
    MsqdxChip,
    MsqdxTabs,
    MsqdxMoleculeCard,
    MsqdxFormField,
} from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { JourneyResult, JourneyStep } from '@/lib/types';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { SharePanel } from '@/components/SharePanel';
import { AddToProject } from '@/components/AddToProject';

const DomainGraph = dynamic(
    () => import('@/components/DomainGraph').then((m) => ({ default: m.DomainGraph })),
    { ssr: false, loading: () => <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box> }
);

const DomainAggregatedIssueList = dynamic(
    () => import('@/components/DomainAggregatedIssueList').then((m) => ({ default: m.DomainAggregatedIssueList })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);

const JourneyFlowchart = dynamic(
    () => import('@/components/JourneyFlowchart').then((m) => ({ default: m.JourneyFlowchart })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);

const DomainToolsCard = dynamic(
    () => import('@/components/DomainToolsCard').then((m) => ({ default: m.DomainToolsCard })),
    { ssr: false }
);
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import {
    DOMAIN_PAGES_INITIAL,
    DOMAIN_PAGES_INCREMENT,
    apiScanDomainSummary,
    apiScanDomainSummarize,
    apiScanDomainJourney,
    apiJourneys,
    API_JOURNEYS,
    pathResults,
    PATH_HOME,
} from '@/lib/constants';

export default function DomainResultPage() {
    const params = useParams();
    const domainId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const router = useRouter();
    const { t } = useI18n();
    const DOMAIN_TABS = [
        { label: t('domainResult.tabOverview'), value: 0 },
        { label: t('domainResult.tabVisualMap'), value: 1 },
        { label: t('domainResult.tabListDetails'), value: 2 },
        { label: t('domainResult.tabUxCx'), value: 3 },
        { label: t('domainResult.tabVisualAnalysis'), value: 4 },
        { label: t('domainResult.tabUxAudit'), value: 5 },
        { label: t('domainResult.tabStructure'), value: 6 },
        { label: t('domainResult.tabLinksSeo'), value: 7 },
        { label: t('domainResult.tabInfra'), value: 8 },
        { label: t('domainResult.tabGenerative'), value: 9 },
        { label: t('domainResult.tabJourney'), value: 10 },
    ];
    const [result, setResult] = useState<DomainSummaryResponse | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);
    const [journeyGoal, setJourneyGoal] = useState('');
    const [journeyLoading, setJourneyLoading] = useState(false);
    const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    const [journeySaving, setJourneySaving] = useState(false);
    const [journeySaved, setJourneySaved] = useState(false);
    const [journeySaveName, setJourneySaveName] = useState('');

    const searchParams = useSearchParams();
    const pages = (result?.pages ?? []) as SlimPage[];
    const totalPageCount = result?.totalPageCount ?? pages.length;
    const aggregated = result?.aggregated ?? null;
    const pagesByUrl = useMemo(() => new Map(pages.map((p) => [p.url, p])), [pages]);
    const norm = (u: string) => { try { const x = new URL(u); return x.origin + (x.pathname.replace(/\/$/, '') || '/'); } catch { return u; } };
    const pagesByNormUrl = useMemo(() => { const m = new Map<string, SlimPage>(); for (const p of pages) m.set(norm(p.url), p); return m; }, [pages]);
    const [visiblePageCount, setVisiblePageCount] = useState(DOMAIN_PAGES_INITIAL);
    const visiblePages = useMemo(() => pages.slice(0, visiblePageCount), [pages, visiblePageCount]);
    const hasMorePages = pages.length > visiblePageCount;

    useEffect(() => {
        if (!domainId) return;
        setLoadError(null);
        setVisiblePageCount(DOMAIN_PAGES_INITIAL);
        fetch(apiScanDomainSummary(domainId))
            .then(res => {
                if (!res.ok) {
                    setLoadError('not_found');
                    return null;
                }
                return res.json();
            })
            .then((data: DomainSummaryResponse & { projectId?: string | null }) => {
                if (data) {
                    setResult(data);
                    setProjectId(data.projectId ?? null);
                }
            })
            .catch(() => setLoadError('not_found'));
    }, [domainId]);

    const loadMorePages = () => setVisiblePageCount((n) => Math.min(pages.length, n + DOMAIN_PAGES_INCREMENT));

    const restoreJourneyId = searchParams.get('restoreJourney');
    useEffect(() => {
        if (!restoreJourneyId || !domainId) return;
        fetch(apiJourneys(restoreJourneyId))
            .then(res => {
                if (!res.ok) throw new Error(t('domainResult.journeyNotFound'));
                return res.json();
            })
            .then((row: { goal: string; result: JourneyResult }) => {
                setJourneyGoal(row.goal);
                setJourneyResult(row.result);
                setTabValue(10);
            })
            .catch(() => {});
    }, [restoreJourneyId, domainId, t]);

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto', minHeight: 320 }}>
            {loadError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', py: 8 }}>
                    <MsqdxTypography variant="h5" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center', maxWidth: 480 }}>
                        {t('domainResult.notFound')}
                    </MsqdxTypography>
                    <MsqdxButton variant="contained" startIcon={<ArrowLeft size={16} />} onClick={() => router.push(PATH_HOME)}>
                        {t('domainResult.back')}
                    </MsqdxButton>
                </Box>
            )}
            {!result && !loadError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', py: 8 }}>
                    <MsqdxTypography variant="h5" sx={{ mb: 'var(--msqdx-spacing-md)' }}>{t('domainResult.loading')}</MsqdxTypography>
                    <CircularProgress sx={{ color: 'var(--color-theme-accent)' }} />
                </Box>
            )}
            {result && (
        <Box component="span" sx={{ display: 'block' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                        <MsqdxTypography variant="h4" weight="bold">{t('domainResult.title')}</MsqdxTypography>
                        <InfoTooltip title={t('info.domainResult')} ariaLabel={t('common.info')} />
                    </Box>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {result.domain} • {new Date(result.timestamp).toLocaleDateString()}
                    </MsqdxTypography>
                </Box>
                <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxButton variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => router.push(PATH_HOME)}>
                        {t('domainResult.back')}
                    </MsqdxButton>
                    {domainId ? (
                        <Box sx={{ display: 'inline-flex', gap: 'var(--msqdx-spacing-sm)' }}>
                            <AddToProject resourceType="domain" resourceId={domainId} currentProjectId={projectId} onAssigned={() => fetch(apiScanDomainSummary(domainId!)).then((r) => r.json()).then((d: { projectId?: string | null }) => setProjectId(d.projectId ?? null))} />
                            <SharePanel resourceType="domain" resourceId={domainId} labelNamespace="domainResult" />
                        </Box>
                    ) : null}
                </Box>
            </Box>

            <Box sx={{ borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)', mb: 'var(--msqdx-spacing-lg)' }}>
                <MsqdxTabs
                    value={tabValue}
                    onChange={(v) => setTabValue(v as number)}
                    tabs={DOMAIN_TABS}
                />
            </Box>

            {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 'var(--msqdx-spacing-md)' }}>
                    <Box sx={{ flex: '0 0 350px' }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', mb: 'var(--msqdx-spacing-md)' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxTypography variant="h6">{t('domainResult.domainScore')}</MsqdxTypography>
                                <InfoTooltip title={t('info.domainScore')} ariaLabel={t('common.info')} />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 'var(--msqdx-spacing-md)' }}>
                                <Box sx={{
                                    position: 'relative',
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    border: `8px solid ${result.score > 80 ? 'var(--color-secondary-dx-green)' : 'var(--color-secondary-dx-orange)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MsqdxTypography variant="h2">{result.score}</MsqdxTypography>
                                </Box>
                                <MsqdxTypography variant="body2" sx={{ mt: 'var(--msqdx-spacing-md)', color: 'var(--color-text-muted-on-light)' }}>
                                    {result.totalPages} {t('domainResult.pagesScanned')}
                                </MsqdxTypography>
                            </Box>
                        </MsqdxCard>

                        <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                            <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxTypography variant="h6">{t('domainResult.systemicIssues')}</MsqdxTypography>
                                <InfoTooltip title={t('info.systemicIssues')} ariaLabel={t('common.info')} />
                            </Box>
                                {(result.systemicIssues?.length ?? 0) === 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                                        <CheckCircle color="var(--color-secondary-dx-green)" />
                                        <MsqdxTypography>{t('domainResult.noSystemicIssues')}</MsqdxTypography>
                                    </Box>
                                ) : (
                                    (result.systemicIssues ?? []).map((issue, idx) => (
                                        <Box key={idx} sx={{
                                            p: 'var(--msqdx-spacing-md)',
                                            mb: 'var(--msqdx-spacing-md)',
                                            border: '1px solid var(--color-secondary-dx-pink-tint)',
                                            borderRadius: 'var(--msqdx-radius-xs)',
                                            backgroundColor: 'var(--color-secondary-dx-pink-tint)'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                                                <AlertCircle color="var(--color-secondary-dx-pink)" size={20} />
                                                <MsqdxTypography variant="subtitle1" sx={{ color: 'var(--color-secondary-dx-pink)' }}>
                                                    {issue.title}
                                                </MsqdxTypography>
                                                <MsqdxChip label={t('domainResult.issuePagesCount', { count: issue.count })} size="small" brandColor="pink" />
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                                {t('domainResult.fixingRuleAffects', { issueId: issue.issueId, count: issue.count })}
                                            </MsqdxTypography>
                                        </Box>
                                    ))
                                )}
                            </MsqdxCard>
                        </Box>

                        {result.eeat && (
                            <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                                <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                        <MsqdxTypography variant="h6">{t('domainResult.eeatTitle')}</MsqdxTypography>
                                        <InfoTooltip title={t('info.eeat')} ariaLabel={t('common.info')} />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                                        <Box>
                                            <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatTrust')}</MsqdxTypography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                                <MsqdxChip size="small" label={t('domainResult.eeatImpressum', { count: result.eeat.trust.pagesWithImpressum, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithImpressum > 0 ? 'green' : undefined} />
                                                <MsqdxChip size="small" label={t('domainResult.eeatContact', { count: result.eeat.trust.pagesWithContact, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithContact > 0 ? 'green' : undefined} />
                                                <MsqdxChip size="small" label={t('domainResult.eeatPrivacy', { count: result.eeat.trust.pagesWithPrivacy, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithPrivacy > 0 ? 'green' : undefined} />
                                            </Box>
                                        </Box>
                                        <Box>
                                            <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatExperience')}</MsqdxTypography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                                <MsqdxChip size="small" label={t('domainResult.eeatAbout', { count: result.eeat.experience.pagesWithAbout, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithAbout > 0 ? 'green' : undefined} />
                                                <MsqdxChip size="small" label={t('domainResult.eeatTeam', { count: result.eeat.experience.pagesWithTeam, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithTeam > 0 ? 'green' : undefined} />
                                                <MsqdxChip size="small" label={t('domainResult.eeatCaseStudy', { count: result.eeat.experience.pagesWithCaseStudyMention, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithCaseStudyMention > 0 ? 'green' : undefined} />
                                            </Box>
                                        </Box>
                                        <Box>
                                            <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatExpertise')}</MsqdxTypography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', alignItems: 'center' }}>
                                                <MsqdxChip size="small" label={t('domainResult.eeatAuthorBio', { count: result.eeat.expertise.pagesWithAuthorBio, total: result.eeat.expertise.totalPages })} brandColor={result.eeat.expertise.pagesWithAuthorBio > 0 ? 'green' : undefined} />
                                                <MsqdxChip size="small" label={t('domainResult.eeatArticleAuthor', { count: result.eeat.expertise.pagesWithArticleAuthor, total: result.eeat.expertise.totalPages })} brandColor={result.eeat.expertise.pagesWithArticleAuthor > 0 ? 'green' : undefined} />
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>{t('domainResult.eeatAvgCitations', { avg: result.eeat.expertise.avgCitationsPerPage.toFixed(1) })}</MsqdxTypography>
                                            </Box>
                                        </Box>
                                        {result.eeat.authoritativeness !== undefined && result.eeat.authoritativeness && (
                                            <Box>
                                                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatAuthoritativeness')}</MsqdxTypography>
                                                <MsqdxTypography variant="body2">{result.eeat.authoritativeness}</MsqdxTypography>
                                            </Box>
                                        )}
                                    </Box>
                                </MsqdxCard>
                            </Box>
                        )}

                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxTypography variant="h6">{t('domainResult.scannedPages')}</MsqdxTypography>
                                <InfoTooltip title={t('info.scannedPages')} ariaLabel={t('common.info')} />
                            </Box>
                            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 420, overflow: 'auto' }}>
                                {visiblePages.map((page) => (
                                    <Box
                                        component="li"
                                        key={page.id}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
                                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                            borderRadius: 'var(--msqdx-radius-sm)',
                                            mb: 'var(--msqdx-spacing-xs)',
                                            p: 'var(--msqdx-spacing-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 'var(--msqdx-spacing-sm)'
                                        }}
                                        onClick={() => router.push(pathResults(page.id))}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }} noWrap>{page.url}</MsqdxTypography>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                {page.ux?.score ?? 0} UX Score • {page.stats.errors + page.stats.warnings + page.stats.notices} Issues
                                            </MsqdxTypography>
                                        </Box>
                                        <MsqdxChip
                                            label={page.score.toString()}
                                            size="small"
                                            brandColor={page.score > 80 ? 'green' : 'orange'}
                                        />
                                    </Box>
                                ))}
                            </Box>
                            {hasMorePages && (
                                <MsqdxButton size="small" variant="outlined" onClick={loadMorePages} sx={{ mt: 1 }}>
                                    {t('domainResult.showMorePages', { count: Math.min(DOMAIN_PAGES_INCREMENT, totalPageCount - visiblePageCount) })}
                                </MsqdxButton>
                            )}
                        </MsqdxCard>
                    </Box>
                </Box>
            )}

            {tabValue === 1 && (
                <Box>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                        {t('domainResult.visualMapDescription')}
                    </MsqdxTypography>
                    <DomainGraph data={result.graph} width={1200} height={800} />
                </Box>
            )}

            {tabValue === 2 && aggregated && (
                <MsqdxMoleculeCard
                    title="Gefundene Issues (Domain)"
                    headerActions={<InfoTooltip title={t('info.issuesList')} ariaLabel={t('common.info')} />}
                    subtitle={`Aggregiert über ${totalPageCount} Seite(n) · gleiche Kategorien wie Einzel-Scan`}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    borderRadius="lg"
                >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <MsqdxChip label={`Errors: ${aggregated.issues.stats.errors}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                        <MsqdxChip label={`Warnings: ${aggregated.issues.stats.warnings}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                        <MsqdxChip label={`Notices: ${aggregated.issues.stats.notices}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                    </Box>
                    <DomainAggregatedIssueList
                        issues={aggregated.issues.issues}
                        onPageClick={(url) => {
                            const page = pagesByUrl.get(url);
                            if (page) router.push(pathResults(page.id));
                        }}
                    />
                    {aggregated.issues.pagesByIssueCount.some((p) => p.errors > 0 || p.warnings > 0) && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit den meisten Fehlern (Priorisierung)</MsqdxTypography>
                            <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 180, overflow: 'auto' }}>
                                {aggregated.issues.pagesByIssueCount.slice(0, 15).map((row) => {
                                    const page = pagesByUrl.get(row.url);
                                    const label = `${row.errors} Errors, ${row.warnings} Warnings`;
                                    return (
                                        <li key={row.url}>
                                            {page ? (
                                                <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                                    {row.url} — {label}
                                                </MsqdxButton>
                                            ) : (
                                                <MsqdxTypography variant="caption">{row.url} — {label}</MsqdxTypography>
                                            )}
                                        </li>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}

            {tabValue === 3 && (
                <MsqdxMoleculeCard
                    title="UX/CX Check (Domain)"
                    headerActions={<InfoTooltip title={t('info.uxCxCheck')} ariaLabel={t('common.info')} />}
                    subtitle="Bewertung und Handlungsempfehlungen für die gesamte Domain"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                    borderRadius="lg"
                >
                    {result.llmSummary ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            {result.llmSummary.overallGrade && (
                                <MsqdxChip
                                    label={result.llmSummary.overallGrade}
                                    size="small"
                                    sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                                />
                            )}
                            <MsqdxTypography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {result.llmSummary.summary}
                            </MsqdxTypography>
                            {result.llmSummary.themes?.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Themen</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {result.llmSummary.themes.map((t, i) => (
                                            <MsqdxChip
                                                key={i}
                                                label={t.description ? `${t.name}: ${t.description}` : t.name}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    bgcolor: t.severity === 'high' ? alpha(MSQDX_STATUS.error.base, 0.08) : t.severity === 'medium' ? alpha(MSQDX_STATUS.warning.base, 0.08) : undefined,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                            {result.llmSummary.recommendations?.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Handlungsempfehlungen</MsqdxTypography>
                                    <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[...result.llmSummary.recommendations]
                                            .sort((a, b) => a.priority - b.priority)
                                            .map((r, i) => (
                                                <Box component="li" key={i} sx={{ mb: 0.5 }}>
                                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>{r.title}</MsqdxTypography>
                                                    {r.category && (
                                                        <MsqdxChip label={r.category} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                                    )}
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.25 }}>{r.description}</MsqdxTypography>
                                                </Box>
                                            ))}
                                    </Box>
                                </Box>
                            )}
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Generiert mit {result.llmSummary.modelUsed} am <span suppressHydrationWarning>{new Date(result.llmSummary.generatedAt).toLocaleString('de-DE')}</span>.
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                                Hier erscheint eine Gesamtbewertung der Domain und konkrete Handlungsempfehlungen auf Basis aller gescannten Seiten und systemischen Issues.
                            </MsqdxTypography>
                            {summarizeError && (
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{summarizeError}</MsqdxTypography>
                            )}
                            <MsqdxButton
                                variant="contained"
                                brandColor="green"
                                disabled={summarizing || result.status !== 'complete'}
                                onClick={async () => {
                                    if (!result?.id || summarizing) return;
                                    setSummarizeError(null);
                                    setSummarizing(true);
                                    try {
                                        const res = await fetch(apiScanDomainSummarize(result.id), { method: 'POST' });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) throw new Error(data.error ?? 'Fehler beim Generieren');
                                        setResult((prev) => (prev ? { ...prev, llmSummary: data } : null));
                                    } catch (e) {
                                        setSummarizeError(e instanceof Error ? e.message : 'Unbekannter Fehler');
                                    } finally {
                                        setSummarizing(false);
                                    }
                                }}
                            >
                                {summarizing ? 'Wird generiert…' : 'Zusammenfassung generieren'}
                            </MsqdxButton>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}

            {tabValue === 4 && (
                <MsqdxMoleculeCard title="Visuelle Analyse (Domain)" headerActions={<InfoTooltip title={t('info.visualAnalysis')} ariaLabel={t('common.info')} />} subtitle="Focus Order & Touch Targets aus Einzelseiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                        Screenshot, Focus Order und Touch Targets sind pro Seite in den Einzel-Scans sichtbar. Unten: Seiten mit relevanten Einträgen.
                    </MsqdxTypography>
                    {aggregated?.ux && (aggregated.ux.focusOrderByPage.length > 0 || aggregated.ux.tapTargets.detailsByPage.length > 0) ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {aggregated.ux.focusOrderByPage.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit Focus-Order-Einträgen</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {aggregated.ux.focusOrderByPage.map(({ url, count }) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>
                                                    {url} ({count})
                                                </MsqdxButton>
                                            ) : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                            {aggregated.ux.tapTargets.detailsByPage.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit Touch-Target-Problemen</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {aggregated.ux.tapTargets.detailsByPage.map(({ url, count }) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>
                                                    {url} ({count} Probleme)
                                                </MsqdxButton>
                                            ) : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : null}
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 2 }}>Alle Seiten öffnen:</MsqdxTypography>
                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 200, overflow: 'auto' }}>
                        {visiblePages.map((page) => (
                            <Box key={page.id} component="li" sx={{ mb: 0.5 }}>
                                <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{page.url}</MsqdxButton>
                            </Box>
                        ))}
                    </Box>
                    {hasMorePages && (
                        <MsqdxButton size="small" variant="text" onClick={loadMorePages} sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                            {t('domainResult.showMorePages', { count: Math.min(DOMAIN_PAGES_INCREMENT, totalPageCount - visiblePageCount) })}
                        </MsqdxButton>
                    )}
                </MsqdxMoleculeCard>
            )}

            {tabValue === 5 && (
                aggregated?.ux ? (
                <MsqdxMoleculeCard title="UX Audit (Domain)" headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />} subtitle="Aggregierte Werte über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                        <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø UX-Score</MsqdxTypography>
                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, color: aggregated.ux.score >= 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base }}>{aggregated.ux.score}</MsqdxTypography>
                        </Box>
                        <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø CLS</MsqdxTypography>
                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{aggregated.ux.cls}</MsqdxTypography>
                        </Box>
                        <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Kaputte Links (gesamt)</MsqdxTypography>
                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{aggregated.ux.brokenLinks.length}</MsqdxTypography>
                        </Box>
                    </Box>
                    {(aggregated.ux.pagesByScore.length > 0 || aggregated.ux.consoleErrorsByPage.length > 0 || aggregated.ux.tapTargets.detailsByPage.length > 0) && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Erkenntnisse aus Einzelseiten</MsqdxTypography>
                            {aggregated.ux.pagesByScore.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit niedrigstem UX-Score (zuerst prüfen)</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {aggregated.ux.pagesByScore.slice(0, 8).map(({ url, score, cls }) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>
                                                    {url} — Score {score}, CLS {cls}
                                                </MsqdxButton>
                                            ) : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                            {aggregated.ux.consoleErrorsByPage.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit Console-Errors</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {aggregated.ux.consoleErrorsByPage.slice(0, 6).map(({ url, count }) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                                    {url} ({count})
                                                </MsqdxButton>
                                            ) : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                            {aggregated.ux.tapTargets.detailsByPage.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit Touch-Target-Problemen</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {aggregated.ux.tapTargets.detailsByPage.slice(0, 6).map(({ url, count }) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url} ({count})</MsqdxButton>
                                            ) : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                    {aggregated.ux.brokenLinks.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Kaputte Links (Seite)</MsqdxTypography>
                            <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 200, overflow: 'auto' }}>
                                {aggregated.ux.brokenLinks.slice(0, 30).map((l, i) => (
                                    <li key={i}>
                                        <MsqdxTypography variant="caption">{l.href} → {l.pageUrl} (HTTP {l.status})</MsqdxTypography>
                                    </li>
                                ))}
                                {aggregated.ux.brokenLinks.length > 30 && (
                                    <li><MsqdxTypography variant="caption">… und {aggregated.ux.brokenLinks.length - 30} weitere</MsqdxTypography></li>
                                )}
                            </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
                ) : (
                    <MsqdxMoleculeCard title="UX Audit (Domain)" headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine UX-Daten über die gescannten Seiten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 6 && (
                aggregated?.structure ? (
                <MsqdxMoleculeCard title="Struktur & Semantik (Domain)" headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />} subtitle="Überschriften-Hierarchie über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <MsqdxChip label={`Seiten mit mehreren H1: ${aggregated.structure.pagesWithMultipleH1.length}`} size="small" brandColor="pink" />
                        <MsqdxChip label={`Seiten mit übersprungenen Leveln: ${aggregated.structure.pagesWithSkippedLevels.length}`} size="small" brandColor="yellow" />
                        {aggregated.structure.pagesWithGoodStructure.length > 0 && (
                            <MsqdxChip label={`Seiten mit guter Struktur: ${aggregated.structure.pagesWithGoodStructure.length}`} size="small" brandColor="green" />
                        )}
                    </Box>
                    {aggregated.structure.pagesWithGoodStructure.length > 0 && aggregated.structure.pagesWithGoodStructure.length <= 10 && (
                        <Box sx={{ mb: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit guter Überschriften-Struktur</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {aggregated.structure.pagesWithGoodStructure.map((url) => {
                                    const page = pagesByUrl.get(url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
                                    ) : (
                                        <MsqdxTypography key={url} variant="caption">{url}</MsqdxTypography>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                    {aggregated.structure.pagesWithMultipleH1.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit mehreren H1</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {aggregated.structure.pagesWithMultipleH1.map((url) => {
                                    const page = pagesByUrl.get(url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
                                    ) : (
                                        <MsqdxTypography key={url} variant="caption" sx={{ display: 'block' }}>{url}</MsqdxTypography>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                    {aggregated.structure.pagesWithSkippedLevels.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit übersprungenen Überschriften-Leveln</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {aggregated.structure.pagesWithSkippedLevels.map((url) => {
                                    const page = pagesByUrl.get(url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
                                    ) : (
                                        <MsqdxTypography key={url} variant="caption">{url}</MsqdxTypography>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
                ) : (
                    <MsqdxMoleculeCard title="Struktur & Semantik (Domain)" headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Struktur-Daten (Überschriften) verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 7 && aggregated && (
                (aggregated.seo || aggregated.links) ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
                    {aggregated.seo && (
                        <MsqdxMoleculeCard title="SEO (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} subtitle="Meta, Keywords seitenübergreifend, Inhaltsdichte" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Meta & Struktur</MsqdxTypography>
                                    <Box sx={{ display: 'grid', gap: 0.5 }}>
                                        <MsqdxTypography variant="body2">Seiten mit Title: {aggregated.seo.withTitle} / {aggregated.seo.totalPages}</MsqdxTypography>
                                        <MsqdxTypography variant="body2">Seiten mit Meta-Description: {aggregated.seo.withMetaDescription} / {aggregated.seo.totalPages}</MsqdxTypography>
                                        <MsqdxTypography variant="body2">Seiten mit H1: {aggregated.seo.withH1} / {aggregated.seo.totalPages}</MsqdxTypography>
                                        {aggregated.seo.totalWordsAcrossPages > 0 && (
                                            <MsqdxTypography variant="body2">Wörter gesamt (alle Seiten): {aggregated.seo.totalWordsAcrossPages.toLocaleString('de-DE')}</MsqdxTypography>
                                        )}
                                    </Box>
                                    {aggregated.seo.missingMetaDescriptionUrls.length > 0 && (
                                        <Box sx={{ mt: 1 }}>
                                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Ohne Meta-Description:</MsqdxTypography>
                                            {aggregated.seo.missingMetaDescriptionUrls.slice(0, 5).map((url) => {
                                                const page = pagesByUrl.get(url);
                                                return page ? <Box key={url}><MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url}</MsqdxButton></Box> : null;
                                            })}
                                        </Box>
                                    )}
                                </Box>

                                {aggregated.seo.crossPageKeywords.length > 0 && (
                                    <Box>
                                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Keywords seitenübergreifend (Top)</MsqdxTypography>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                                            Begriffe, die auf mehreren Seiten vorkommen; sortiert nach Gesamt-Vorkommen.
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {aggregated.seo.crossPageKeywords.slice(0, 25).map((kw) => (
                                                <MsqdxChip
                                                    key={kw.keyword}
                                                    label={`${kw.keyword} (${kw.totalCount}×, ${kw.pageCount} Seite(n), Ø ${kw.avgDensityPercent}%)`}
                                                    size="small"
                                                    sx={{ fontSize: '0.7rem', height: 22 }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten nach Inhalt & Dichte</MsqdxTypography>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                                        Sortiert nach Wortanzahl; &lt;300 Wörter = Skinny Content.
                                    </MsqdxTypography>
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 280, overflow: 'auto' }}>
                                        {aggregated.seo.pages.map((row) => {
                                            const page = pagesByUrl.get(row.url);
                                            return (
                                                <Box
                                                    component="li"
                                                    key={row.url}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        py: 0.5,
                                                        borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    {page ? (
                                                        <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem', flex: '1 1 auto', minWidth: 0, justifyContent: 'flex-start' }}>
                                                            {row.url}
                                                        </MsqdxButton>
                                                    ) : (
                                                        <MsqdxTypography variant="caption" sx={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.url}</MsqdxTypography>
                                                    )}
                                                    <MsqdxTypography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{row.wordCount.toLocaleString('de-DE')} Wörter</MsqdxTypography>
                                                    {row.topKeywordCount > 0 && (
                                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>{row.topKeywordCount} Top-Keywords</MsqdxTypography>
                                                    )}
                                                    {row.isSkinny && (
                                                        <MsqdxChip label="Skinny" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'var(--color-secondary-dx-orange-tint)', color: 'var(--color-secondary-dx-orange)' }} />
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Box>
                        </MsqdxMoleculeCard>
                    )}
                    {aggregated.links && (
                        <MsqdxMoleculeCard title="Links (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} subtitle="Kaputte Links über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <MsqdxTypography variant="body2">Kaputte Links gesamt: {aggregated.links.broken.length}</MsqdxTypography>
                                <MsqdxTypography variant="body2">Eindeutige kaputte URLs: {aggregated.links.uniqueBrokenUrls}</MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Total Links: {aggregated.links.totalLinks} (intern: {aggregated.links.internal}, extern: {aggregated.links.external})</MsqdxTypography>
                                {aggregated.links.brokenByPage.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Seiten mit den meisten kaputten Links</MsqdxTypography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            {aggregated.links.brokenByPage.slice(0, 10).map(({ url, count }) => {
                                                const page = pagesByUrl.get(url);
                                                return (
                                                    <li key={url}>
                                                        {page ? (
                                                            <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url} — {count} kaputt</MsqdxButton>
                                                        ) : (
                                                            <MsqdxTypography variant="caption">{url} — {count} kaputt</MsqdxTypography>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </MsqdxMoleculeCard>
                    )}
                </Box>
                ) : (
                    <MsqdxMoleculeCard title="Links & SEO (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine SEO- oder Link-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 8 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                {result?.domain && <DomainToolsCard domainUrl={`https://${result.domain}`} />}
                {aggregated?.infra ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxMoleculeCard title="Privacy (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MsqdxTypography variant="body2">Seiten mit Datenschutz: {aggregated.infra.privacy.withPolicy} / {aggregated.infra.privacy.totalPages}</MsqdxTypography>
                            <MsqdxTypography variant="body2">Seiten mit Cookie-Banner: {aggregated.infra.privacy.withCookieBanner} / {aggregated.infra.privacy.totalPages}</MsqdxTypography>
                            <MsqdxTypography variant="body2">Seiten mit AGB: {aggregated.infra.privacy.withTerms} / {aggregated.infra.privacy.totalPages}</MsqdxTypography>
                            {(aggregated.infra.privacy.urlsWithPolicy.length > 0 || aggregated.infra.privacy.urlsWithCookieBanner.length > 0) && (
                                <Box sx={{ mt: 1 }}>
                                    {aggregated.infra.privacy.urlsWithPolicy.length > 0 && aggregated.infra.privacy.urlsWithPolicy.length <= 8 && (
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>URLs mit Datenschutz:</MsqdxTypography>
                                    )}
                                    {aggregated.infra.privacy.urlsWithPolicy.length > 0 && aggregated.infra.privacy.urlsWithPolicy.length <= 8 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {aggregated.infra.privacy.urlsWithPolicy.slice(0, 5).map((url) => {
                                                const page = pagesByUrl.get(url);
                                                return page ? <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>{url}</MsqdxButton> : null;
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </MsqdxMoleculeCard>
                    <MsqdxMoleculeCard title="Security (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MsqdxTypography variant="body2">Seiten mit CSP: {aggregated.infra.security.withCsp} / {aggregated.infra.security.totalPages}</MsqdxTypography>
                            <MsqdxTypography variant="body2">Seiten mit X-Frame-Options: {aggregated.infra.security.withXFrame} / {aggregated.infra.security.totalPages}</MsqdxTypography>
                            {aggregated.infra.security.urlsWithCsp.length > 0 && aggregated.infra.security.urlsWithCsp.length <= 8 && (
                                <Box sx={{ mt: 1 }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit CSP:</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {aggregated.infra.security.urlsWithCsp.slice(0, 5).map((url) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>{url}</MsqdxButton> : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </MsqdxMoleculeCard>
                </Box>
                ) : (
                    <MsqdxMoleculeCard title="Infrastruktur & Privacy (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Infrastruktur-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )}
                </Box>
            )}

            {tabValue === 9 && (
                aggregated?.generative ? (
                <MsqdxMoleculeCard title="Generative Search / GEO (Domain)" headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />} subtitle="Aggregiert über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø GEO-Score</MsqdxTypography>
                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{aggregated.generative.score}</MsqdxTypography>
                        </Box>
                        <MsqdxChip label={`Seiten mit llms.txt: ${aggregated.generative.withLlmsTxt} / ${aggregated.generative.pageCount}`} size="small" />
                        <MsqdxChip label={`Seiten mit robots (AI erlaubt): ${aggregated.generative.withRobotsAllowingAi} / ${aggregated.generative.pageCount}`} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <MsqdxTypography variant="caption">Ø FAQ-Anzahl: {aggregated.generative.contentSummary.avgFaqCount}</MsqdxTypography>
                        <MsqdxTypography variant="caption">Ø Listen-Dichte: {aggregated.generative.contentSummary.avgListDensity}</MsqdxTypography>
                        <MsqdxTypography variant="caption">Ø Zitat-Dichte: {aggregated.generative.contentSummary.avgCitationDensity}</MsqdxTypography>
                    </Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Pro Seite (Score, llms.txt, empfohlenes Schema)</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 300, overflow: 'auto' }}>
                        {aggregated.generative.pages.map((p) => {
                            const page = pagesByUrl.get(p.url);
                            const badges = [`Score ${p.score}`, p.hasLlmsTxt && 'llms.txt', p.hasRecommendedSchema && 'Schema'].filter(Boolean).join(' · ');
                            return (
                                <li key={p.url}>
                                    {page ? (
                                        <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                                            {p.url} — {badges || '—'}
                                        </MsqdxButton>
                                    ) : (
                                        <MsqdxTypography variant="caption">{p.url} — {badges || p.score}</MsqdxTypography>
                                    )}
                                </li>
                            );
                        })}
                    </Box>
                </MsqdxMoleculeCard>
                ) : (
                    <MsqdxMoleculeCard title="Generative Search / GEO (Domain)" headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine GEO-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 10 && (
                <MsqdxMoleculeCard
                    title={t('domainResult.journeyTitle')}
                    headerActions={<InfoTooltip title={t('domainResult.journeyDescription')} ariaLabel={t('common.info')} />}
                    subtitle={t('domainResult.journeySubtitle')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    borderRadius="lg"
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 200, maxWidth: 480 }}>
                                <MsqdxFormField
                                    label={t('domainResult.journeyGoalLabel')}
                                    placeholder={t('domainResult.journeyPlaceholder')}
                                    value={journeyGoal}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJourneyGoal(e.target.value)}
                                    disabled={journeyLoading}
                                />
                            </Box>
                            <MsqdxButton
                                variant="contained"
                                brandColor="green"
                                disabled={journeyLoading || !journeyGoal.trim()}
                                onClick={async () => {
                                    if (!domainId || !journeyGoal.trim()) return;
                                    setJourneyError(null);
                                    setJourneyResult(null);
                                    setJourneyLoading(true);
                                    try {
                                        const res = await fetch(apiScanDomainJourney(domainId), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ goal: journeyGoal.trim(), stream: true }),
                                        });
                                        if (!res.ok) {
                                            const data = await res.json().catch(() => ({}));
                                            throw new Error(data.error ?? t('domainResult.journeyError'));
                                        }
                                        const reader = res.body?.getReader();
                                        const decoder = new TextDecoder();
                                        if (!reader) {
                                            setJourneyError(t('domainResult.journeyError'));
                                            return;
                                        }
                                        let buffer = '';
                                        const streamedSteps: JourneyStep[] = [];
                                        while (true) {
                                            const { done, value } = await reader.read();
                                            if (done) break;
                                            buffer += decoder.decode(value, { stream: true });
                                            const lines = buffer.split('\n\n');
                                            buffer = lines.pop() ?? '';
                                            for (const line of lines) {
                                                const dataMatch = line.match(/^data:\s*(.+)$/m);
                                                if (!dataMatch) continue;
                                                try {
                                                    const event = JSON.parse(dataMatch[1].trim()) as { type: string; step?: JourneyStep; result?: JourneyResult; message?: string };
                                                    if (event.type === 'step' && event.step) {
                                                        streamedSteps.push(event.step);
                                                        setJourneyResult({ steps: [...streamedSteps], goalReached: false });
                                                    } else if (event.type === 'done' && event.result) {
                                                        setJourneyResult(event.result);
                                                    } else if (event.type === 'error' && event.message) {
                                                        setJourneyError(event.message);
                                                    }
                                                } catch {
                                                    // ignore parse errors for partial chunks
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        setJourneyError(e instanceof Error ? e.message : t('domainResult.journeyError'));
                                    } finally {
                                        setJourneyLoading(false);
                                    }
                                }}
                            >
                                {journeyLoading ? t('domainResult.journeyLoading') : t('domainResult.journeyButton')}
                            </MsqdxButton>
                        </Box>
                        {journeyError && (
                            <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{journeyError}</MsqdxTypography>
                        )}
                        {journeyResult && (
                            <>
                                <JourneyFlowchart
                                    steps={journeyResult.steps}
                                    goalReached={journeyResult.goalReached}
                                    message={journeyResult.message}
                                    streaming={journeyLoading}
                                    t={t}
                                    pages={pages}
                                    onStepClick={(step) => {
                                        const norm = (u: string) => { try { const x = new URL(u); return x.origin + (x.pathname.replace(/\/$/, '') || '/'); } catch { return u; } };
                                        const page = pagesByNormUrl.get(norm(step.pageUrl));
                                        if (page) router.push(pathResults(page.id));
                                    }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', pt: 1 }}>
                                    <Box sx={{ minWidth: 200, maxWidth: 320 }}>
                                        <MsqdxFormField
                                            label={t('domainResult.journeySaveNameLabel')}
                                            placeholder={t('domainResult.journeySaveNamePlaceholder')}
                                            value={journeySaveName}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJourneySaveName(e.target.value)}
                                            disabled={journeySaving}
                                        />
                                    </Box>
                                    <MsqdxButton
                                        variant="outlined"
                                        disabled={journeySaving || journeySaved}
                                        onClick={async () => {
                                            if (!domainId || !journeyResult) return;
                                            setJourneySaving(true);
                                            try {
                                                const res = await fetch(API_JOURNEYS, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        domainScanId: domainId,
                                                        goal: journeyGoal,
                                                        result: journeyResult,
                                                        name: journeySaveName.trim() || undefined,
                                                    }),
                                                });
                                                if (!res.ok) throw new Error('Save failed');
                                                const data = await res.json().catch(() => ({}));
                                                setJourneySaved(true);
                                                if (data?.id && domainId) {
                                                    router.replace(`/domain/${domainId}?restoreJourney=${data.id}`, { scroll: false });
                                                }
                                            } catch {
                                                setJourneyError(t('domainResult.journeySaveError'));
                                            } finally {
                                                setJourneySaving(false);
                                            }
                                        }}
                                    >
                                        {journeySaving ? t('domainResult.journeySaving') : journeySaved ? t('domainResult.journeySaved') : t('domainResult.journeySave')}
                                    </MsqdxButton>
                                </Box>
                            </>
                        )}
                    </Box>
                </MsqdxMoleculeCard>
            )}
        </Box>
            )}
        </Box>
    );
}
