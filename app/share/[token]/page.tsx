'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, alpha, Dialog, DialogTitle, DialogContent, IconButton, Button } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip, MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTooltip, MsqdxAccordion, MsqdxAccordionItem, MsqdxTabs } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS, MSQDX_NEUTRAL, MSQDX_THEME, MSQDX_SPACING } from '@msqdx/tokens';
import { CompetitivePositionDiagram } from '@/components/CompetitivePositionDiagram';
import type { CompetitiveBenchmarkResult } from '@/lib/types';
import { SaliencyHeatmapOverlay } from '@/components/SaliencyHeatmapOverlay';
import { PageIndexRegionsOverlay } from '@/components/PageIndexRegionsOverlay';
import { FocusOrderOverlay } from '@/components/FocusOrderOverlay';
import { PageIndexCard } from '@/components/PageIndexCard';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { ScanResult, UxJourneyAgentStep } from '@/lib/types';
import {
    SHARE_DOMAIN_PAGES_PAGE_SIZE,
    apiShareToken,
    apiShareTokenAccess,
    apiShareTokenPages,
    apiShareTokenPagesScreenshot,
} from '@/lib/constants';
import { useI18n } from '@/components/i18n/I18nProvider';
import { DomainResultPageTopicsCard } from '@/components/domain/DomainResultPageTopicsCard';

/** Journey share payload (from GET /api/share/[token] when type=journey). */
export interface ShareJourneyData {
    steps?: UxJourneyAgentStep[];
    success?: boolean;
    taskDescription?: string;
    siteDomain?: string;
    videoUrl?: string;
    jobId?: string;
}

/** GEO/E-E-A-T share payload (from GET /api/share/[token] when type=geo_eeat). */
export interface ShareGeoEeatData {
    jobId: string;
    url: string;
    payload?: import('@/lib/types').GeoEeatIntensiveResult;
}

// --- Status colors: sofort erkennen ob optimal oder nicht
const STATUS = {
    good: MSQDX_BRAND_PRIMARY.green,
    warning: MSQDX_STATUS.warning.base,
    error: MSQDX_STATUS.error.base,
    neutral: 'var(--color-text-muted-on-light)',
};

function getScoreColor(score: number): string {
    if (score >= 80) return STATUS.good;
    if (score >= 50) return STATUS.warning;
    return STATUS.error;
}

function getRatioColor(ratio: number): string {
    if (ratio >= 1) return STATUS.good;
    if (ratio >= 0.5) return STATUS.warning;
    return STATUS.error;
}

/** Performance: lower is better. Thresholds (ms) for LCP/TTFB etc. */
function getPerformanceColor(value: number, kind: 'ttfb' | 'fcp' | 'lcp' | 'dom'): string {
    const limits = { ttfb: 800, fcp: 1800, lcp: 2500, dom: 4000 };
    const limit = limits[kind];
    if (value <= limit * 0.6) return STATUS.good;
    if (value <= limit) return STATUS.warning;
    return STATUS.error;
}

const ECO_GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
function getEcoGradeColor(grade: string): string {
    const i = ECO_GRADE_ORDER.indexOf(grade);
    if (i <= 1) return STATUS.good;
    if (i <= 3) return STATUS.warning;
    return STATUS.error;
}

/** CO2 (g): lower is better. Rough: &lt;0.5 good, &lt;1 warning, else error. */
function getEcoCo2Color(co2: number): string {
    if (co2 <= 0.5) return STATUS.good;
    if (co2 <= 1) return STATUS.warning;
    return STATUS.error;
}

