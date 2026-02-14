'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import { EcoCard } from '../../../components/EcoCard';
import { PerformanceCard } from '../../../components/PerformanceCard';
import { ScanIssueList } from '../../../components/ScanIssueList';
import { UxCard } from '../../../components/UxCard';
import { UxIssueList } from '../../../components/UxIssueList';
import { FocusOrderOverlay } from '../../../components/FocusOrderOverlay';
import { StructureMap } from '../../../components/StructureMap';
import { TouchTargetOverlay } from '../../../components/TouchTargetOverlay';
import { SeoCard } from '../../../components/SeoCard';
import { LinkAuditCard } from '../../../components/LinkAuditCard';
import { InfraCard } from '../../../components/InfraCard';
import { PrivacyCard } from '../../../components/PrivacyCard';
import { SecurityCard } from '../../../components/SecurityCard';
import { TechnicalInsightsCard } from '../../../components/TechnicalInsightsCard';
import { GenerativeOptimizerCard } from '../../../components/GenerativeOptimizerCard';
import type { ScanResult, Issue, IssueSeverity } from '@/lib/types';

const SEVERITY_CONFIG: Record<IssueSeverity, { color: string; label: string }> = {
    error: { color: MSQDX_STATUS.error.base, label: 'Error' },
    warning: { color: MSQDX_STATUS.warning.base, label: 'Warning' },
    notice: { color: MSQDX_STATUS.info.base, label: 'Notice' },
};

