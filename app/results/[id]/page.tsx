'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Box, alpha, Collapse, CircularProgress } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxChip,
    MsqdxCard,
    MsqdxMoleculeCard,
    MsqdxTabs,
    MsqdxTooltip,
    MsqdxAccordion,
    MsqdxAccordionItem,
    MsqdxIcon,
} from '@msqdx/react';
import {
    MSQDX_SPACING,
    MSQDX_THEME,
    MSQDX_BRAND_PRIMARY,
    MSQDX_NEUTRAL,
    MSQDX_STATUS,
} from '@msqdx/tokens';
import { EcoCard } from '@/components/EcoCard';
import { PerformanceCard } from '@/components/PerformanceCard';
import { ScanIssueList } from '@/components/ScanIssueList';
import { UxCard } from '@/components/UxCard';
import type { ScanResult, Issue, IssueSeverity } from '@/lib/types';
import {
    API_SALIENCY_GENERATE,
    apiScan,
    apiScanList,
    apiScanSummarize,
    apiScanUxCheck,
    apiSaliencyResult,
    OUTLINE_INITIAL_VISIBLE,
    PAGE_INDEX_INITIAL_VISIBLE,
    pathResults,
    PATH_HOME,
} from '@/lib/constants';
import { isUxCheckV2Summary, type UxCheckV2Summary } from '@/lib/ux-check-types';