/** Circular score ring (0–100) with color. */
function ScoreRing({ score, size = 56, label }: { score: number; size?: number; label?: string }) {
    const color = getScoreColor(score);
    const pct = Math.min(100, Math.max(0, score));
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `conic-gradient(${color} 0% ${pct}%, ${alpha(color, 0.15)} ${pct}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Box sx={{
                    width: size - 10,
                    height: size - 10,
                    borderRadius: '50%',
                    bgcolor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <MsqdxTypography variant="h6" sx={{ fontWeight: 700, color }}>{Math.round(score)}</MsqdxTypography>
                </Box>
            </Box>
            {label && <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{label}</MsqdxTypography>}
        </Box>
    );
}

/** Horizontal bar: value/total with color. */
function MetricBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <Box sx={{ width: '100%', minWidth: 120 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{label}</MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color }}>{value} / {total}</MsqdxTypography>
            </Box>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.15), overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
            </Box>
        </Box>
    );
}

/** Single metric box with optional status color. */
function MetricBox({ label, value, unit, statusColor }: { label: string; value: number | string; unit?: string; statusColor?: string }) {
    return (
        <Box sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            bgcolor: statusColor ? alpha(statusColor, 0.08) : 'transparent',
            border: statusColor ? `1px solid ${alpha(statusColor, 0.3)}` : '1px solid transparent',
        }}>
            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, display: 'block' }}>{label}</MsqdxTypography>
            <MsqdxTypography variant="body1" sx={{ fontWeight: 700, color: statusColor || 'inherit' }}>{value}{unit ?? ''}</MsqdxTypography>
        </Box>
    );
}

type SharePayload =
    | { type: 'domain'; data: DomainSummaryResponse }
    | { type: 'single'; data: ScanResult }
    | { type: 'journey'; data: ShareJourneyData }
    | { type: 'geo_eeat'; data: ShareGeoEeatData };

const SHARE_ACCESS_STORAGE_KEY = 'checkion_share_access';

export default function ShareLandingPage() {
    const { t } = useI18n();
    const params = useParams();
    const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : undefined;
    const [payload, setPayload] = useState<SharePayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    const loadWithAuth = useCallback(
        (authToken: string) => {
            const tokenStr = token;
            if (!tokenStr) return Promise.reject(new Error('No token'));
            return fetch(apiShareToken(tokenStr), {
                headers: { Authorization: `Bearer ${authToken}` },
            })
                .then((res) => {
                    if (res.status === 403) {
                        const clone = res.clone();
                        return clone.json().then((b) => (b.requiresPassword ? Promise.reject(new Error('PASSWORD_REQUIRED')) : res));
                    }
                    if (!res.ok) throw new Error(res.status === 404 ? t('share.linkInvalidOrExpired') : t('share.loadError'));
                    return res.json();
                })
                .then((data) => {
                    setPayload(data);
                    setError(null);
                    setRequiresPassword(false);
                });
        },
        [token]
    );

    useEffect(() => {
        const tokenStr = token;
        if (!tokenStr) return;
        const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SHARE_ACCESS_STORAGE_KEY + '_' + tokenStr) : null;
        if (stored) {
            setAccessToken(stored);
            loadWithAuth(stored).catch(() => {
                setAccessToken(null);
                if (typeof window !== 'undefined') sessionStorage.removeItem(SHARE_ACCESS_STORAGE_KEY + '_' + tokenStr);
                tryLoad(tokenStr);
            });
            return;
        }
        tryLoad(tokenStr);

        function tryLoad(tokenParam: string) {
            fetch(apiShareToken(tokenParam))
                .then((res) => {
                    if (res.status === 403) {
                        return res.json().then((b) => {
                            if (b.requiresPassword) {
                                setRequiresPassword(true);
                                setError(null);
                                return;
                            }
                            setError(t('share.accessDenied'));
                        });
                    }
                    if (!res.ok) throw new Error(res.status === 404 ? t('share.linkInvalidOrExpired') : t('share.loadError'));
                    return res.json().then(setPayload);
                })
                .catch((e) => setError(e instanceof Error ? e.message : t('share.genericError')));
        }
    }, [token, loadWithAuth, t]);

    const handlePasswordSubmit = useCallback(
        (password: string) => {
            const tokenStr = token;
            if (!tokenStr) return;
            setPasswordError(null);
            setPasswordSubmitting(true);
            fetch(apiShareTokenAccess(tokenStr), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.accessToken) {
                        setAccessToken(data.accessToken);
                        if (typeof window !== 'undefined') sessionStorage.setItem(SHARE_ACCESS_STORAGE_KEY + '_' + tokenStr, data.accessToken);
                        return loadWithAuth(data.accessToken);
                    }
                    setPasswordError(t('share.wrongPassword'));
                })
                .catch(() => setPasswordError(t('share.wrongPassword')))
                .finally(() => setPasswordSubmitting(false));
        },
        [token, loadWithAuth, t]
    );

    if (!token) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center', bgcolor: '#fff', minHeight: '100vh' }}>
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.error.base }}>{t('share.linkInvalidOrExpired')}</MsqdxTypography>
            </Box>
        );
    }
    if (error && !requiresPassword) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center', bgcolor: '#fff', minHeight: '100vh' }}>
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.error.base }}>{error}</MsqdxTypography>
            </Box>
        );
    }
    if (requiresPassword && !payload) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 'var(--msqdx-spacing-lg)',
                    bgcolor: 'var(--color-html-background, #fff)',
                }}
            >
                <MsqdxCard
                    variant="flat"
                    sx={{
                        maxWidth: 400,
                        width: '100%',
                        p: 'var(--msqdx-spacing-xl)',
                        borderRadius: 2,
                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                        bgcolor: 'var(--color-card-bg)',
                    }}
                >
                    <MsqdxTypography variant="h5" weight="bold" sx={{ mb: 1, textAlign: 'center' }}>
                        {t('share.passwordRequiredTitle')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-lg)', textAlign: 'center' }}>
                        {t('share.passwordRequiredSubtitle')}
                    </MsqdxTypography>
                    <SharePasswordForm onSubmit={handlePasswordSubmit} error={passwordError} loading={passwordSubmitting} />
                </MsqdxCard>
            </Box>
        );
    }
    if (!payload) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, bgcolor: '#fff' }}>
                <CircularProgress sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
            </Box>
        );
    }

    const authToken = accessToken ?? (typeof window !== 'undefined' ? sessionStorage.getItem(SHARE_ACCESS_STORAGE_KEY + '_' + token) : null);

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto', bgcolor: '#fff', minHeight: '100vh' }} suppressHydrationWarning>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('share.sharedResultsCaption')}
                </MsqdxTypography>
            </Box>
            {payload.type === 'domain' && <ShareDomainContent data={payload.data} token={token} accessToken={authToken} />}
            {payload.type === 'single' && <ShareSingleContent data={payload.data} shareToken={token} accessToken={authToken} />}
            {payload.type === 'journey' && <ShareJourneyContent data={payload.data} accessToken={authToken} />}
            {payload.type === 'geo_eeat' && <ShareGeoEeatContent data={payload.data} />}
        </Box>
    );
}

function SharePasswordForm({
    onSubmit,
    error,
    loading,
}: {
    onSubmit: (password: string) => void;
    error: string | null;
    loading: boolean;
}) {
    const { t } = useI18n();
    const [password, setPassword] = useState('');
    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(password);
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}
        >
            <MsqdxFormField
                label={t('share.passwordFieldLabel')}
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder={t('share.passwordFieldPlaceholder')}
                required
                fullWidth
                autoComplete="current-password"
            />
            {error && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{error}</MsqdxTypography>}
            <MsqdxButton type="submit" variant="contained" disabled={loading} sx={{ alignSelf: 'flex-start' }}>
                {loading ? t('share.submitChecking') : t('share.submitOpen')}
            </MsqdxButton>
        </Box>
    );
}

function ShareDomainContent({ data, token, accessToken }: { data: DomainSummaryResponse; token: string; accessToken?: string | null }) {
    const { t } = useI18n();
    const pages = data.pages ?? [];
    const agg = data.aggregated;
    const [listPage, setListPage] = useState(1);
    const [selectedPageDetail, setSelectedPageDetail] = useState<ScanResult | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loadingPageId, setLoadingPageId] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(pages.length / SHARE_DOMAIN_PAGES_PAGE_SIZE));
    const paginatedPages = pages.slice((listPage - 1) * SHARE_DOMAIN_PAGES_PAGE_SIZE, listPage * SHARE_DOMAIN_PAGES_PAGE_SIZE);

    const openPageDetail = async (pageId: string) => {
        setLoadingPageId(pageId);
        setLoadingDetail(true);
        setSelectedPageDetail(null);
        try {
            const headers: HeadersInit = {};
            if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
            const res = await fetch(apiShareTokenPages(token, pageId), { headers });
            if (!res.ok) throw new Error(t('share.loadFailed'));
            const scanResult = (await res.json()) as ScanResult;
            setSelectedPageDetail(scanResult);
        } catch {
            setSelectedPageDetail(null);
        } finally {
            setLoadingDetail(false);
            setLoadingPageId(null);
        }
    };

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t('share.deepScanTitle')}: {data.domain}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: STATUS.neutral, mb: 2 }}>
                    <span suppressHydrationWarning>{new Date(data.timestamp).toISOString().slice(0, 10)}</span> · {data.totalPages} {t('share.pages')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <ScoreRing score={data.score} size={64} label={t('share.domainScore')} />
                    {agg?.issues && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <MsqdxChip label={`${agg.issues.stats.errors} ${t('share.errors')}`} size="small" sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                            <MsqdxChip label={`${agg.issues.stats.warnings} ${t('share.warnings')}`} size="small" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            <MsqdxChip label={`${agg.issues.stats.notices} ${t('share.notices')}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                        </Box>
                    )}
                </Box>
            </MsqdxCard>

            {agg?.pageClassification && agg.pageClassification.coverage.pagesWithClassification > 0 && (
                <Box sx={{ mb: 2 }}>
                    <DomainResultPageTopicsCard t={t} pageClassification={agg.pageClassification} />
                </Box>
            )}

            {agg?.performance && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('share.performanceAvg')}</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Ø TTFB" value={agg.performance.avgTtfb} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgTtfb, 'ttfb')} />
                        <MetricBox label="Ø FCP" value={agg.performance.avgFcp} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgFcp, 'fcp')} />
                        <MetricBox label="Ø LCP" value={agg.performance.avgLcp} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgLcp, 'lcp')} />
                        <MetricBox label="Ø DOM Load" value={agg.performance.avgDomLoad} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgDomLoad, 'dom')} />
                        <Box sx={{ alignSelf: 'flex-end', py: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.performance.pageCount} {t('share.pages')}</MsqdxTypography>
                        </Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Ökobilanz (zusammengefasst)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                        <MetricBox label="Ø CO₂" value={agg.eco.avgCo2} unit=" g" statusColor={getEcoCo2Color(agg.eco.avgCo2)} />
                        <MetricBox label="Gesamtgewicht" value={(agg.eco.totalPageWeight / 1024).toFixed(0)} unit=" KB" />
                        {Object.keys(agg.eco.gradeDistribution).length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, mr: 0.5 }}>Grade:</MsqdxTypography>
                                {Object.entries(agg.eco.gradeDistribution)
                                    .sort(([a], [b]) => (ECO_GRADE_ORDER.indexOf(a) - ECO_GRADE_ORDER.indexOf(b)))
                                    .map(([grade, count]) => (
                                        <MsqdxChip key={grade} label={`${grade}: ${count}`} size="small" sx={{ fontSize: '0.7rem', bgcolor: alpha(getEcoGradeColor(grade), 0.15), color: getEcoGradeColor(grade) }} />
                                    ))}
                            </Box>
                        )}
                        <Box sx={{ alignSelf: 'center' }}><MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.eco.pageCount} Seiten</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.ux && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>UX (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
                        <ScoreRing score={agg.ux.score} size={52} label="Ø UX-Score" />
                        <MetricBox label="Ø CLS" value={agg.ux.cls} statusColor={agg.ux.cls <= 0.1 ? STATUS.good : agg.ux.cls <= 0.25 ? STATUS.warning : STATUS.error} />
                        <MetricBox label="Kaputte Links" value={agg.ux.brokenLinks.length} statusColor={agg.ux.brokenLinks.length > 0 ? STATUS.error : undefined} />
                        <MetricBox label="Seiten mit Console-Errors" value={agg.ux.consoleErrorsByPage.length} statusColor={agg.ux.consoleErrorsByPage.length > 0 ? STATUS.error : undefined} />
                        {agg.ux.tapTargets.detailsByPage.length > 0 && (
                            <MetricBox label="Touch-Target-Probleme (Seiten)" value={agg.ux.tapTargets.detailsByPage.length} statusColor={STATUS.warning} />
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>SEO (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: agg.seo.crossPageKeywords.length > 0 ? 1.5 : 0 }}>
                        <MetricBar label="Mit Titel" value={agg.seo.withTitle} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withTitle / agg.seo.totalPages)} />
                        <MetricBar label="Mit Meta-Description" value={agg.seo.withMetaDescription} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withMetaDescription / agg.seo.totalPages)} />
                        <MetricBar label="Mit H1" value={agg.seo.withH1} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withH1 / agg.seo.totalPages)} />
                        {agg.seo.missingMetaDescriptionUrls.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <MsqdxChip size="small" label={`Ohne Meta-Description: ${agg.seo.missingMetaDescriptionUrls.length} Seiten`} sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                            </Box>
                        )}
                    </Box>
                    {agg.seo.crossPageKeywords.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>Top-Keywords (domainweit)</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {agg.seo.crossPageKeywords.slice(0, 10).map((k) => (
                                    <MsqdxChip key={k.keyword} label={`${k.keyword} (${k.totalCount})`} size="small" sx={{ fontSize: '0.7rem', bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {agg?.links && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Gesamt" value={agg.links.totalLinks} />
                        <MetricBox label="Intern" value={agg.links.internal} statusColor={STATUS.good} />
                        <MetricBox label="Extern" value={agg.links.external} />
                        <MetricBox label="Kaputte (unique)" value={agg.links.uniqueBrokenUrls} statusColor={agg.links.uniqueBrokenUrls > 0 ? STATUS.error : undefined} />
                    </Box>
                    {agg.links.uniqueBrokenUrls > 0 && agg.links.totalLinks > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                            <MetricBar label="Intakte vs. kaputte Links" value={agg.links.totalLinks - agg.links.uniqueBrokenUrls} total={agg.links.totalLinks} color={getRatioColor((agg.links.totalLinks - agg.links.uniqueBrokenUrls) / agg.links.totalLinks)} />
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {agg?.infra?.technicalCounts && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        <MetricBar label="Manifest" value={agg.infra.technicalCounts.withManifest} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withManifest / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Theme-Color" value={agg.infra.technicalCounts.withThemeColor} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withThemeColor / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Apple Touch Icon" value={agg.infra.technicalCounts.withAppleTouchIcon} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withAppleTouchIcon / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Service Worker" value={agg.infra.technicalCounts.withServiceWorker} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withServiceWorker / agg.infra.technicalCounts.pageCount)} />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, alignItems: 'center' }}>
                        {agg.infra.technicalCounts.pagesWithRedirects > 0 && (
                            <MsqdxChip size="small" label={`Redirects ${agg.infra.technicalCounts.pagesWithRedirects} Seiten`} sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {agg.infra.technicalCounts.withMetaRefresh > 0 && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {agg.infra.technicalCounts.totalThirdPartyDomains > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.infra.technicalCounts.totalThirdPartyDomains} Third-Party-Domains (gesamt)</MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.infra && (agg.infra.privacy.totalPages > 0 || agg.infra.security.totalPages > 0) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        {agg.infra.privacy.totalPages > 0 && (
                            <>
                                <MetricBar label="Datenschutz" value={agg.infra.privacy.withPolicy} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withPolicy / agg.infra.privacy.totalPages)} />
                                <MetricBar label="Cookie-Hinweis" value={agg.infra.privacy.withCookieBanner} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withCookieBanner / agg.infra.privacy.totalPages)} />
                                <MetricBar label="AGB" value={agg.infra.privacy.withTerms} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withTerms / agg.infra.privacy.totalPages)} />
                            </>
                        )}
                        {agg.infra.security.totalPages > 0 && (
                            <>
                                <MetricBar label="CSP" value={agg.infra.security.withCsp} total={agg.infra.security.totalPages} color={getRatioColor(agg.infra.security.withCsp / agg.infra.security.totalPages)} />
                                <MetricBar label="X-Frame-Options" value={agg.infra.security.withXFrame} total={agg.infra.security.totalPages} color={getRatioColor(agg.infra.security.withXFrame / agg.infra.security.totalPages)} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.structure && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Struktur (Überschriften)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Seiten mit mehreren H1" value={agg.structure.pagesWithMultipleH1.length} statusColor={agg.structure.pagesWithMultipleH1.length > 0 ? STATUS.error : undefined} />
                        <MetricBox label="Seiten mit Level-Sprüngen" value={agg.structure.pagesWithSkippedLevels.length} statusColor={agg.structure.pagesWithSkippedLevels.length > 0 ? STATUS.warning : undefined} />
                        <MetricBox label="Gute Struktur" value={agg.structure.pagesWithGoodStructure.length} statusColor={agg.structure.pagesWithGoodStructure.length > 0 ? STATUS.good : undefined} />
                    </Box>
                </MsqdxCard>
            )}

            {data.eeat && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>E-E-A-T</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        <MetricBar label="Impressum" value={data.eeat.trust.pagesWithImpressum} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithImpressum / data.eeat.trust.totalPages)} />
                        <MetricBar label="Kontakt" value={data.eeat.trust.pagesWithContact} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithContact / data.eeat.trust.totalPages)} />
                        <MetricBar label="Datenschutz" value={data.eeat.trust.pagesWithPrivacy} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithPrivacy / data.eeat.trust.totalPages)} />
                        <MetricBar label="Über uns" value={data.eeat.experience.pagesWithAbout} total={data.eeat.experience.totalPages} color={getRatioColor(data.eeat.experience.pagesWithAbout / data.eeat.experience.totalPages)} />
                        <MetricBar label="Team" value={data.eeat.experience.pagesWithTeam} total={data.eeat.experience.totalPages} color={getRatioColor(data.eeat.experience.pagesWithTeam / data.eeat.experience.totalPages)} />
                        <MetricBar label="Autor-Bio" value={data.eeat.expertise.pagesWithAuthorBio} total={data.eeat.expertise.totalPages} color={getRatioColor(data.eeat.expertise.pagesWithAuthorBio / data.eeat.expertise.totalPages)} />
                    </Box>
                    <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, mt: 1 }}>Ø Zitate/Seite: {data.eeat.expertise.avgCitationsPerPage.toFixed(1)}</MsqdxTypography>
                </MsqdxCard>
            )}

            {agg?.generative && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Generative / GEO</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
                        <ScoreRing score={agg.generative.score} size={52} label="Ø GEO-Score" />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricBar label="Seiten mit LLMs.txt" value={agg.generative.withLlmsTxt} total={agg.generative.pageCount} color={getRatioColor(agg.generative.withLlmsTxt / agg.generative.pageCount)} />
                            <MetricBar label="Robots erlauben AI" value={agg.generative.withRobotsAllowingAi} total={agg.generative.pageCount} color={getRatioColor(agg.generative.withRobotsAllowingAi / agg.generative.pageCount)} />
                        </Box>
                    </Box>
                </MsqdxCard>
            )}

            {data.systemicIssues && data.systemicIssues.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: `1px solid ${alpha(STATUS.error, 0.3)}`, bgcolor: alpha(STATUS.error, 0.04) }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: STATUS.error }}>Systemische Issues</MsqdxTypography>
                    {data.systemicIssues.map((issue, idx) => (
                        <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS.error }} />
                            <MsqdxTypography variant="body2" sx={{ color: STATUS.error }}>{issue.title} — {issue.count} Seiten</MsqdxTypography>
                        </Box>
                    ))}
                </MsqdxCard>
            )}

            <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('share.scannedPages', { count: String(pages.length) })}</MsqdxTypography>
                <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', maxHeight: 480, overflow: 'auto' }}>
                    {paginatedPages.map((p) => (
                        <li key={p.id}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                                    <MsqdxTypography variant="body2" sx={{ wordBreak: 'break-all' }}>{p.url}</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: getScoreColor(p.score) }}>Score {p.score}</MsqdxTypography>
                                        {p.stats.errors > 0 && <MsqdxChip size="small" label={`${p.stats.errors} E`} sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />}
                                        {p.stats.warnings > 0 && <MsqdxChip size="small" label={`${p.stats.warnings} W`} sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />}
                                        {p.stats.notices > 0 && <MsqdxChip size="small" label={`${p.stats.notices} N`} sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />}
                                    </Box>
                                </Box>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => openPageDetail(p.id)}
                                    disabled={loadingDetail && loadingPageId === p.id}
                                    sx={{ flexShrink: 0 }}
                                >
                                    {loadingDetail && loadingPageId === p.id ? t('share.loading') : t('share.showSingleScan')}
                                </Button>
                            </Box>
                        </li>
                    ))}
                </Box>
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>
                            {t('share.pageOfTotal', { current: String(listPage), total: String(totalPages), count: String(pages.length) })}
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button size="small" disabled={listPage <= 1} onClick={() => setListPage((x) => Math.max(1, x - 1))}>{t('share.back')}</Button>
                            <Button size="small" disabled={listPage >= totalPages} onClick={() => setListPage((x) => Math.min(totalPages, x + 1))}>{t('share.next')}</Button>
                        </Box>
                    </Box>
                )}
            </MsqdxCard>

            <Dialog open={!!selectedPageDetail || loadingDetail} onClose={() => !loadingDetail && setSelectedPageDetail(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: { bgcolor: '#fff' } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1a1a1a', borderBottom: '1px solid #eee' }}>
                    <MsqdxTypography variant="h6" sx={{ color: '#1a1a1a' }}>{t('share.singleScanTitle')}</MsqdxTypography>
                    <IconButton aria-label={t('share.close')} onClick={() => setSelectedPageDetail(null)} disabled={loadingDetail} size="small" sx={{ ml: 1, color: '#666' }}>
                        ×
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#fff', color: '#1a1a1a' }}>
                    {loadingDetail && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                        </Box>
                    )}
                    {selectedPageDetail && !loadingDetail && (
                        <Box sx={{ color: '#1a1a1a', '& .MuiTypography-root': { color: 'inherit' }, '& .MuiChip-root': { color: 'inherit' } }}>
                            <ShareSingleContent data={selectedPageDetail} shareToken={token} accessToken={accessToken} />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function ShareGeoEeatContent({ data }: { data: ShareGeoEeatData }) {
    const { t } = useI18n();
    const [modelIndex, setModelIndex] = useState(0);
    const payload = data.payload;
    const pages = payload?.pages ?? [];
    const recommendations = payload?.recommendations ?? [];
    const competitive = payload?.competitive;
    const competitiveByModel = payload?.competitiveByModel;
    const sourceByModel: Record<string, CompetitiveBenchmarkResult> =
        competitiveByModel && Object.keys(competitiveByModel).length > 0
            ? competitiveByModel
            : competitive
                ? { [t('geoEeat.competitiveRunCurrentLabel')]: competitive }
                : {};
    const competitiveModelsFromSource = Object.keys(sourceByModel);
    const hasMultiModel = competitiveModelsFromSource.length > 1;
    const currentModelIndex = Math.min(modelIndex, Math.max(0, competitiveModelsFromSource.length - 1));
    const comp: CompetitiveBenchmarkResult | undefined =
        competitiveModelsFromSource.length > 0
            ? sourceByModel[competitiveModelsFromSource[currentModelIndex]!]
            : undefined;

    const borderColor = MSQDX_NEUTRAL[200] ?? 'var(--color-border)';
    const textPrimary = MSQDX_THEME?.light?.text?.primary ?? 'var(--color-text-on-light)';
    const textTertiary = MSQDX_THEME?.light?.text?.tertiary ?? 'var(--color-text-muted-on-light)';
    const surfacePrimary = MSQDX_THEME?.light?.surface?.primary ?? 'var(--color-card-bg)';
    const tableBorder = `1px solid ${borderColor}`;
    const brSpacing = MSQDX_SPACING.borderRadius as Record<string, unknown> | undefined;
    const radiusSm = typeof brSpacing?.sm === 'number' ? brSpacing.sm : 4;

    const DOMAIN_COLORS = [
        MSQDX_BRAND_PRIMARY.green,
        MSQDX_BRAND_PRIMARY.purple ?? '#7c3aed',
        '#0ea5e9',
        '#f59e0b',
        '#ef4444',
        '#ec4899',
        '#14b8a6',
        '#6366f1',
    ];

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t('geoEeat.title')}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: STATUS.neutral, wordBreak: 'break-all' }}>{data.url}</MsqdxTypography>
            </MsqdxCard>
            {pages.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('geoEeat.onPageTitle')}</MsqdxTypography>
                    {pages.map((page, idx) => (
                        <Box key={idx} sx={{ py: 1, borderBottom: idx < pages.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                            <MsqdxTypography variant="body2" sx={{ wordBreak: 'break-all' }}>{page.title || page.url}</MsqdxTypography>
                            {page.technical?.generative && <MsqdxChip size="small" label={`GEO: ${page.technical.generative.score}`} sx={{ mt: 0.5 }} />}
                            {page.geoFitnessScore != null && <MsqdxTypography variant="caption" sx={{ display: 'block', color: STATUS.neutral }}>Fitness: {page.geoFitnessScore}</MsqdxTypography>}
                        </Box>
                    ))}
                </MsqdxCard>
            )}
            {recommendations.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('geoEeat.recommendationsTitle')}</MsqdxTypography>
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {recommendations.map((rec, idx) => (
                            <MsqdxTypography key={idx} component="li" variant="body2" sx={{ mb: 0.5 }}>{rec.title}: {rec.description}</MsqdxTypography>
                        ))}
                    </Box>
                </MsqdxCard>
            )}
            {(comp?.metrics != null && comp.metrics.length > 0) && (
                <MsqdxMoleculeCard
                    title={t('geoEeat.competitiveTitle')}
                    variant="flat"
                    sx={{ bgcolor: surfacePrimary, mb: 2 }}
                    borderRadius="lg"
                >
                    {sourceByModel && Object.keys(sourceByModel).length > 0 && data.url && (
                        <CompetitivePositionDiagram
                            competitiveByModel={sourceByModel}
                            targetUrl={data.url}
                            t={t}
                        />
                    )}
                    {hasMultiModel && (
                        <Box sx={{ borderBottom: tableBorder, mt: 'var(--msqdx-spacing-sm)' }}>
                            <MsqdxTabs
                                value={currentModelIndex}
                                onChange={(v) => setModelIndex(Number(v))}
                                tabs={competitiveModelsFromSource.map((model, i) => ({ label: model, value: i }))}
                            />
                        </Box>
                    )}
                    {hasMultiModel && (
                        <MsqdxTypography variant="caption" sx={{ color: textTertiary, display: 'block', mt: 'var(--msqdx-spacing-sm)', mb: 'var(--msqdx-spacing-xxs)' }}>
                            {t('geoEeat.competitiveModelLabel', { model: competitiveModelsFromSource[currentModelIndex] ?? '' })}
                        </MsqdxTypography>
                    )}
                    <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 'var(--msqdx-spacing-sm)', color: textPrimary }}>
                            {t('geoEeat.competitiveOverview')}
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-sm)' }}>
                            {(() => {
                                const maxSoV = Math.max(...comp.metrics.map((x) => x.shareOfVoice), 0.01);
                                return comp.metrics.map((m, idx) => (
                                    <MsqdxTooltip
                                        key={idx}
                                        title={t('geoEeat.tooltipSoVDetail', {
                                            domain: m.domain,
                                            sov: (m.shareOfVoice * 100).toFixed(0),
                                            avgPos: m.avgPosition > 0 ? m.avgPosition.toFixed(1) : '–',
                                            mentions: m.mentionCount,
                                            queries: m.queryCount,
                                            queriesLabel: t('geoEeat.queriesLabel'),
                                        })}
                                        placement="top"
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--msqdx-spacing-sm)',
                                                flexWrap: 'wrap',
                                                p: 'var(--msqdx-spacing-xs)',
                                                borderRadius: `${radiusSm}px`,
                                                cursor: 'default',
                                                '&:hover': { bgcolor: alpha(DOMAIN_COLORS[idx % DOMAIN_COLORS.length], 0.06) },
                                            }}
                                        >
                                            <Box sx={{ minWidth: 140, flexShrink: 0 }}>
                                                <MsqdxChip size="small" label={m.domain} sx={{ fontWeight: 600 }} />
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                                                <Box sx={{ flex: 1, minWidth: 80, height: 28, borderRadius: `${radiusSm}px`, bgcolor: borderColor, overflow: 'hidden', display: 'flex' }}>
                                                    <Box
                                                        sx={{
                                                            width: `${(m.shareOfVoice / maxSoV) * 100}%`,
                                                            minWidth: m.shareOfVoice > 0 ? 4 : 0,
                                                            height: '100%',
                                                            bgcolor: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
                                                            borderRadius: `${radiusSm}px`,
                                                            transition: 'width 0.3s ease',
                                                        }}
                                                    />
                                                </Box>
                                                <MsqdxTypography variant="body2" sx={{ fontWeight: 600, minWidth: 48, color: textPrimary }}>
                                                    {(m.shareOfVoice * 100).toFixed(0)}%
                                                </MsqdxTypography>
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ color: textTertiary, minWidth: 90 }}>
                                                {t('geoEeat.avgPosition')}: {m.avgPosition > 0 ? m.avgPosition.toFixed(1) : '–'}
                                            </MsqdxTypography>
                                        </Box>
                                    </MsqdxTooltip>
                                ));
                            })()}
                        </Box>
                    </Box>
                    {comp.runs && comp.runs.length > 0 && (
                        <Box sx={{ mt: 'var(--msqdx-spacing-md)', pt: 'var(--msqdx-spacing-md)', borderTop: tableBorder }}>
                            <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 'var(--msqdx-spacing-sm)', color: textPrimary }}>
                                {t('geoEeat.competitivePerQuery')}
                            </MsqdxTypography>
                            <MsqdxAccordion
                                allowMultiple
                                size="small"
                                borderRadius="md"
                                sx={{ border: tableBorder, bgcolor: surfacePrimary, background: surfacePrimary }}
                            >
                                {comp.runs.map((run, runIdx) => (
                                    <MsqdxAccordionItem
                                        key={run.queryId ?? runIdx}
                                        id={`share-query-${runIdx}`}
                                        summary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', flexWrap: 'wrap' }}>
                                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                                                    {t('geoEeat.queryN', { n: runIdx + 1 })}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="body2" sx={{ color: textTertiary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {run.query}
                                                </MsqdxTypography>
                                                {run.citations?.length ? (
                                                    <MsqdxChip size="small" label={t('geoEeat.competitiveCitationsCount', { count: run.citations.length })} />
                                                ) : null}
                                            </Box>
                                        }
                                    >
                                        <Box sx={{ pt: 'var(--msqdx-spacing-xs)' }}>
                                            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-sm)', color: textPrimary }}>
                                                {run.query}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="caption" sx={{ color: textTertiary, display: 'block', mb: 'var(--msqdx-spacing-xxs)' }}>
                                                {t('geoEeat.citedDomains')}:
                                            </MsqdxTypography>
                                            {run.citations && run.citations.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)', alignItems: 'center' }}>
                                                    {[...run.citations]
                                                        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                                                        .map((c, cIdx) => (
                                                            <Box
                                                                key={cIdx}
                                                                sx={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 'var(--msqdx-spacing-xxs)',
                                                                    px: 'var(--msqdx-spacing-xs)',
                                                                    py: 'var(--msqdx-spacing-xxs)',
                                                                    borderRadius: `${radiusSm}px`,
                                                                    bgcolor: surfacePrimary,
                                                                    border: tableBorder,
                                                                }}
                                                            >
                                                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: textTertiary }}>
                                                                    {t('geoEeat.positionShort')} {c.position ?? cIdx + 1}
                                                                </MsqdxTypography>
                                                                <MsqdxChip size="small" label={c.domain} sx={{ height: 22 }} />
                                                            </Box>
                                                        ))}
                                                </Box>
                                            ) : (
                                                <MsqdxTypography variant="caption" sx={{ fontStyle: 'italic', color: textTertiary }}>
                                                    {t('geoEeat.noCitations')}
                                                </MsqdxTypography>
                                            )}
                                        </Box>
                                    </MsqdxAccordionItem>
                                ))}
                            </MsqdxAccordion>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}
        </>
    );
}