type TabFilter = 'all' | IssueSeverity | 'passed';
type LevelFilter = 'all' | 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown';

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabFilter>('all');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [viewMode, setViewMode] = useState<'list' | 'summary' | 'visual' | 'ux' | 'structure' | 'seo' | 'infra' | 'generative'>('list');
    const [relatedScans, setRelatedScans] = useState<ScanResult[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [showFocusOrder, setShowFocusOrder] = useState(false);
    const [showTouchTargets, setShowTouchTargets] = useState(false);
    const [screenshotDimensions, setScreenshotDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);
    const issueRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Derived stats for WCAG levels
    const [levelStats, setLevelStats] = useState({ A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 });

    const handleHover = useCallback((index: number | null) => {
        setHighlightedIndex(index);
    }, []);

    const handleRefRegister = useCallback((index: number, el: HTMLDivElement | null) => {
        issueRefs.current[index] = el;
    }, []);

    const filteredIssues = useMemo(() => {
        if (!result) return [];
        return result.issues.filter((i) => {
            const typeMatch = tab === 'all' || i.type === tab;
            const levelMatch = levelFilter === 'all' || i.wcagLevel === levelFilter;
            return typeMatch && levelMatch;
        });
    }, [result, tab, levelFilter]);

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

    useEffect(() => {
        if (!params.id) return;

        // Fetch current scan
        fetch(`/api/scan/${params.id}`)
            .then((res) => {
                if (!res.ok) throw new Error('Scan nicht gefunden');
                return res.json();
            })
            .then((data: ScanResult) => {
                setResult(data);

                // Fetch all scans to find siblings with same groupId
                // (In a real app, we'd have an endpoint like /api/scan?groupId=...)
                if (data.groupId) {
                    fetch('/api/scan')
                        .then(res => res.json())
                        .then((allScans: ScanResult[]) => {
                            const siblings = allScans.filter(s => s.groupId === data.groupId);
                            setRelatedScans(siblings);
                        });
                }

                // Compute level stats
                const stats = { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 };
                data.issues.forEach(issue => {
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
    }, [params.id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress size={28} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
            </Box>
        );
    }

    if (error || !result) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', textAlign: 'center' }}>
                <MsqdxTypography variant="h5" sx={{ color: MSQDX_STATUS.error.light, mb: 'var(--msqdx-spacing-sm)' }}>
                    {error || 'Ergebnis nicht gefunden'}
                </MsqdxTypography>
                <MsqdxButton variant="outlined" onClick={() => router.push('/')}>
                    ← Zurück zum Dashboard
                </MsqdxButton>
            </Box>
        );
    }



    const TABS: { key: TabFilter | 'passed'; label: string; count: number; color: string }[] = [
        { key: 'all', label: 'Alle', count: result.issues.length, color: MSQDX_BRAND_PRIMARY.green },
        { key: 'error', label: 'Errors', count: result.stats.errors, color: MSQDX_STATUS.error.base },
        { key: 'warning', label: 'Warnings', count: result.stats.warnings, color: MSQDX_STATUS.warning.base },
        { key: 'notice', label: 'Notices', count: result.stats.notices, color: MSQDX_STATUS.info.base },
        { key: 'passed', label: 'Validiert', count: result.passes ? result.passes.length : 0, color: MSQDX_STATUS.success.base },
    ];

    // Score Color
    const scoreColor = result.score >= 90 ? MSQDX_BRAND_PRIMARY.green : result.score >= 70 ? MSQDX_BRAND_PRIMARY.yellow : MSQDX_STATUS.error.base;

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            {/* Header with Score */}
            <Box sx={{ mb: 'var(--msqdx-spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <MsqdxButton
                        variant="text"
                        size="small"
                        onClick={() => router.push('/')}
                        sx={{ mb: MSQDX_SPACING.scale.sm, color: 'var(--color-text-muted-on-light)' }}
                    >
                        ← Dashboard
                    </MsqdxButton>
                    <MsqdxTypography
                        variant="h4"
                        sx={{ fontWeight: 700, mb: MSQDX_SPACING.scale.xs, letterSpacing: '-0.02em' }}
                    >
                        Scan-Ergebnis
                    </MsqdxTypography>
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

                {/* Score Gauge */}
                <Box sx={{ position: 'relative', display: 'inline-flex', mr: 'var(--msqdx-spacing-sm)' }}>
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={80}
                        thickness={4}
                        sx={{ color: MSQDX_NEUTRAL[800], position: 'absolute' }}
                    />
                    <CircularProgress
                        variant="determinate"
                        value={result.score}
                        size={80}
                        thickness={4}
                        sx={{ color: scoreColor }}
                    />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                        }}
                    >
                        <MsqdxTypography variant="h4" sx={{ fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                            {result.score}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ fontSize: '0.6rem', color: 'var(--color-text-muted-on-light)' }}>
                            SCORE
                        </MsqdxTypography>
                    </Box>
                </Box>
            </Box>

            {/* Meta info & Stats - Main Card */}
            <MsqdxMoleculeCard
                variant="flat"
                borderRadius="lg"
                sx={{ bgcolor: 'var(--color-card-bg)', mb: 'var(--msqdx-spacing-md)' }}
                chips={
                    <>
                        <MsqdxChip
                            label={result.standard}
                            size="small"
                            sx={{
                                backgroundColor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.12),
                                color: MSQDX_BRAND_PRIMARY.purple,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                mr: 1
                            }}
                        />
                        <MsqdxChip
                            label={result.device ? result.device.toUpperCase() : 'DESKTOP'}
                            size="small"
                            sx={{
                                backgroundColor: alpha(MSQDX_STATUS.info.base, 0.12),
                                color: MSQDX_STATUS.info.base,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                mr: 1
                            }}
                        />
                        <MsqdxChip
                            label={`${result.durationMs}ms`}
                            size="small"
                            sx={{
                                backgroundColor: alpha(MSQDX_BRAND_PRIMARY.green, 0.12),
                                color: MSQDX_BRAND_PRIMARY.green,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                            }}
                        />
                        {result.runners.map((r) => (
                            <MsqdxChip
                                key={r}
                                label={r}
                                size="small"
                                sx={{
                                    backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.12),
                                    color: 'var(--color-text-muted-on-light)',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                }}
                            />
                        ))}
                    </>
                }
                title="Scan Verifiziert"
                subtitle={`URL: ${result.url}`}
                actions={
                    relatedScans.length > 1 && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {['desktop', 'tablet', 'mobile'].map((d) => {
                                const scan = relatedScans.find(s => s.device === d);
                                if (!scan) return null;
                                return (
                                    <MsqdxButton
                                        key={d}
                                        variant={result.device === d ? 'contained' : 'outlined'}
                                        brandColor={result.device === d ? 'green' : undefined}
                                        size="small"
                                        onClick={() => router.push(`/results/${scan.id}`)}
                                        startIcon={
                                            d === 'mobile' ? <MsqdxIcon name="Smartphone" size="sm" /> :
                                            d === 'tablet' ? <MsqdxIcon name="TabletMac" size="sm" /> :
                                            <MsqdxIcon name="DesktopWindows" size="sm" />
                                        }
                                    >
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </MsqdxButton>
                                );
                            })}
                        </Box>
                    )
                }
            >
                {/* Stats Grid: Current + WCAG Levels */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 'var(--msqdx-spacing-sm)',
                    }}
                >
                    <MiniStat label="Errors" value={result.stats.errors} color={MSQDX_STATUS.error.base} />
                    <MiniStat label="Warnings" value={result.stats.warnings} color={MSQDX_STATUS.warning.base} />
                    <MiniStat label="Notices" value={result.stats.notices} color={MSQDX_STATUS.info.base} />
                    {/* Divider or Spacer could be here, but grid handles it */}
                    <MiniStat label="Level A" value={levelStats.A} color={MSQDX_NEUTRAL[400]} />
                    <MiniStat label="Level AA" value={levelStats.AA} color={MSQDX_NEUTRAL[400]} />
                    <MiniStat label="Level AAA" value={levelStats.AAA} color={MSQDX_NEUTRAL[400]} />
                </Box>
            </MsqdxMoleculeCard>

            {/* Eco & Performance Grid */}
            {(result.eco || result.performance) && (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: 'var(--msqdx-spacing-md)',
                    mb: 'var(--msqdx-spacing-md)',
                }}>
                    {result.eco && (
                        <Box sx={{ minHeight: '100%' }}>
                            <EcoCard eco={result.eco} />
                        </Box>
                    )}
                    {result.performance && (
                        <Box sx={{ minHeight: '100%' }}>
                            <PerformanceCard perf={result.performance} />
                        </Box>
                    )}
                    {result.ux && (
                        <Box sx={{ minHeight: '100%' }}>
                            <UxCard ux={result.ux} />
                        </Box>
                    )}
                </Box>
            )}

            {/* View Toggle & Filters */}
            <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTabs
                    value={viewMode}
                    onChange={(v: string) => setViewMode(v as any)}
                    tabs={[
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

            {viewMode === 'summary' && (
                <MsqdxMoleculeCard
                    title="UX/CX Check"
                    subtitle="Bewertung und Handlungsempfehlungen auf Basis aller Scan-Kategorien"
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
                                Hier erscheint eine Gesamtbewertung und konkrete Handlungsempfehlungen auf Basis aller Kategorien (Issues, UX, Performance, SEO, etc.).
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
                                        const res = await fetch(`/api/scan/${result.id}/summarize`, { method: 'POST' });
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

            {viewMode === 'list' && (
                <MsqdxMoleculeCard
                    title="Gefundene Issues"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    borderRadius="lg"
                    headerActions={
                        <Box sx={{ display: 'flex', gap: MSQDX_SPACING.scale.xs }}>
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
                        <ScanIssueList
                            issues={filteredIssues}
                            highlightedIndex={highlightedIndex}
                            registerRef={handleRefRegister}
                        />
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'visual' && (
                <MsqdxMoleculeCard
                    title="Visuelle Analyse"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', mb: 'var(--msqdx-spacing-md)' }}
                    borderRadius="xs"
                    headerActions={
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                    subtitle="User Experience Issues"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {result.ux ? (
                        <UxIssueList ux={result.ux} />
                    ) : (
                        <MsqdxTypography>No UX data available for this scan.</MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'structure' && (
                <MsqdxMoleculeCard
                    title="Struktur & Semantik"
                    subtitle="Visualisierung der Dokumentenstruktur (Headings, Landmarks)."
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {result.ux?.headingHierarchy?.outline && result.ux.headingHierarchy.outline.length > 0 && (
                        <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-on-light)' }}>
                                Document Outline
                            </MsqdxTypography>
                            <Box component="ul" sx={{ pl: 2, m: 0, listStyle: 'none' }}>
                                {result.ux.headingHierarchy.outline.map((item, i) => (
                                    <Box
                                        key={i}
                                        component="li"
                                        sx={{
                                            pl: (item.level - 1) * 16,
                                            py: 0.25,
                                            fontSize: item.level === 1 ? '1rem' : item.level === 2 ? '0.95rem' : '0.85rem',
                                            color: 'var(--color-text-on-light)'
                                        }}
                                    >
                                        <Box component="span" sx={{ fontWeight: item.level <= 2 ? 600 : 400 }}>
                                            H{item.level}
                                        </Box>
                                        {' — '}
                                        {item.text || '(leer)'}
                                    </Box>
                                ))}
                            </Box>
                            {(!result.ux.headingHierarchy.hasSingleH1 || result.ux.headingHierarchy.skippedLevels.length > 0) && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                                    {!result.ux.headingHierarchy.hasSingleH1 && (
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-warning)', display: 'block' }}>
                                            Mehrere H1 auf der Seite ({result.ux.headingHierarchy.h1Count})
                                        </MsqdxTypography>
                                    )}
                                    {result.ux.headingHierarchy.skippedLevels.length > 0 && (
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-warning)', display: 'block' }}>
                                            Übersprungene Level: {result.ux.headingHierarchy.skippedLevels.map(s => `H${s.from}→H${s.to}`).join(', ')}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                    {result.ux?.structureMap ? (
                        <StructureMap nodes={result.ux.structureMap} />
                    ) : (
                        <MsqdxTypography>Keine Strukturdaten verfügbar.</MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'seo' && (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: 'var(--msqdx-spacing-md)'
                }}>
                    {result.seo ? (
                        <SeoCard seo={result.seo} />
                    ) : (
                        <MsqdxMoleculeCard title="SEO Audit" subtitle="No SEO data." sx={{ bgcolor: 'var(--color-card-bg)' }}><MsqdxTypography>Keine SEO Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}

                    {result.links ? (
                        <LinkAuditCard links={result.links} />
                    ) : (
                        <MsqdxMoleculeCard title="Link Audit" subtitle="No Link data." sx={{ bgcolor: 'var(--color-card-bg)' }}><MsqdxTypography>Keine Link Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
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
                        <MsqdxMoleculeCard title="Infrastruktur" subtitle="No data." sx={{ bgcolor: 'var(--color-card-bg)' }}><MsqdxTypography>Keine Infrastruktur-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}

                    {result.privacy ? (
                        <PrivacyCard privacy={result.privacy} />
                    ) : (
                        <MsqdxMoleculeCard title="Privacy Audit" subtitle="No Privacy data." sx={{ bgcolor: 'var(--color-card-bg)' }}><MsqdxTypography>Keine Privacy-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
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
                        <GenerativeOptimizerCard data={result.generative} />
                    ) : (
                        <MsqdxMoleculeCard title="GEO-Analyse" subtitle="Keine Daten." sx={{ bgcolor: 'var(--color-card-bg)' }}><MsqdxTypography>Keine GEO-Daten verfügbar.</MsqdxTypography></MsqdxMoleculeCard>
                    )}
                </>
            )}
        </Box>
    );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <Box
            sx={{
                p: 'var(--msqdx-spacing-md)',
                borderRadius: MSQDX_SPACING.borderRadius.md,
                backgroundColor: 'var(--color-card-bg)',
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                textAlign: 'center',
            }}
        >
            <MsqdxTypography
                variant="h5"
                sx={{ fontWeight: 700, color, letterSpacing: '-0.02em' }}
            >
                {value}
            </MsqdxTypography>
            <MsqdxTypography
                variant="caption"
                sx={{
                    color: 'var(--color-text-muted-on-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                }}
            >
                {label}
            </MsqdxTypography>
        </Box>
    );
}