const UxIssueList = dynamic(
    () => import('@/components/UxIssueList').then((m) => ({ default: m.UxIssueList })),
    { ssr: false, loading: () => <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box> }
);
const FocusOrderOverlay = dynamic(
    () => import('@/components/FocusOrderOverlay').then((m) => ({ default: m.FocusOrderOverlay })),
    { ssr: false }
);
const StructureMap = dynamic(
    () => import('@/components/StructureMap').then((m) => ({ default: m.StructureMap })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const PageIndexCard = dynamic(
    () => import('@/components/PageIndexCard').then((m) => ({ default: m.PageIndexCard })),
    { ssr: false, loading: () => <Box sx={{ py: 1 }}><CircularProgress size={20} /></Box> }
);
const PageIndexRegionsOverlay = dynamic(
    () => import('@/components/PageIndexRegionsOverlay').then((m) => ({ default: m.PageIndexRegionsOverlay })),
    { ssr: false }
);
const TouchTargetOverlay = dynamic(
    () => import('@/components/TouchTargetOverlay').then((m) => ({ default: m.TouchTargetOverlay })),
    { ssr: false }
);
const SaliencyHeatmapOverlay = dynamic(
    () => import('@/components/SaliencyHeatmapOverlay').then((m) => ({ default: m.SaliencyHeatmapOverlay })),
    { ssr: false }
);
const ScanpathOverlay = dynamic(
    () => import('@/components/ScanpathOverlay').then((m) => ({ default: m.ScanpathOverlay })),
    { ssr: false }
);
const SeoCard = dynamic(
    () => import('@/components/SeoCard').then((m) => ({ default: m.SeoCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const LinkAuditCard = dynamic(
    () => import('@/components/LinkAuditCard').then((m) => ({ default: m.LinkAuditCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const InfraCard = dynamic(
    () => import('@/components/InfraCard').then((m) => ({ default: m.InfraCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const PrivacyCard = dynamic(
    () => import('@/components/PrivacyCard').then((m) => ({ default: m.PrivacyCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const SecurityCard = dynamic(
    () => import('@/components/SecurityCard').then((m) => ({ default: m.SecurityCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const TechnicalInsightsCard = dynamic(
    () => import('@/components/TechnicalInsightsCard').then((m) => ({ default: m.TechnicalInsightsCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
const GenerativeOptimizerCard = dynamic(
    () => import('@/components/GenerativeOptimizerCard').then((m) => ({ default: m.GenerativeOptimizerCard })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PaginationBar } from '@/components/PaginationBar';
import { RESULTS_ISSUES_PAGE_SIZE } from '@/lib/constants';

function UxCheckV2Content({ summary }: { summary: UxCheckV2Summary }) {
    const { structured, modelUsed, generatedAt } = summary;
    const s = structured;
    const severityColor: Record<string, string> = {
        Kritisch: MSQDX_STATUS.error.base,
        Schwer: MSQDX_STATUS.error.base,
        Mittel: MSQDX_STATUS.warning.base,
        Gering: MSQDX_STATUS.info.base,
        Kosmetisch: 'var(--color-text-muted-on-light)',
    };
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-lg)' }}>
            {s.header && (
                <Box>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {s.header.seitenTitel || 'UX-Analyse'} — {s.header.url}
                    </MsqdxTypography>
                    {s.header.analysdatum && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            Analysedatum: {s.header.analysdatum}
                        </MsqdxTypography>
                    )}
                </Box>
            )}
            {s.problems.length > 0 && (
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>UX-Probleme</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {s.problems.map((p, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: severityColor[p.severity] ?? 'divider',
                                    bgcolor: alpha(severityColor[p.severity] ?? MSQDX_STATUS.info.base, 0.06),
                                }}
                            >
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>{p.title}</MsqdxTypography>
                                <MsqdxChip label={p.severity} size="small" sx={{ mt: 0.5, mb: 0.5, fontSize: '0.7rem' }} />
                                <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', mt: 0.5 }}>{p.heuristik}</MsqdxTypography>
                                <MsqdxTypography variant="body2" component="div" sx={{ mt: 1 }}>
                                    <strong>Befund:</strong>
                                    <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.25 }}>{p.befund.map((b, j) => <li key={j}>{b}</li>)}</Box>
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" component="div" sx={{ mt: 1 }}>
                                    <strong>Empfehlung:</strong>
                                    <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.25 }}>{p.empfehlung.map((e, j) => <li key={j}>{e}</li>)}</Box>
                                </MsqdxTypography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
            {s.positiveAspects.length > 0 && (
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Positive Aspekte</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>{s.positiveAspects.map((a, i) => <li key={i}><MsqdxTypography variant="body2">{a}</MsqdxTypography></li>)}</Box>
                </Box>
            )}
            {s.ratingTable.length > 0 && (
                <Box sx={{ overflowX: 'auto' }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Bewertungstabelle</MsqdxTypography>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Kategorie</Box>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Unterkategorien</Box>
                                <Box component="th" sx={{ textAlign: 'center', p: 1, borderBottom: 1, borderColor: 'divider' }}>Score</Box>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Begründung</Box>
                            </tr>
                        </thead>
                        <tbody>
                            {s.ratingTable.map((r, i) => (
                                <tr key={i}>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{r.kategorie}</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{r.unterkategorien ?? '—'}</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>{r.score}/5</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{r.begruendung ?? '—'}</Box>
                                </tr>
                            ))}
                        </tbody>
                    </Box>
                </Box>
            )}
            {s.impactEffortMatrix.length > 0 && (
                <Box sx={{ overflowX: 'auto' }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Impact-Effort-Matrix</MsqdxTypography>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Problem</Box>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Impact</Box>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Effort</Box>
                                <Box component="th" sx={{ textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider' }}>Priorität</Box>
                            </tr>
                        </thead>
                        <tbody>
                            {s.impactEffortMatrix.map((row, i) => (
                                <tr key={i}>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{row.problem}</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{row.impact}</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{row.effort}</Box>
                                    <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>{row.prioritaet}</Box>
                                </tr>
                            ))}
                        </tbody>
                    </Box>
                </Box>
            )}
            {s.recommendations.length > 0 && (
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Handlungsempfehlungen</MsqdxTypography>
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>{s.recommendations.map((rec, i) => <li key={i}><MsqdxTypography variant="body2">{rec}</MsqdxTypography></li>)}</Box>
                </Box>
            )}
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} component="div">
                Generiert mit {modelUsed} am <span suppressHydrationWarning>{new Date(generatedAt).toLocaleString('de-DE')}</span>.
            </MsqdxTypography>
        </Box>
    );
}

const SEVERITY_CONFIG: Record<IssueSeverity, { color: string; label: string }> = {
    error: { color: MSQDX_STATUS.error.base, label: 'Error' },
    warning: { color: MSQDX_STATUS.warning.base, label: 'Warning' },
    notice: { color: MSQDX_STATUS.info.base, label: 'Notice' },
};

/** Heading count thresholds for structure summary chips: [goodMax, warningMax]. <= good = green, <= warning = orange, else red. */
const STRUCTURE_HEADING_LIMITS: Record<number, [number, number]> = {
    1: [1, 1],   // H1: only 1 is good, >1 = error
    2: [8, 14],  // H2: 1–8 good, 9–14 warning, 15+ error
    3: [15, 30], // H3
    4: [25, 50], // H4
    5: [35, 70], // H5
    6: [45, 90], // H6
};
function getHeadingChipSeverity(level: number, count: number): 'success' | 'warning' | 'error' {
    const [goodMax, warningMax] = STRUCTURE_HEADING_LIMITS[level] ?? [99, 199];
    if (count <= goodMax) return 'success';
    if (count <= warningMax) return 'warning';
    return 'error';
}
/** Severity for Landmarks/Headings summary chip. */
function getLandmarksHeadingsSeverity(landmarks: number, headings: number): 'success' | 'warning' | 'error' {
    if (landmarks === 0) return 'warning';
    if (landmarks > 20 || headings > 80) return 'error';
    if (landmarks > 12 || headings > 50) return 'warning';
    return 'success';
}

type TabFilter = 'all' | IssueSeverity | 'passed';
type LevelFilter = 'all' | 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown';

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabFilter>('all');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [issuesPage, setIssuesPage] = useState(1);
    const [viewMode, setViewMode] = useState<'overview' | 'list' | 'summary' | 'visual' | 'ux' | 'structure' | 'seo' | 'infra' | 'generative'>('overview');
    const [relatedScans, setRelatedScans] = useState<ScanResult[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [showFocusOrder, setShowFocusOrder] = useState(false);
    const [showTouchTargets, setShowTouchTargets] = useState(false);
    const [showSaliencyHeatmap, setShowSaliencyHeatmap] = useState(false);
    const [showScanpath, setShowScanpath] = useState(false);
    const [saliencyGenerating, setSaliencyGenerating] = useState(false);
    const [saliencyError, setSaliencyError] = useState<string | null>(null);
    const [screenshotDimensions, setScreenshotDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
    const [showRegionHighlight, setShowRegionHighlight] = useState(false);
    const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);
    const [pdfExporting, setPdfExporting] = useState(false);
    const [structureOutlineVisibleCount, setStructureOutlineVisibleCount] = useState(OUTLINE_INITIAL_VISIBLE);
    const issueRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Derived stats for WCAG levels
    const [levelStats, setLevelStats] = useState({ A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 });

    const handleHover = useCallback((index: number | null) => {
        setHighlightedIndex(index);
    }, []);

    const handleRefRegister = useCallback((index: number, el: HTMLDivElement | null) => {
        issueRefs.current[index] = el;
    }, []);

    const handleGenerateSaliency = useCallback(async () => {
        if (!result?.id || saliencyGenerating) return;
        setSaliencyError(null);
        setSaliencyGenerating(true);
        const scanId = result.id;
        try {
            const createRes = await fetch(API_SALIENCY_GENERATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanId }),
            });
            const createData = (await createRes.json().catch(() => ({}))) as {
                jobId?: string;
                success?: boolean;
                error?: string;
            };
            if (!createRes.ok) throw new Error(createData.error ?? t('results.heatmapError'));
            if (createData.success) {
                const scanRes = await fetch(apiScan(scanId));
                if (scanRes.ok) {
                    const updated = await scanRes.json();
                    setResult((prev) => (prev?.id === scanId ? updated : prev));
                    setShowSaliencyHeatmap(true);
                }
                return;
            }
            const jobId = createData.jobId;
            if (!jobId) throw new Error(t('results.heatmapError'));

            const pollIntervalMs = 2500;
            const maxWaitMs = 10 * 60 * 1000; // 10 min
            const started = Date.now();
            for (;;) {
                const res = await fetch(apiSaliencyResult(jobId, scanId));
                const data = (await res.json().catch(() => ({}))) as {
                    status?: string;
                    success?: boolean;
                    heatmapDataUrl?: string;
                    error?: string;
                };
                if (data.status === 'completed' && data.heatmapDataUrl) {
                    setResult((prev) => (prev?.id === scanId ? { ...prev, saliencyHeatmap: data.heatmapDataUrl } : prev));
                    setShowSaliencyHeatmap(true);
                    break;
                }
                if (data.status === 'failed' || res.status === 404) {
                    setSaliencyError(data.error ?? t('results.heatmapError'));
                    break;
                }
                if (Date.now() - started > maxWaitMs) {
                    setSaliencyError(t('results.heatmapError'));
                    break;
                }
                await new Promise((r) => setTimeout(r, pollIntervalMs));
            }
        } catch (e) {
            setSaliencyError(e instanceof Error ? e.message : t('results.heatmapError'));
        } finally {
            setSaliencyGenerating(false);
        }
    }, [result?.id, saliencyGenerating, t]);

    const issues = Array.isArray(result?.issues) ? result.issues : [];
    const filteredIssues = useMemo(() => {
        if (!result) return [];
        return issues.filter((i) => {
            const typeMatch = tab === 'all' || i.type === tab;
            const levelMatch = levelFilter === 'all' || i.wcagLevel === levelFilter;
            return typeMatch && levelMatch;
        });
    }, [result, issues, tab, levelFilter]);

    useEffect(() => {
        setIssuesPage(1);
    }, [tab, levelFilter]);

    const issuesTotalPages = Math.max(1, Math.ceil(filteredIssues.length / RESULTS_ISSUES_PAGE_SIZE));
    const paginatedIssues = useMemo(
        () =>
            filteredIssues.slice(
                (issuesPage - 1) * RESULTS_ISSUES_PAGE_SIZE,
                issuesPage * RESULTS_ISSUES_PAGE_SIZE
            ),
        [filteredIssues, issuesPage]
    );

    // Scroll to issue in list
    const scrollToIssue = (index: number) => {
        const el = issueRefs.current[index];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedIndex(index);
            // Switch to list view if not already
            if (viewMode !== 'list') {
                setViewMode('list');
                setTimeout(() => {
                    const el = issueRefs.current[index];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    };

    const handlePdfExport = useCallback(async () => {
        if (!result) return;
        setPdfExporting(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { ScanReportDocument } = await import('@/components/pdf/ScanReportDocument');
            const blob = await pdf(<ScanReportDocument scan={result} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checkion-report-${result.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('PDF export failed', e);
        } finally {
            setPdfExporting(false);
        }
    }, [result]);

    const scanId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;

    useEffect(() => {
        if (!scanId) return;

        // Fetch current scan
        fetch(apiScan(scanId))
            .then((res) => {
                if (!res.ok) throw new Error('Scan nicht gefunden');
                return res.json();
            })
            .then((data: ScanResult & { projectId?: string | null }) => {
                setResult(data);

                // Fetch all scans to find siblings with same groupId
                // (In a real app, we'd have an endpoint like /api/scan?groupId=...)
                if (data.groupId) {
                    fetch(apiScanList({ limit: 100 }))
                        .then(res => res.json())
                        .then((response: { data?: ScanResult[]; pagination?: unknown }) => {
                            const list = Array.isArray(response?.data) ? response.data : [];
                            const siblings = list.filter((s: ScanResult) => s.groupId === data.groupId);
                            setRelatedScans(siblings);
                        });
                }

                // Compute level stats
                const stats = { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 };
                const dataIssues = Array.isArray(data?.issues) ? data.issues : [];
                dataIssues.forEach(issue => {
                    if (issue.wcagLevel === 'A') stats.A++;
                    else if (issue.wcagLevel === 'AA') stats.AA++;
                    else if (issue.wcagLevel === 'AAA') stats.AAA++;
                    else if (issue.wcagLevel === 'APCA') stats.APCA++;
                    else stats.Unknown++;
                });
                setLevelStats(stats);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [scanId]);

    const TABS: { key: TabFilter | 'passed'; label: string; count: number; color: string }[] = result
        ? [
            { key: 'all', label: t('results.tabAll'), count: issues.length, color: MSQDX_BRAND_PRIMARY.green },
            { key: 'error', label: t('results.tabErrors'), count: result.stats.errors, color: MSQDX_STATUS.error.base },
            { key: 'warning', label: t('results.tabWarnings'), count: result.stats.warnings, color: MSQDX_STATUS.warning.base },
            { key: 'notice', label: t('results.tabNotices'), count: result.stats.notices, color: MSQDX_STATUS.info.base },
            { key: 'passed', label: t('results.tabValidated'), count: result.passes ? result.passes.length : 0, color: MSQDX_STATUS.success.base },
          ]
        : [];

    const scoreColor = result
        ? (result.score >= 90 ? MSQDX_BRAND_PRIMARY.green : result.score >= 70 ? MSQDX_BRAND_PRIMARY.yellow : MSQDX_STATUS.error.base)
        : '';

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto', minHeight: 360 }}>
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
                    <CircularProgress size={28} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                </Box>
            )}
            {!loading && (error || !result) && (
                <Box sx={{ textAlign: 'center' }}>
                    <MsqdxTypography variant="h5" sx={{ color: MSQDX_STATUS.error.light, mb: 'var(--msqdx-spacing-sm)' }}>
                        {error || t('results.errorNotFound')}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" onClick={() => router.push(PATH_HOME)}>
                        ← {t('results.backToDashboard')}
                    </MsqdxButton>
                </Box>
            )}
            {!loading && result && (
        <Box component="span" sx={{ display: 'block' }}>
            {/* Header with Score */}
            <Box sx={{ mb: 'var(--msqdx-spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: MSQDX_SPACING.scale.xs }}>
                        <MsqdxTypography
                            variant="h4"
                            sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
                        >
                            {t('results.scanResult')}
                        </MsqdxTypography>
                        <InfoTooltip title={t('info.scanResult')} ariaLabel={t('common.info')} />
                    </Box>
                    <MsqdxTypography
                        variant="body2"
                        sx={{
                            color: 'var(--color-text-muted-on-light)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 600,
                        }}
                    >
                        {result.url}
                    </MsqdxTypography>
                </Box>

                {/* Score (no ring, large number) */}
                <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', mr: 'var(--msqdx-spacing-sm)' }}>
                    <MsqdxTypography sx={{ fontSize: '2.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {result.score}
                    </MsqdxTypography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <MsqdxTypography variant="caption" sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted-on-light)', textTransform: 'uppercase', fontWeight: 600 }}>
                            {t('results.score')}
                        </MsqdxTypography>
                        <InfoTooltip title={t('info.score')} ariaLabel={t('common.info')} placement="bottom" />
                    </Box>
                </Box>
            </Box>

            {/* View Toggle & Filters */}
            <Box sx={{ mb: 'var(--msqdx-spacing-md)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoTooltip title={t('info.viewModes')} ariaLabel={t('common.info')} placement="bottom" />
                <MsqdxTabs
                    value={viewMode}
                    onChange={(v: string) => setViewMode(v as any)}
                    tabs={[
                        { value: 'overview', label: 'Übersicht' },
                        { value: 'list', label: 'Liste & Details' },
                        { value: 'summary', label: 'UX/CX Check' },
                        { value: 'visual', label: 'Visuelle Analyse' },
                        { value: 'ux', label: 'UX Audit' },
                        { value: 'structure', label: 'Struktur & Semantik' },
                        { value: 'seo', label: 'Links & SEO' },
                        { value: 'infra', label: 'Infrastruktur & Privacy' },
                        { value: 'generative', label: 'Generative Search (GEO)' },
                    ]}
                />
            </Box>

            {viewMode === 'overview' && (
                (result.pageClassification || result.eco || result.performance || result.ux) ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 'var(--msqdx-spacing-md)',
                            alignItems: 'start',
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)', minWidth: 0 }}>
                            <MsqdxMoleculeCard
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                                chips={
                                    <>
                                        <MsqdxChip label={result.standard} size="small" sx={{ backgroundColor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.12), color: MSQDX_BRAND_PRIMARY.purple, fontWeight: 600, fontSize: '0.7rem', mr: 1 }} />
                                        <MsqdxChip label={result.device ? result.device.toUpperCase() : 'DESKTOP'} size="small" sx={{ backgroundColor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base, fontWeight: 600, fontSize: '0.7rem', mr: 1 }} />
                                        <MsqdxChip label={`${result.durationMs}ms`} size="small" sx={{ backgroundColor: alpha(MSQDX_BRAND_PRIMARY.green, 0.12), color: MSQDX_BRAND_PRIMARY.green, fontWeight: 600, fontSize: '0.7rem' }} />
                                        {result.runners.map((r) => (
                                            <MsqdxChip key={r} label={r} size="small" sx={{ backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.12), color: 'var(--color-text-muted-on-light)', fontWeight: 600, fontSize: '0.7rem' }} />
                                        ))}
                                    </>
                                }
                                title={t('results.scanVerified')}
                                headerActions={<InfoTooltip title={t('info.scanVerified')} ariaLabel={t('common.info')} />}
                                subtitle=""
                                actions={
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <MsqdxButton variant="outlined" size="small" disabled={pdfExporting} onClick={handlePdfExport} startIcon={<MsqdxIcon name="Download" size="sm" />}>
                                            {pdfExporting ? t('results.pdfCreating') : t('results.pdfExport')}
                                        </MsqdxButton>
                                        {relatedScans.length > 1 && (
                                            <>
                                                {['desktop', 'tablet', 'mobile'].map((d) => {
                                                    const scan = relatedScans.find(s => s.device === d);
                                                    if (!scan) return null;
                                                    return (
                                                        <MsqdxButton
                                                            key={d}
                                                            variant={result.device === d ? 'contained' : 'outlined'}
                                                            brandColor={result.device === d ? 'green' : undefined}
                                                            size="small"
                                                            onClick={() => router.push(pathResults(scan.id))}
                                                            startIcon={d === 'mobile' ? <MsqdxIcon name="Smartphone" size="sm" /> : d === 'tablet' ? <MsqdxIcon name="TabletMac" size="sm" /> : <MsqdxIcon name="DesktopWindows" size="sm" />}
                                                        >
                                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                                        </MsqdxButton>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </Box>
                                }
                            >
                                <MsqdxTypography component="div" sx={{ fontSize: '0.75rem', color: MSQDX_NEUTRAL[800], fontWeight: 500, mb: 1 }}>URL: {result.url}</MsqdxTypography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 'var(--msqdx-spacing-xs)', rowGap: 'var(--msqdx-spacing-sm)' }}>
                                    <MiniStat label="Errors" value={result.stats.errors} color={MSQDX_STATUS.error.base} />
                                    <MiniStat label="Warnings" value={result.stats.warnings} color={MSQDX_STATUS.warning.base} />
                                    <MiniStat label="Notices" value={result.stats.notices} color={MSQDX_STATUS.info.base} />
                                    <MiniStat label="Level A" value={levelStats.A} color={MSQDX_NEUTRAL[400]} />
                                    <MiniStat label="Level AA" value={levelStats.AA} color={MSQDX_NEUTRAL[400]} />
                                    <MiniStat label="Level AAA" value={levelStats.AAA} color={MSQDX_NEUTRAL[400]} />
                                </Box>
                            </MsqdxMoleculeCard>
                            {result.pageClassification && (() => {
                                const pc = result.pageClassification as { tagTiers?: Array<{ tag: string; tier: 1 | 2 | 3 | 4 | 5 }>; tags?: string[]; tier?: 1 | 2 | 3 | 4 | 5; shortSummary?: string };
                                const tagTiers = pc.tagTiers?.length ? pc.tagTiers : (pc.tags ?? []).map((tag) => ({ tag, tier: (pc.tier ?? 3) as 1 | 2 | 3 | 4 | 5 }));
                                if (tagTiers.length === 0 && !pc.shortSummary) return null;
                                const byTier = [5, 4, 3, 2, 1].map((tier) => ({ tier, tags: tagTiers.filter((tt) => tt.tier === tier) })).filter((g) => g.tags.length > 0);
                                return (
                                    <MsqdxMoleculeCard
                                        key="classification"
                                        variant="flat"
                                        borderRadius="lg"
                                        sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                                        title={t('results.pageClassificationTitle')}
                                        subtitle={t('results.pageClassificationSubtitle')}
                                        headerActions={<InfoTooltip title={t('info.pageClassification')} ariaLabel={t('common.info')} placement="bottom" />}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                                            {byTier.map(({ tier, tags }) => (
                                                <Box key={tier}>
                                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                        {t('results.pageClassificationTier')} {tier}: {t(`results.pageClassificationTier${tier}` as 'results.pageClassificationTier1')}
                                                    </MsqdxTypography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {tags.map((tt, i) => (
                                                            <MsqdxChip key={`${tier}-${i}`} label={tt.tag} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            ))}
                                            {pc.shortSummary && (
                                                <Box>
                                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{t('results.pageClassificationSummary')}</MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>{pc.shortSummary}</MsqdxTypography>
                                                </Box>
                                            )}
                                        </Box>
                                    </MsqdxMoleculeCard>
                                );
                            })()}
                        </Box>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                gridTemplateRows: 'auto auto',
                                gap: 'var(--msqdx-spacing-md)',
                                minWidth: 0,
                                alignItems: 'stretch',
                            }}
                        >
                            {result.eco && (
                                <Box sx={{ minHeight: '100%', height: '100%', width: '100%', minWidth: 0, display: 'flex' }}>
                                    <EcoCard eco={result.eco} sx={{ height: '100%' }} />
                                </Box>
                            )}
                            {result.performance && (
                                <Box sx={{ minHeight: '100%', height: '100%', width: '100%', minWidth: 0, display: 'flex' }}>
                                    <PerformanceCard perf={result.performance} sx={{ height: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} />
                                </Box>
                            )}
                            {result.ux && (
                                <Box sx={{ minHeight: '100%', gridColumn: { xs: '1', md: '1 / -1' } }}>
                                    <UxCard ux={result.ux} />
                                </Box>
                            )}
                        </Box>
                    </Box>
                ) : (
                    <MsqdxMoleculeCard
                        variant="flat"
                        borderRadius="lg"
                        sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                        chips={
                            <>
                                <MsqdxChip label={result.standard} size="small" sx={{ backgroundColor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.12), color: MSQDX_BRAND_PRIMARY.purple, fontWeight: 600, fontSize: '0.7rem', mr: 1 }} />
                                <MsqdxChip label={result.device ? result.device.toUpperCase() : 'DESKTOP'} size="small" sx={{ backgroundColor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base, fontWeight: 600, fontSize: '0.7rem', mr: 1 }} />
                                <MsqdxChip label={`${result.durationMs}ms`} size="small" sx={{ backgroundColor: alpha(MSQDX_BRAND_PRIMARY.green, 0.12), color: MSQDX_BRAND_PRIMARY.green, fontWeight: 600, fontSize: '0.7rem' }} />
                                {result.runners.map((r) => (
                                    <MsqdxChip key={r} label={r} size="small" sx={{ backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.12), color: 'var(--color-text-muted-on-light)', fontWeight: 600, fontSize: '0.7rem' }} />
                                ))}
                            </>
                        }
                        title={t('results.scanVerified')}
                        headerActions={<InfoTooltip title={t('info.scanVerified')} ariaLabel={t('common.info')} />}
                        subtitle=""
                        actions={
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <MsqdxButton variant="outlined" size="small" disabled={pdfExporting} onClick={handlePdfExport} startIcon={<MsqdxIcon name="Download" size="sm" />}>
                                    {pdfExporting ? t('results.pdfCreating') : t('results.pdfExport')}
                                </MsqdxButton>
                                {relatedScans.length > 1 && (
                                    <>
                                        {['desktop', 'tablet', 'mobile'].map((d) => {
                                            const scan = relatedScans.find(s => s.device === d);
                                            if (!scan) return null;
                                            return (
                                                <MsqdxButton
                                                    key={d}
                                                    variant={result.device === d ? 'contained' : 'outlined'}
                                                    brandColor={result.device === d ? 'green' : undefined}
                                                    size="small"
                                                    onClick={() => router.push(pathResults(scan.id))}
                                                    startIcon={d === 'mobile' ? <MsqdxIcon name="Smartphone" size="sm" /> : d === 'tablet' ? <MsqdxIcon name="TabletMac" size="sm" /> : <MsqdxIcon name="DesktopWindows" size="sm" />}
                                                >
                                                    {d.charAt(0).toUpperCase() + d.slice(1)}
                                                </MsqdxButton>
                                            );
                                        })}
                                    </>
                                )}
                            </Box>
                        }
                    >
                        <MsqdxTypography component="div" sx={{ fontSize: '0.75rem', color: MSQDX_NEUTRAL[800], fontWeight: 500, mb: 1 }}>URL: {result.url}</MsqdxTypography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 'var(--msqdx-spacing-xs)', rowGap: 'var(--msqdx-spacing-sm)' }}>
                            <MiniStat label="Errors" value={result.stats.errors} color={MSQDX_STATUS.error.base} />
                            <MiniStat label="Warnings" value={result.stats.warnings} color={MSQDX_STATUS.warning.base} />
                            <MiniStat label="Notices" value={result.stats.notices} color={MSQDX_STATUS.info.base} />
                            <MiniStat label="Level A" value={levelStats.A} color={MSQDX_NEUTRAL[400]} />
                            <MiniStat label="Level AA" value={levelStats.AA} color={MSQDX_NEUTRAL[400]} />
                            <MiniStat label="Level AAA" value={levelStats.AAA} color={MSQDX_NEUTRAL[400]} />
                        </Box>
                    </MsqdxMoleculeCard>
                )
            )}

            {viewMode === 'summary' && (
                <MsqdxMoleculeCard
                    title="UX/CX Check"
                    headerActions={<InfoTooltip title={t('info.uxCxCheck')} ariaLabel={t('common.info')} />}
                    subtitle="Heuristische Evaluation gemäß DIN EN ISO 9241-110 (Dialogprinzipien)"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)', border: '1px solid var(--color-card-border)' }}
                    borderRadius="lg"
                >
                    {result.llmSummary && isUxCheckV2Summary(result.llmSummary) ? (
                        <UxCheckV2Content summary={result.llmSummary} />
                    ) : result.llmSummary && 'summary' in result.llmSummary ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            {result.llmSummary.overallGrade && (
                                <MsqdxChip label={result.llmSummary.overallGrade} size="small" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
                            )}
                            <MsqdxTypography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{result.llmSummary.summary}</MsqdxTypography>
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
                                                sx={{ bgcolor: t.severity === 'high' ? alpha(MSQDX_STATUS.error.base, 0.08) : t.severity === 'medium' ? alpha(MSQDX_STATUS.warning.base, 0.08) : undefined }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                            {result.llmSummary.recommendations?.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Handlungsempfehlungen</MsqdxTypography>
                                    <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[...result.llmSummary.recommendations].sort((a, b) => a.priority - b.priority).map((r, i) => (
                                            <Box component="li" key={i} sx={{ mb: 0.5 }}>
                                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>{r.title}</MsqdxTypography>
                                                {r.category && <MsqdxChip label={r.category} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.25 }}>{r.description}</MsqdxTypography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} component="div">
                                Generiert mit {result.llmSummary.modelUsed} am <span suppressHydrationWarning>{new Date(result.llmSummary.generatedAt).toLocaleString('de-DE')}</span>.
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                                Heuristische UX-Evaluation (DIN EN ISO 9241-110): Probleme, Bewertungstabelle, Impact-Effort-Matrix und Handlungsempfehlungen werden von einem Claude-Agenten erzeugt.
                            </MsqdxTypography>
                            {summarizeError && (
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{summarizeError}</MsqdxTypography>
                            )}
                            <MsqdxButton
                                variant="contained"
                                brandColor="green"
                                disabled={summarizing}
                                onClick={async () => {
                                    if (!result?.id || summarizing) return;
                                    setSummarizeError(null);
                                    setSummarizing(true);
                                    try {
                                        const res = await fetch(apiScanUxCheck(result.id), { method: 'POST' });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) throw new Error(data.error ?? 'Fehler beim UX-Check');
                                        setResult((prev) => (prev ? { ...prev, llmSummary: data } : null));
                                    } catch (e) {
                                        setSummarizeError(e instanceof Error ? e.message : 'Unbekannter Fehler');
                                    } finally {
                                        setSummarizing(false);
                                    }
                                }}
                            >
                                {summarizing ? 'UX-Check läuft…' : 'UX-Check starten'}
                            </MsqdxButton>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'list' && (
                <MsqdxMoleculeCard
                    title="Gefundene Issues"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                    borderRadius="lg"
                    headerActions={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: MSQDX_SPACING.scale.sm }}>
                            <InfoTooltip title={t('info.issuesList')} ariaLabel={t('common.info')} placement="bottom" />
                            <InfoTooltip title={t('info.severityTabs')} ariaLabel={t('common.info')} placement="bottom" />
                            {TABS.map((t) => (
                                <MsqdxButton
                                    key={t.key}
                                    variant={tab === t.key ? 'contained' : 'text'}
                                    brandColor={
                                        t.key === 'passed' ? 'green' :
                                            tab === t.key ? (t.key === 'error' ? 'pink' : t.key === 'warning' ? 'yellow' : 'green') :
                                                undefined
                                    }
                                    size="small"
                                    onClick={() => setTab(t.key)}
                                    sx={{
                                        fontSize: '0.75rem',
                                        ...(tab !== t.key && { color: 'var(--color-text-muted-on-light)' }),
                                        minWidth: 'auto'
                                    }}
                                >
                                    {t.label}
                                    ({t.count})
                                </MsqdxButton>
                            ))}
                            {/* Divider */}
                            <Box sx={{ width: 1, height: 24, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', mx: 1, alignSelf: 'center' }} />

                            {/* Level Filters */}
                            {['all', 'A', 'AA', 'AAA', 'APCA'].map((level) => (
                                <MsqdxButton
                                    key={level}
                                    variant={levelFilter === level ? 'contained' : 'text'}
                                    size="small"
                                    onClick={() => setLevelFilter(level as LevelFilter)}
                                    sx={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: '16px',
                                        color: levelFilter === level ? '#000' : 'var(--color-text-muted-on-light)',
                                        backgroundColor: levelFilter === level ? MSQDX_BRAND_PRIMARY.green : 'transparent',
                                        '&:hover': {
                                            backgroundColor: levelFilter === level ? MSQDX_BRAND_PRIMARY.green : alpha(MSQDX_NEUTRAL[200], 0.1),
                                        },
                                        minWidth: 'auto',
                                        px: 2
                                    }}
                                >
                                    {level === 'all' ? 'Alle Level' : level === 'APCA' ? 'APCA' : `Lvl ${level}`}
                                    {level !== 'all' && (
                                        <Box
                                            component="span"
                                            sx={{
                                                ml: 1,
                                                fontSize: '0.65rem',
                                                opacity: 0.7,
                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                px: 0.5,
                                                borderRadius: '4px'
                                            }}
                                        >
                                            {levelStats[level as keyof typeof levelStats]}
                                        </Box>
                                    )}
                                </MsqdxButton>
                            ))}
                        </Box>
                    }
                    footerDivider={false}
                >
                    {/* Issues List via MsqdxAccordion */}
                    {tab === 'passed' ? (
                        result.passes && result.passes.length > 0 ? (
                            <MsqdxAccordion
                                allowMultiple
                                size="small"
                                borderRadius="md"
                                sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-sm)', background: 'transparent', border: 'none' }}
                            >
                                {result.passes.map((pass, idx) => {
                                    const itemId = `pass-${idx}`;
                                    return (
                                        <MsqdxAccordionItem
                                            key={itemId}
                                            id={itemId}
                                            summary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                                                    {/* Success dot */}
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            backgroundColor: MSQDX_STATUS.success.base,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <MsqdxTypography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                lineHeight: 1.5,
                                                                whiteSpace: 'normal',
                                                            }}
                                                        >
                                                            {pass.help}
                                                        </MsqdxTypography>
                                                        <Box sx={{ display: 'flex', gap: MSQDX_SPACING.scale.xs, mt: MSQDX_SPACING.scale.xs, flexWrap: 'wrap' }}>
                                                            <MsqdxChip
                                                                label={pass.id}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: alpha(MSQDX_STATUS.success.base, 0.12),
                                                                    color: MSQDX_STATUS.success.base,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.6rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                            <MsqdxChip
                                                                label={`${pass.nodes.length} Element${pass.nodes.length !== 1 ? 'e' : ''}`}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.1),
                                                                    color: 'var(--color-text-muted-on-light)',
                                                                    fontSize: '0.6rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            }
                                        >
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                    {pass.description}
                                                </MsqdxTypography>

                                                <Box sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: MSQDX_SPACING.scale.xs,
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    p: MSQDX_SPACING.scale.xs,
                                                    borderRadius: MSQDX_SPACING.scale.xs,
                                                    backgroundColor: 'var(--color-secondary-dx-grey-light-tint)',
                                                    border: `1px solid ${'var(--color-secondary-dx-grey-light-tint)'}`
                                                }}>
                                                    {pass.nodes.slice(0, 50).map((node: any, nodeIdx: number) => (
                                                        <Box key={nodeIdx} sx={{
                                                            p: MSQDX_SPACING.scale.xs,
                                                            borderBottom: nodeIdx < pass.nodes.length - 1 ? `1px solid ${'var(--color-secondary-dx-grey-light-tint)'}` : 'none'
                                                        }}>
                                                            <code style={{
                                                                fontSize: '0.75rem',
                                                                color: MSQDX_BRAND_PRIMARY.green,
                                                                fontFamily: 'monospace',
                                                                display: 'block',
                                                                wordBreak: 'break-all'
                                                            }}>
                                                                {node.html}
                                                            </code>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        </MsqdxAccordionItem>
                                    );
                                })}
                            </MsqdxAccordion>
                        ) : (
                            <Box
                                sx={{
                                    textAlign: 'center',
                                    py: 'var(--msqdx-spacing-md)',
                                }}
                            >
                                <MsqdxTypography variant="h6" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    Keine validierten Elemente gefunden (oder Scan wurde nicht mit Validierung durchgeführt).
                                </MsqdxTypography>
                            </Box>
                        )
                    ) : filteredIssues.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: 'var(--msqdx-spacing-md)',
                            }}
                        >
                            <MsqdxTypography variant="h6" sx={{ color: MSQDX_BRAND_PRIMARY.green }}>
                                ✓ Keine Issues gefunden
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <>
                            <ScanIssueList
                                issues={paginatedIssues}
                                highlightedIndex={highlightedIndex}
                                registerRef={handleRefRegister}
                            />
                            {filteredIssues.length > RESULTS_ISSUES_PAGE_SIZE && (
                                <PaginationBar
                                    page={issuesPage}
                                    totalPages={issuesTotalPages}
                                    onPrev={() => setIssuesPage((p) => Math.max(1, p - 1))}
                                    onNext={() => setIssuesPage((p) => Math.min(issuesTotalPages, p + 1))}
                                    t={t}
                                />
                            )}
                        </>
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'visual' && (
                <MsqdxMoleculeCard
                    title="Visuelle Analyse"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', mb: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-card-border)' }}
                    borderRadius="xs"
                    headerActions={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InfoTooltip title={t('info.visualAnalysis')} ariaLabel={t('common.info')} />
                            <MsqdxButton
                                variant={showFocusOrder ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => setShowFocusOrder(!showFocusOrder)}
                                brandColor={showFocusOrder ? 'green' : undefined}
                            >
                                {showFocusOrder ? 'Hide Focus Order' : 'Show Focus Order'}
                            </MsqdxButton>
                            <MsqdxButton
                                variant={showTouchTargets ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => setShowTouchTargets(!showTouchTargets)}
                                brandColor={showTouchTargets ? 'green' : undefined}
                            >
                                {showTouchTargets ? 'Hide Touch Targets' : 'Show Touch Targets'}
                            </MsqdxButton>
                            {result.pageIndex && Array.isArray(result.pageIndex.regions) && result.pageIndex.regions.length > 0 && (
                                <MsqdxButton
                                    variant={showRegionHighlight ? 'contained' : 'outlined'}
                                    size="small"
                                    onClick={() => setShowRegionHighlight(!showRegionHighlight)}
                                    brandColor={showRegionHighlight ? 'green' : undefined}
                                >
                                    {showRegionHighlight ? t('results.hideRegionHighlight') : t('results.showRegionHighlight')}
                                </MsqdxButton>
                            )}
                            {result.saliencyHeatmap ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    <InfoTooltip title={t('info.saliencyHeatmap')} ariaLabel={t('common.info')} />
                                    <MsqdxButton
                                        variant={showSaliencyHeatmap ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setShowSaliencyHeatmap(!showSaliencyHeatmap)}
                                        brandColor={showSaliencyHeatmap ? 'green' : undefined}
                                    >
                                        {showSaliencyHeatmap ? t('results.hideAttentionHeatmap') : t('results.showAttentionHeatmap')}
                                    </MsqdxButton>
                                    {result.scanpath && result.scanpath.length > 0 && (
                                        <MsqdxButton
                                            variant={showScanpath ? 'contained' : 'outlined'}
                                            size="small"
                                            onClick={() => setShowScanpath(!showScanpath)}
                                            brandColor={showScanpath ? 'green' : undefined}
                                        >
                                            {showScanpath ? t('results.hideScanpath') : t('results.showScanpath')}
                                        </MsqdxButton>
                                    )}
                                </Box>
                            ) : (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    <InfoTooltip title={t('info.saliencyHeatmap')} ariaLabel={t('common.info')} />
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        disabled={saliencyGenerating}
                                        onClick={handleGenerateSaliency}
                                    >
                                        {saliencyGenerating ? (
                                            <>
                                                <CircularProgress size={14} sx={{ mr: 0.5 }} />
                                                {t('results.generatingHeatmap')}
                                            </>
                                        ) : (
                                            t('results.generateAttentionHeatmap')
                                        )}
                                    </MsqdxButton>
                                    {saliencyError && (
                                        <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base, ml: 0.5 }}>
                                            {saliencyError}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    }
                >
                    {result.screenshot ? (
                        <Box sx={{ overflow: 'auto', position: 'relative', width: '100%', maxWidth: '100%', border: `1px solid ${MSQDX_NEUTRAL[800]}`, borderRadius: MSQDX_SPACING.borderRadius.xs }}>
                            {/* Screenshot + overlays: one fluid-width container so image fits and overlays align via % */}
                            <Box sx={{ position: 'relative', width: '100%', bgcolor: '#fff' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={result.screenshot}
                                    alt="Scan Screenshot"
                                    style={{ width: '100%', display: 'block', verticalAlign: 'top' }}
                                    onLoad={(e) => {
                                        const el = e.currentTarget;
                                        setScreenshotDimensions({ width: el.naturalWidth, height: el.naturalHeight });
                                    }}
                                />
                                {/* Overlay layer: same size as image (100% × 100%) so positioning scales with screenshot */}
                                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                    {result.ux?.focusOrder && (
                                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40 }}>
                                            <FocusOrderOverlay
                                                items={result.ux.focusOrder}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                visible={showFocusOrder}
                                            />
                                        </Box>
                                    )}
                                    {result.ux?.tapTargets?.details && (
                                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 45 }}>
                                            {showTouchTargets && (
                                                <TouchTargetOverlay
                                                    issues={result.ux.tapTargets.details}
                                                    screenshotWidth={screenshotDimensions.width}
                                                    screenshotHeight={screenshotDimensions.height}
                                                />
                                            )}
                                        </Box>
                                    )}
                                    {result.saliencyHeatmap && (
                                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20 }}>
                                            <SaliencyHeatmapOverlay
                                                heatmapDataUrl={result.saliencyHeatmap}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                visible={showSaliencyHeatmap}
                                            />
                                        </Box>
                                    )}
                                    {result.scanpath && result.scanpath.length > 0 && (
                                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 25 }}>
                                            <ScanpathOverlay
                                                fixations={result.scanpath}
                                                screenshotWidth={screenshotDimensions.width}
                                                screenshotHeight={screenshotDimensions.height}
                                                visible={showScanpath}
                                            />
                                        </Box>
                                    )}
                                    {result.pageIndex && (
                                        <PageIndexRegionsOverlay
                                            regions={Array.isArray(result.pageIndex?.regions) ? result.pageIndex.regions : []}
                                            screenshotWidth={screenshotDimensions.width}
                                            screenshotHeight={screenshotDimensions.height}
                                            highlightedRegionId={hoveredRegionId}
                                            visible={showRegionHighlight}
                                        />
                                    )}
                                    {/* Issue boxes: percentage-based so they stay aligned when screenshot is scaled */}
                                    {filteredIssues.map((issue, idx) => (
                                        issue.boundingBox && (
                                            <MsqdxTooltip
                                                key={idx}
                                                title={
                                                    <Box>
                                                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{issue.message}</MsqdxTypography>
                                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                            <MsqdxChip label={issue.type} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: SEVERITY_CONFIG[issue.type].color, color: '#000' }} />
                                                            {issue.wcagLevel && issue.wcagLevel !== 'Unknown' && <MsqdxChip label={issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_BRAND_PRIMARY.green, color: '#fff' }} />}
                                                        </Box>
                                                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{issue.selector}</MsqdxTypography>
                                                    </Box>
                                                }
                                                brandColor={SEVERITY_CONFIG[issue.type].label === 'Error' ? 'pink' : SEVERITY_CONFIG[issue.type].label === 'Warning' ? 'yellow' : 'purple'}
                                            >
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        left: `${(issue.boundingBox.x / screenshotDimensions.width) * 100}%`,
                                                        top: `${(issue.boundingBox.y / screenshotDimensions.height) * 100}%`,
                                                        width: `${(issue.boundingBox.width / screenshotDimensions.width) * 100}%`,
                                                        height: `${(issue.boundingBox.height / screenshotDimensions.height) * 100}%`,
                                                        border: highlightedIndex === idx ? `4px solid ${SEVERITY_CONFIG[issue.type].color}` : `3px solid ${SEVERITY_CONFIG[issue.type].color}`,
                                                        backgroundColor: highlightedIndex === idx ? alpha(SEVERITY_CONFIG[issue.type].color, 0.5) : alpha(SEVERITY_CONFIG[issue.type].color, 0.2),
                                                        cursor: 'pointer',
                                                        zIndex: highlightedIndex === idx ? 30 : 10,
                                                        transition: 'all 0.2s',
                                                        boxShadow: highlightedIndex === idx ? `0 0 0 4px ${alpha(SEVERITY_CONFIG[issue.type].color, 0.4)}` : 'none',
                                                        pointerEvents: 'auto',
                                                        '&:hover': {
                                                            backgroundColor: alpha(SEVERITY_CONFIG[issue.type].color, 0.4),
                                                            zIndex: 20,
                                                        }
                                                    }}
                                                    onClick={() => scrollToIssue(idx)}
                                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                                    onMouseLeave={() => setHighlightedIndex(null)}
                                                />
                                            </MsqdxTooltip>
                                        )
                                    ))}
                                </Box>
                            </Box>
                            {showRegionHighlight && Array.isArray(result.pageIndex?.regions) && result.pageIndex.regions.length > 0 && (
                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: 'var(--color-text-muted-on-light)' }}>
                                        {t('results.pageIndexTitle')} — {t('results.hoverToHighlight')}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {result.pageIndex.regions.map((r) => (
                                            <Box
                                                key={r.id}
                                                component="span"
                                                onMouseEnter={() => setHoveredRegionId(r.id)}
                                                onMouseLeave={() => setHoveredRegionId(null)}
                                                sx={{
                                                    display: 'inline-block',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 0.5,
                                                    fontSize: '0.75rem',
                                                    bgcolor: hoveredRegionId === r.id ? alpha(MSQDX_BRAND_PRIMARY.orange ?? '#ff6a3b', 0.25) : 'transparent',
                                                    border: hoveredRegionId === r.id ? `2px solid ${MSQDX_BRAND_PRIMARY.orange ?? '#ff6a3b'}` : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    maxWidth: 220,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <Box component="span" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', mr: 0.5 }}>
                                                    {r.tag}
                                                </Box>
                                                {(r.headingText || '').slice(0, 35)}
                                                {(r.headingText || '').length > 35 ? '…' : ''}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <MsqdxTypography variant="body1" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Kein Screenshot verfügbar. (Scans vor dem Update haben keine visuellen Daten)
                            </MsqdxTypography>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}
            {viewMode === 'ux' && (
                <MsqdxMoleculeCard
                    title="User Experience Issues"
                    headerActions={<InfoTooltip title={t('info.uxIssues')} ariaLabel={t('common.info')} />}
                    subtitle="User Experience Issues"
                    sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                >
                    {result.ux ? (
                        <UxIssueList ux={result.ux} />
                    ) : (
                        <MsqdxTypography>No UX data available for this scan.</MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'structure' && (() => {
                const outline = result.ux?.headingHierarchy?.outline ?? [];
                const structureMapNodes = result.ux?.structureMap ?? [];
                const outlineLevelCounts = outline.reduce<Record<number, number>>((acc, item) => {
                    acc[item.level] = (acc[item.level] ?? 0) + 1;
                    return acc;
                }, {});
                const landmarkCount = structureMapNodes.filter((n) => n.level === 0).length;
                const headingCount = structureMapNodes.filter((n) => n.level >= 1 && n.level <= 6).length;
                const hasOutline = outline.length > 0;
                const hasStructure = structureMapNodes.length > 0;
                const hasPageIndex = result.pageIndex && (result.pageIndex.regions?.length ?? 0) > 0;
                const outlineVisible = Math.min(outline.length, structureOutlineVisibleCount);
                const outlineHasMore = outline.length > OUTLINE_INITIAL_VISIBLE && outlineVisible < outline.length;
                const h = result.ux?.headingHierarchy;
                const qualitySingleH1 = h?.hasSingleH1 ?? true;
                const qualitySkipped = (h?.skippedLevels?.length ?? 0) > 0 ? h!.skippedLevels.map((s) => `H${s.from}→H${s.to}`).join(', ') : '';
                const regionCount = result.pageIndex?.regions?.length ?? 0;

                return (
                    <MsqdxMoleculeCard
                        title="Struktur & Semantik"
                        headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />}
                        subtitle="Visualisierung der Dokumentenstruktur (Headings, Landmarks)."
                        sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
                    >
                        {!hasOutline && !hasStructure ? (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('results.structureSummaryNoData')}
                            </MsqdxTypography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                                {[1, 2, 3, 4, 5, 6].filter((l) => (outlineLevelCounts[l] ?? 0) > 0).map((level) => {
                                    const count = outlineLevelCounts[level] ?? 0;
                                    const severity = getHeadingChipSeverity(level, count);
                                    const status = severity === 'success' ? MSQDX_STATUS.success : severity === 'warning' ? MSQDX_STATUS.warning : MSQDX_STATUS.error;
                                    return (
                                        <MsqdxChip
                                            key={level}
                                            label={`${count}× H${level}`}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                bgcolor: alpha(status.base, 0.14),
                                                color: status.base,
                                            }}
                                        />
                                    );
                                })}
                                {hasStructure && (() => {
                                    const severity = getLandmarksHeadingsSeverity(landmarkCount, headingCount);
                                    const status = severity === 'success' ? MSQDX_STATUS.success : severity === 'warning' ? MSQDX_STATUS.warning : MSQDX_STATUS.error;
                                    return (
                                        <MsqdxChip
                                            label={`${landmarkCount} Landmarks, ${headingCount} Headings`}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                bgcolor: alpha(status.base, 0.14),
                                                color: status.base,
                                            }}
                                        />
                                    );
                                })()}
                                {h && (
                                    <MsqdxChip
                                        label={qualitySingleH1 ? t('results.structureQualitySingleH1') : t('results.structureQualityMultipleH1', { count: h.h1Count })}
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            bgcolor: qualitySingleH1 ? alpha(MSQDX_STATUS.success.base, 0.12) : alpha(MSQDX_STATUS.warning.base, 0.12),
                                            color: qualitySingleH1 ? MSQDX_STATUS.success.base : MSQDX_STATUS.warning.base,
                                        }}
                                    />
                                )}
                                {qualitySkipped && (
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-warning)' }}>
                                        {t('results.structureQualitySkippedLevels', { list: qualitySkipped })}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        )}
                        <MsqdxAccordion allowMultiple size="small" borderRadius="md" sx={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'transparent', border: 'none' }}>
                            <MsqdxAccordionItem
                                id="structure-outline"
                                summary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            {hasOutline ? t('results.structureOutlineEntries', { count: outline.length }) : t('results.structureOutlineNoData')}
                                        </MsqdxTypography>
                                    </Box>
                                }
                            >
                                {hasOutline ? (
                                    <Box>
                                        <Box component="ul" sx={{ pl: 2, m: 0, listStyle: 'none' }}>
                                            {outline.slice(0, outlineVisible).map((item, i) => (
                                                <Box
                                                    key={i}
                                                    component="li"
                                                    sx={{
                                                        pl: (item.level - 1) * 16,
                                                        py: 0.25,
                                                        fontSize: item.level === 1 ? '1rem' : item.level === 2 ? '0.95rem' : '0.85rem',
                                                        color: 'var(--color-text-on-light)',
                                                    }}
                                                >
                                                    <Box component="span" sx={{ fontWeight: item.level <= 2 ? 600 : 400 }}>H{item.level}</Box>
                                                    {' — '}
                                                    {item.text || '(leer)'}
                                                </Box>
                                            ))}
                                        </Box>
                                        {outlineHasMore && (
                                            <MsqdxButton variant="text" size="small" onClick={() => setStructureOutlineVisibleCount(outline.length)} sx={{ mt: 1 }}>
                                                {t('results.structureOutlineShowMore', { count: outline.length - outlineVisible })}
                                            </MsqdxButton>
                                        )}
                                        {(!qualitySingleH1 || qualitySkipped) && h && (
                                            <Box sx={{ mt: 1, p: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                                                {!qualitySingleH1 && (
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-warning)', display: 'block' }}>
                                                        {t('results.structureQualityMultipleH1', { count: h.h1Count })}
                                                    </MsqdxTypography>
                                                )}
                                                {qualitySkipped && (
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-warning)', display: 'block' }}>
                                                        {t('results.structureQualitySkippedLevels', { list: qualitySkipped })}
                                                    </MsqdxTypography>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>{t('results.structureOutlineNoData')}</MsqdxTypography>
                                )}
                            </MsqdxAccordionItem>
                            <MsqdxAccordionItem
                                id="structure-map"
                                summary={
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {hasStructure ? t('results.structureMapTitle', { landmarks: landmarkCount, headings: headingCount }) : t('results.structureMapNoData')}
                                    </MsqdxTypography>
                                }
                            >
                                {hasStructure ? <StructureMap nodes={structureMapNodes} /> : <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>{t('results.structureMapNoData')}</MsqdxTypography>}
                            </MsqdxAccordionItem>
                            <MsqdxAccordionItem
                                id="structure-page-index"
                                summary={
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {hasPageIndex ? t('results.pageIndexRegionsCount', { count: regionCount }) : t('results.pageIndexNoData')}
                                    </MsqdxTypography>
                                }
                            >
                                {result.pageIndex ? <PageIndexCard pageIndex={result.pageIndex} showSaliency initialVisible={PAGE_INDEX_INITIAL_VISIBLE} /> : <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>{t('results.pageIndexNoData')}</MsqdxTypography>}
                            </MsqdxAccordionItem>
                        </MsqdxAccordion>
                    </MsqdxMoleculeCard>
                );
            })()}

            {viewMode === 'seo' && (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: 'var(--msqdx-spacing-md)'
                }}>
                    {result.seo ? (
                        <SeoCard seo={result.seo} />
                    ) : (
                        <MsqdxMoleculeCard title="SEO Audit" subtitle="No SEO data." sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}><MsqdxTypography>Keine SEO Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}

                    {result.links ? (
                        <LinkAuditCard links={result.links} />
                    ) : (
                        <MsqdxMoleculeCard title="Link Audit" subtitle="No Link data." sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}><MsqdxTypography>Keine Link Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}
                </Box>
            )}

            {viewMode === 'infra' && (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: 'var(--msqdx-spacing-md)'
                }}>
                    {result.geo ? (
                        <InfraCard geo={result.geo} />
                    ) : (
                        <MsqdxMoleculeCard title="Infrastruktur" subtitle="No data." sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}><MsqdxTypography>Keine Infrastruktur-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}

                    {result.privacy ? (
                        <PrivacyCard privacy={result.privacy} />
                    ) : (
                        <MsqdxMoleculeCard title="Privacy Audit" subtitle="No Privacy data." sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}><MsqdxTypography>Keine Privacy-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}

                    {result.security ? (
                        <SecurityCard security={result.security} />
                    ) : null}

                    {result.technicalInsights ? (
                        <TechnicalInsightsCard insights={result.technicalInsights} />
                    ) : null}
                </Box>
            )}

            {viewMode === 'generative' && (
                <>
                    {result.generative ? (
                        <GenerativeOptimizerCard data={result.generative} ymyl={result.ymyl} geo={result.geo} />
                    ) : (
                        <MsqdxMoleculeCard title="GEO-Analyse" subtitle="Keine Daten." sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}><MsqdxTypography>Keine GEO-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}
                </>
            )}
        </Box>
            )}
        </Box>
    );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <Box
            sx={{
                px: 'var(--msqdx-spacing-xs)',
                py: 'var(--msqdx-spacing-sm)',
                borderRadius: MSQDX_SPACING.borderRadius.sm,
                backgroundColor: 'var(--color-card-bg)',
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                textAlign: 'center',
            }}
        >
            <MsqdxTypography
                component="span"
                sx={{ fontWeight: 700, color, letterSpacing: '-0.02em', fontSize: '0.95rem', lineHeight: 1.2, display: 'block' }}
            >
                {value}
            </MsqdxTypography>
            <MsqdxTypography
                component="span"
                sx={{
                    color: 'var(--color-text-muted-on-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: '0.55rem',
                    fontWeight: 600,
                    display: 'block',
                }}
            >
                {label}
            </MsqdxTypography>
        </Box>
    );
}
