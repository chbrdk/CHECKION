'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Box, CircularProgress, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxCard,
    MsqdxChip,
    MsqdxTabs,
    MsqdxMoleculeCard,
} from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import { useParams, useRouter } from 'next/navigation';
import type { DomainScanResult } from '@/lib/types';
import {
    aggregateIssues,
    aggregateUx,
    aggregateSeo,
    aggregateLinks,
    aggregateInfra,
    aggregateGenerative,
    aggregateStructure,
} from '@/lib/domain-aggregation';
import { DomainGraph } from '@/components/DomainGraph';
import { DomainAggregatedIssueList } from '@/components/DomainAggregatedIssueList';
import { ArrowLeft, Share2, AlertCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';

export default function DomainResultPage() {
    const params = useParams();
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
    ];
    const [result, setResult] = useState<DomainScanResult | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);

    const pages = result?.pages ?? [];
    const aggregated = useMemo(() => {
        if (pages.length === 0) return null;
        return {
            issues: aggregateIssues(pages),
            ux: aggregateUx(pages),
            seo: aggregateSeo(pages),
            links: aggregateLinks(pages),
            infra: aggregateInfra(pages),
            generative: aggregateGenerative(pages),
            structure: aggregateStructure(pages),
        };
    }, [result]);

    useEffect(() => {
        if (!params.id) return;
        fetch(`/api/scan/domain/${params.id}/status`)
            .then(res => {
                if (!res.ok) throw new Error('Scan not found');
                return res.json();
            })
            .then(data => setResult(data))
            .catch(err => console.error('Failed to load scan', err));
    }, [params.id]);

    if (!result) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="h5" sx={{ mb: 'var(--msqdx-spacing-md)' }}>{t('domainResult.loading')}</MsqdxTypography>
                <CircularProgress sx={{ color: 'var(--color-theme-accent)' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
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
                    <MsqdxButton variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => router.push('/')}>
                        {t('domainResult.back')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" startIcon={<Share2 size={16} />}>
                        {t('domainResult.share')}
                    </MsqdxButton>
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
                                                <MsqdxChip label={`${issue.count} pages`} size="small" brandColor="pink" />
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                                Fixing rule ({issue.issueId}) affects {issue.count} pages.
                                            </MsqdxTypography>
                                        </Box>
                                    ))
                                )}
                            </MsqdxCard>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxTypography variant="h6">{t('domainResult.scannedPages')}</MsqdxTypography>
                                <InfoTooltip title={t('info.scannedPages')} ariaLabel={t('common.info')} />
                            </Box>
                            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                {(result.pages ?? []).map((page, idx) => (
                                    <Box
                                        component="li"
                                        key={idx}
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
                                        onClick={() => router.push(`/results/${page.id}`)}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>{page.url}</MsqdxTypography>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                {page.ux?.score ?? 0} UX Score • {page.issues.length} Issues
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
                        </MsqdxCard>
                    </Box>
                </Box>
            )}

            {tabValue === 1 && (
                <Box>
                    <DomainGraph data={result.graph} width={1200} height={800} />
                </Box>
            )}

            {tabValue === 2 && aggregated && (
                <MsqdxMoleculeCard
                    title="Gefundene Issues (Domain)"
                    subtitle={`Aggregiert über ${pages.length} Seite(n) · gleiche Kategorien wie Einzel-Scan`}
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
                            const page = pages.find((p) => p.url === url);
                            if (page) router.push(`/results/${page.id}`);
                        }}
                    />
                    {aggregated.issues.pagesByIssueCount.some((p) => p.errors > 0 || p.warnings > 0) && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit den meisten Fehlern (Priorisierung)</MsqdxTypography>
                            <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 180, overflow: 'auto' }}>
                                {aggregated.issues.pagesByIssueCount.slice(0, 15).map((row) => {
                                    const page = pages.find((p) => p.url === row.url);
                                    const label = `${row.errors} Errors, ${row.warnings} Warnings`;
                                    return (
                                        <li key={row.url}>
                                            {page ? (
                                                <MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
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
                                Generiert mit {result.llmSummary.modelUsed} am {new Date(result.llmSummary.generatedAt).toLocaleString('de-DE')}.
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
                                        const res = await fetch(`/api/scan/domain/${result.id}/summarize`, { method: 'POST' });
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
                <MsqdxMoleculeCard title="Visuelle Analyse (Domain)" subtitle="Focus Order & Touch Targets aus Einzelseiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                                            const page = pages.find((p) => p.url === url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>
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
                                            const page = pages.find((p) => p.url === url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>
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
                        {(result.pages ?? []).map((page) => (
                            <Box key={page.id} component="li" sx={{ mb: 0.5 }}>
                                <MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{page.url}</MsqdxButton>
                            </Box>
                        ))}
                    </Box>
                </MsqdxMoleculeCard>
            )}

            {tabValue === 5 && (
                aggregated?.ux ? (
                <MsqdxMoleculeCard title="UX Audit (Domain)" subtitle="Aggregierte Werte über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                                            const page = pages.find((p) => p.url === url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="outlined" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>
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
                                            const page = pages.find((p) => p.url === url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
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
                                            const page = pages.find((p) => p.url === url);
                                            return page ? (
                                                <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url} ({count})</MsqdxButton>
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
                    <MsqdxMoleculeCard title="UX Audit (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine UX-Daten über die gescannten Seiten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 6 && (
                aggregated?.structure ? (
                <MsqdxMoleculeCard title="Struktur & Semantik (Domain)" subtitle="Überschriften-Hierarchie über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                                    const page = pages.find((p) => p.url === url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
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
                                    const page = pages.find((p) => p.url === url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
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
                                    const page = pages.find((p) => p.url === url);
                                    return page ? (
                                        <MsqdxButton key={url} variant="outlined" size="small" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none' }}>{url}</MsqdxButton>
                                    ) : (
                                        <MsqdxTypography key={url} variant="caption">{url}</MsqdxTypography>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
                ) : (
                    <MsqdxMoleculeCard title="Struktur & Semantik (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Struktur-Daten (Überschriften) verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 7 && aggregated && (
                (aggregated.seo || aggregated.links) ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
                    {aggregated.seo && (
                        <MsqdxMoleculeCard title="SEO (Domain)" subtitle="Meta, Keywords seitenübergreifend, Inhaltsdichte" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                                                const page = pages.find((p) => p.url === url);
                                                return page ? <Box key={url}><MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url}</MsqdxButton></Box> : null;
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
                                            const page = pages.find((p) => p.url === row.url);
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
                                                        <MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem', flex: '1 1 auto', minWidth: 0, justifyContent: 'flex-start' }}>
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
                        <MsqdxMoleculeCard title="Links (Domain)" subtitle="Kaputte Links über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <MsqdxTypography variant="body2">Kaputte Links gesamt: {aggregated.links.broken.length}</MsqdxTypography>
                                <MsqdxTypography variant="body2">Eindeutige kaputte URLs: {aggregated.links.uniqueBrokenUrls}</MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Total Links: {aggregated.links.totalLinks} (intern: {aggregated.links.internal}, extern: {aggregated.links.external})</MsqdxTypography>
                                {aggregated.links.brokenByPage.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Seiten mit den meisten kaputten Links</MsqdxTypography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            {aggregated.links.brokenByPage.slice(0, 10).map(({ url, count }) => {
                                                const page = pages.find((p) => p.url === url);
                                                return (
                                                    <li key={url}>
                                                        {page ? (
                                                            <MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>{url} — {count} kaputt</MsqdxButton>
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
                    <MsqdxMoleculeCard title="Links & SEO (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine SEO- oder Link-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 8 && (
                aggregated?.infra ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxMoleculeCard title="Privacy (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                                                const page = pages.find((p) => p.url === url);
                                                return page ? <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>{url}</MsqdxButton> : null;
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </MsqdxMoleculeCard>
                    <MsqdxMoleculeCard title="Security (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MsqdxTypography variant="body2">Seiten mit CSP: {aggregated.infra.security.withCsp} / {aggregated.infra.security.totalPages}</MsqdxTypography>
                            <MsqdxTypography variant="body2">Seiten mit X-Frame-Options: {aggregated.infra.security.withXFrame} / {aggregated.infra.security.totalPages}</MsqdxTypography>
                            {aggregated.infra.security.urlsWithCsp.length > 0 && aggregated.infra.security.urlsWithCsp.length <= 8 && (
                                <Box sx={{ mt: 1 }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit CSP:</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {aggregated.infra.security.urlsWithCsp.slice(0, 5).map((url) => {
                                            const page = pages.find((p) => p.url === url);
                                            return page ? <MsqdxButton key={url} size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>{url}</MsqdxButton> : null;
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </MsqdxMoleculeCard>
                </Box>
                ) : (
                    <MsqdxMoleculeCard title="Infrastruktur & Privacy (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Infrastruktur-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}

            {tabValue === 9 && (
                aggregated?.generative ? (
                <MsqdxMoleculeCard title="Generative Search / GEO (Domain)" subtitle="Aggregiert über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
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
                            const page = pages.find((x) => x.url === p.url);
                            const badges = [`Score ${p.score}`, p.hasLlmsTxt && 'llms.txt', p.hasRecommendedSchema && 'Schema'].filter(Boolean).join(' · ');
                            return (
                                <li key={p.url}>
                                    {page ? (
                                        <MsqdxButton size="small" variant="text" onClick={() => router.push(`/results/${page.id}`)} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
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
                    <MsqdxMoleculeCard title="Generative Search / GEO (Domain)" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine GEO-Daten verfügbar.</MsqdxTypography>
                    </MsqdxMoleculeCard>
                )
            )}
        </Box>
    );
}