function ShareJourneyContent({ data, accessToken }: { data: ShareJourneyData; accessToken?: string | null }) {
    const { t } = useI18n();
    const steps = data.steps ?? [];
    const taskDescription = data.taskDescription ?? '';
    const siteDomain = data.siteDomain ?? '';
    const success = data.success ?? false;
    const videoUrl = data.videoUrl ? (accessToken ? `${data.videoUrl}?access=${encodeURIComponent(accessToken)}` : data.videoUrl) : undefined;

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t('share.uxJourneyTitle')}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: STATUS.neutral, mb: 2 }}>
                    {taskDescription && <span>{taskDescription}</span>}
                    {siteDomain && (
                        <span>
                            {taskDescription ? ' · ' : ''}
                            {siteDomain}
                        </span>
                    )}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MsqdxChip
                        size="small"
                        label={success ? t('share.completedSuccess') : t('share.completed')}
                        sx={{
                            bgcolor: success ? alpha(STATUS.good, 0.12) : alpha(STATUS.neutral, 0.12),
                            color: success ? STATUS.good : STATUS.neutral,
                        }}
                    />
                    {steps.length > 0 && (
                        <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{t('share.stepsCount', { count: String(steps.length) })}</MsqdxTypography>
                    )}
                </Box>
            </MsqdxCard>

            {videoUrl && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('share.recording')}</MsqdxTypography>
                    <Box sx={{ width: '100%', maxWidth: 960, borderRadius: 1, overflow: 'hidden', bgcolor: '#000' }}>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video controls playsInline style={{ width: '100%', display: 'block' }} src={videoUrl}>
                            {t('share.videoUnavailable')}
                        </video>
                    </Box>
                </MsqdxCard>
            )}

            {steps.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{t('share.stepsCount', { count: String(steps.length) })}</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {steps.map((step, idx) => (
                            <Box
                                key={idx}
                                component="li"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    bgcolor: 'var(--color-card-bg)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <MsqdxChip
                                        size="small"
                                        label={step.action === 'navigate' ? t('share.stepLabelPage') : step.action === 'click' ? t('share.stepLabelClick') : step.action === 'done' ? t('share.stepLabelDone') : step.action}
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            ...(step.action === 'done'
                                                ? { bgcolor: alpha(MSQDX_STATUS.success?.base ?? STATUS.good, 0.2), color: MSQDX_STATUS.success?.base ?? STATUS.good }
                                                : step.action === 'navigate'
                                                  ? { bgcolor: alpha(MSQDX_STATUS.info?.base ?? '#2196f3', 0.2), color: MSQDX_STATUS.info?.base ?? '#2196f3' }
                                                  : { bgcolor: alpha(STATUS.good, 0.2), color: STATUS.good }),
                                        }}
                                    />
                                    <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{t('share.stepN', { n: String(idx + 1) })}</MsqdxTypography>
                                </Box>
                                {step.target && step.target !== '—' && (
                                    <MsqdxTypography variant="body2" sx={{ color: '#1a1a1a', wordBreak: 'break-word' }}>
                                        {step.target.length > 200 ? step.target.slice(0, 200) + '…' : step.target}
                                    </MsqdxTypography>
                                )}
                                {step.reasoning && (
                                    <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, display: 'block', mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                        {step.reasoning.length > 300 ? step.reasoning.slice(0, 300) + '…' : step.reasoning}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        ))}
                    </Box>
                </MsqdxCard>
            )}
        </>
    );
}

function ShareSingleContent({ data, shareToken, accessToken }: { data: ScanResult; shareToken?: string; accessToken?: string | null }) {
    const dataIssues = Array.isArray(data?.issues) ? data.issues : [];
    const issueCount = dataIssues.length;
    const stats = data.stats ?? { errors: 0, warnings: 0, notices: 0 };
    const perf = data.performance;
    const eco = data.eco;
    const seo = data.seo;
    const links = data.links;
    const privacy = data.privacy;
    const security = data.security;
    const technicalInsights = data.technicalInsights;
    const generative = data.generative;
    const geo = data.geo;

    const [screenshotDimensions, setScreenshotDimensions] = useState({ width: 0, height: 0 });
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showRegions, setShowRegions] = useState(true);
    const [showFocusOrder, setShowFocusOrder] = useState(true);
    const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
    const [screenshotError, setScreenshotError] = useState(false);

    useEffect(() => {
        setScreenshotError(false);
    }, [data.id]);

    // Im Share-Kontext immer Screenshot über API laden (liefert Bild oder Platzhalter)
    const screenshotSrc = shareToken
        ? apiShareTokenPagesScreenshot(shareToken, data.id, accessToken ?? undefined)
        : (data.screenshot || undefined);

    const hasVisualAnalysis = shareToken
        ? true
        : Boolean(data.screenshot || data.saliencyHeatmap || data.pageIndex?.regions?.length || data.ux?.focusOrder?.length);

    const textPrimary = shareToken ? '#1a1a1a' : undefined;
    const textMuted = shareToken ? '#555' : STATUS.neutral;

    return (
        <>
            {hasVisualAnalysis && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1a1a1a' }}>Visuelle Analyse</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        {data.saliencyHeatmap && (
                            <Button size="small" variant={showHeatmap ? 'contained' : 'outlined'} onClick={() => setShowHeatmap(!showHeatmap)} sx={{ textTransform: 'none' }}>Heatmap</Button>
                        )}
                        {data.pageIndex?.regions?.length ? (
                            <Button size="small" variant={showRegions ? 'contained' : 'outlined'} onClick={() => setShowRegions(!showRegions)} sx={{ textTransform: 'none' }}>Regionen</Button>
                        ) : null}
                        {data.ux?.focusOrder?.length ? (
                            <Button size="small" variant={showFocusOrder ? 'contained' : 'outlined'} onClick={() => setShowFocusOrder(!showFocusOrder)} sx={{ textTransform: 'none' }}>Klickpfad (Fokus)</Button>
                        ) : null}
                    </Box>
                    {screenshotSrc && (
                        <Box sx={{ position: 'relative', width: '100%', bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                            {screenshotError ? (
                                <Box sx={{ py: 4, textAlign: 'center', color: '#666', fontSize: 14 }}>Screenshot nicht verfügbar</Box>
                            ) : (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={screenshotSrc}
                                        alt="Screenshot"
                                        style={{ width: '100%', display: 'block', verticalAlign: 'top' }}
                                        onLoad={(e) => {
                                            const el = e.currentTarget;
                                            setScreenshotDimensions({ width: el.naturalWidth, height: el.naturalHeight });
                                        }}
                                        onError={() => setScreenshotError(true)}
                                    />
                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                        {data.ux?.focusOrder && (
                                            <FocusOrderOverlay
                                                items={data.ux.focusOrder}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                visible={showFocusOrder}
                                            />
                                        )}
                                        {data.saliencyHeatmap && (
                                            <SaliencyHeatmapOverlay
                                                heatmapDataUrl={data.saliencyHeatmap}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                visible={showHeatmap}
                                            />
                                        )}
                                        {data.pageIndex && (
                                            <PageIndexRegionsOverlay
                                                regions={Array.isArray(data.pageIndex?.regions) ? data.pageIndex.regions : []}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                highlightedRegionId={hoveredRegionId}
                                                visible={showRegions}
                                            />
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}
                    {Array.isArray(data.pageIndex?.regions) && data.pageIndex.regions.length > 0 ? (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: '#555' }}>Regionen — Hover zum Hervorheben</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {data.pageIndex.regions.map((r) => (
                                    <Box
                                        key={r.id}
                                        component="span"
                                        onMouseEnter={() => setHoveredRegionId(r.id)}
                                        onMouseLeave={() => setHoveredRegionId(null)}
                                        sx={{
                                            display: 'inline-block', px: 1, py: 0.5, borderRadius: 0.5, fontSize: '0.75rem',
                                            bgcolor: hoveredRegionId === r.id ? alpha(MSQDX_BRAND_PRIMARY.orange ?? '#ff6a3b', 0.25) : 'transparent',
                                            border: hoveredRegionId === r.id ? '2px solid #ff6a3b' : '1px solid #ddd',
                                            cursor: 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a1a',
                                        }}
                                    >
                                        <Box component="span" sx={{ fontWeight: 600, color: '#666', mr: 0.5 }}>{r.tag}</Box>
                                        {(r.headingText || '').slice(0, 35)}{(r.headingText || '').length > 35 ? '...' : ''}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : null}
                    {data.pageIndex && <Box sx={{ mt: 1.5, color: '#1a1a1a' }}><PageIndexCard pageIndex={data.pageIndex} showSaliency={true} /></Box>}
                </MsqdxCard>
            )}

            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1, color: textPrimary }}>Seiten-Scan</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: textMuted, mb: 2, wordBreak: 'break-all' }}>
                    {data.url}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: textMuted, display: 'block', mb: 2 }}>
                    <span suppressHydrationWarning>{new Date(data.timestamp).toISOString().slice(0, 10)}</span> · {data.device}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <ScoreRing score={data.score} size={64} label="Score" />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <MsqdxChip label={`${stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                        <MsqdxChip label={`${stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        <MsqdxChip label={`${stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                    </Box>
                    {data.ux?.score != null && (
                        <ScoreRing score={data.ux.score} size={52} label="UX-Score" />
                    )}
                </Box>
            </MsqdxCard>

            {perf && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: textPrimary }}>Performance</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="TTFB" value={perf.ttfb} unit=" ms" statusColor={getPerformanceColor(perf.ttfb, 'ttfb')} />
                        <MetricBox label="FCP" value={perf.fcp} unit=" ms" statusColor={getPerformanceColor(perf.fcp, 'fcp')} />
                        <MetricBox label="LCP" value={perf.lcp} unit=" ms" statusColor={getPerformanceColor(perf.lcp, 'lcp')} />
                        <MetricBox label="DOM Load" value={perf.domLoad} unit=" ms" statusColor={getPerformanceColor(perf.domLoad, 'dom')} />
                    </Box>
                </MsqdxCard>
            )}

            {eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: textPrimary }}>Ökobilanz</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="CO₂" value={eco.co2} unit=" g" statusColor={getEcoCo2Color(eco.co2)} />
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: alpha(getEcoGradeColor(eco.grade), 0.08), border: `1px solid ${alpha(getEcoGradeColor(eco.grade), 0.3)}` }}>
                            <MsqdxTypography variant="caption" sx={{ color: textMuted }}>Grade</MsqdxTypography>
                            <MsqdxChip label={eco.grade} size="small" sx={{ mt: 0.25, bgcolor: alpha(getEcoGradeColor(eco.grade), 0.2), color: getEcoGradeColor(eco.grade), fontWeight: 700 }} />
                        </Box>
                        <MetricBox label="Seitengewicht" value={(eco.pageWeight / 1024).toFixed(1)} unit=" KB" />
                    </Box>
                </MsqdxCard>
            )}

            {seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: textPrimary }}>SEO</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {seo.title && <Box><MsqdxTypography variant="caption" sx={{ color: textMuted }}>Titel</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word', color: textPrimary }}>{seo.title.length > 80 ? seo.title.slice(0, 80) + '…' : seo.title}</MsqdxTypography></Box>}
                        {seo.metaDescription && <Box><MsqdxTypography variant="caption" sx={{ color: textMuted }}>Meta-Description</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word', color: textPrimary }}>{seo.metaDescription.length > 120 ? seo.metaDescription.slice(0, 120) + '…' : seo.metaDescription}</MsqdxTypography></Box>}
                        {seo.h1 && <Box><MsqdxTypography variant="caption" sx={{ color: textMuted }}>H1</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word', color: textPrimary }}>{seo.h1.length > 80 ? seo.h1.slice(0, 80) + '…' : seo.h1}</MsqdxTypography></Box>}
                        {!seo.title && !seo.metaDescription && !seo.h1 && <MsqdxTypography variant="body2" sx={{ color: textMuted }}>Keine SEO-Daten</MsqdxTypography>}
                    </Box>
                </MsqdxCard>
            )}

            {links && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: textPrimary }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Gesamt" value={links.total} />
                        <MetricBox label="Intern" value={links.internal} statusColor={STATUS.good} />
                        <MetricBox label="Extern" value={links.external} />
                        <MetricBox label="Kaputte" value={links.broken?.length ?? 0} statusColor={(links.broken?.length ?? 0) > 0 ? STATUS.error : undefined} />
                    </Box>
                </MsqdxCard>
            )}

            {(privacy || security) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: textPrimary }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {privacy && (
                            <>
                                <MsqdxChip size="small" label={privacy.hasPrivacyPolicy ? 'Datenschutz' : 'Kein Datenschutz'} sx={privacy.hasPrivacyPolicy ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                                <MsqdxChip size="small" label={privacy.hasCookieBanner ? 'Cookie-Hinweis' : 'Kein Cookie-Hinweis'} sx={privacy.hasCookieBanner ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: '#f0f0f0', color: '#666' }} />
                                <MsqdxChip size="small" label={privacy.hasTermsOfService ? 'AGB' : 'Keine AGB'} sx={privacy.hasTermsOfService ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            </>
                        )}
                        {security && (
                            <>
                                <MsqdxChip size="small" label={security.contentSecurityPolicy?.present ? 'CSP' : 'Kein CSP'} sx={security.contentSecurityPolicy?.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                <MsqdxChip size="small" label={security.xFrameOptions?.present ? 'X-Frame-Options' : 'Kein X-Frame-Options'} sx={security.xFrameOptions?.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {technicalInsights && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: textPrimary }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <MsqdxChip size="small" label={technicalInsights.manifest.present ? 'Web-App-Manifest' : 'Kein Manifest'} sx={technicalInsights.manifest.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        {technicalInsights.manifest.present && (
                            <>
                                {technicalInsights.manifest.hasName && <MsqdxChip size="small" label="Name" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />}
                                {technicalInsights.manifest.hasIcons && <MsqdxChip size="small" label="Icons" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />}
                            </>
                        )}
                        {technicalInsights.themeColor != null && technicalInsights.themeColor && (
                            <MsqdxChip size="small" label={`Theme ${technicalInsights.themeColor}`} sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                        )}
                        {technicalInsights.appleTouchIcon != null && technicalInsights.appleTouchIcon && (
                            <MsqdxChip size="small" label="Apple Touch Icon" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                        )}
                        {technicalInsights.serviceWorkerRegistered && (
                            <MsqdxChip size="small" label="Service Worker" sx={{ bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good }} />
                        )}
                        {technicalInsights.redirectCount != null && technicalInsights.redirectCount > 0 && (
                            <MsqdxChip size="small" label={`${technicalInsights.redirectCount} Redirect(s)`} sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {technicalInsights.metaRefreshPresent && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {(technicalInsights.thirdPartyDomains?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{technicalInsights.thirdPartyDomains.length} Third-Party-Domain(s)</MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {(generative || geo) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Generative / GEO</MsqdxTypography>
                    {generative && (
                        <Box sx={{ mb: geo ? 1.5 : 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                <MsqdxChip size="small" label={`GEO-Score ${generative.score}`} sx={{ bgcolor: alpha(getScoreColor(generative.score), 0.12), color: getScoreColor(generative.score), fontWeight: 600 }} />
                                <MsqdxChip size="small" label={generative.technical.hasLlmsTxt ? 'llms.txt' : 'Kein llms.txt'} sx={generative.technical.hasLlmsTxt ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                <MsqdxChip size="small" label={generative.technical.hasRobotsAllowingAI ? 'Robots (AI)' : 'Robots (AI blockiert)'} sx={generative.technical.hasRobotsAllowingAI ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                {generative.technical.metaRobotsIndexable === false && (
                                    <MsqdxChip size="small" label="noindex" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                )}
                            </Box>
                            {generative.technical.schemaCoverage?.length > 0 && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                    Schema: {generative.technical.schemaCoverage.slice(0, 5).join(', ')}{generative.technical.schemaCoverage.length > 5 ? ' …' : ''}
                                </MsqdxTypography>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    FAQ: {generative.content.faqCount} · Tabellen: {generative.content.tableCount} · Autor: {generative.expertise.hasAuthorBio ? 'Ja' : 'Nein'} · Zitate: {generative.expertise.hasExpertCitations ? 'Ja' : 'Nein'}
                                </MsqdxTypography>
                            </Box>
                        </Box>
                    )}
                    {geo && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            {geo.location?.country && <MsqdxChip size="small" label={[geo.location.city, geo.location.country].filter(Boolean).join(', ')} />}
                            {geo.cdn.detected && geo.cdn.provider && <MsqdxChip size="small" label={`CDN: ${geo.cdn.provider}`} />}
                            {geo.languages.htmlLang && <MsqdxChip size="small" label={`lang=${geo.languages.htmlLang}`} />}
                            {(geo.languages.hreflangs?.length ?? 0) > 0 && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {geo.languages.hreflangs.length} hreflang(s)
                                </MsqdxTypography>
                            )}
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {issueCount > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: textPrimary }}>Issues ({issueCount})</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 300, overflow: 'auto' }}>
                        {dataIssues.slice(0, 50).map((issue, idx) => (
                            <li key={idx}>
                                <MsqdxTypography variant="body2" sx={{ color: textPrimary }}>[{issue.type}] {issue.message}</MsqdxTypography>
                            </li>
                        ))}
                    </Box>
                    {issueCount > 50 && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>… und {issueCount - 50} weitere</MsqdxTypography>
                    )}
                </MsqdxCard>
            )}
        </>
    );
}

