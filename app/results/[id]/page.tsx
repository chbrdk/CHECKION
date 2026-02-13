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
import type { ScanResult, Issue, IssueSeverity } from '@/lib/types';

const SEVERITY_CONFIG: Record<IssueSeverity, { color: string; label: string }> = {
    error: { color: MSQDX_STATUS.error.base, label: 'Error' },
    warning: { color: MSQDX_STATUS.warning.base, label: 'Warning' },
    notice: { color: MSQDX_STATUS.info.base, label: 'Notice' },
};

type TabFilter = 'all' | IssueSeverity;
type LevelFilter = 'all' | 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown';

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabFilter>('all');
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
    const [viewMode, setViewMode] = useState<'list' | 'visual' | 'ux'>('list');
    const [relatedScans, setRelatedScans] = useState<ScanResult[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
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
            <Box sx={{ p: MSQDX_SPACING.scale.xl, textAlign: 'center' }}>
                <MsqdxTypography variant="h5" sx={{ color: MSQDX_STATUS.error.light, mb: MSQDX_SPACING.scale.md }}>
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
        <Box sx={{ p: `${MSQDX_SPACING.scale.md}px`, maxWidth: 1600, mx: 'auto' }}>
            {/* Header with Score */}
            <Box sx={{ mb: `${MSQDX_SPACING.scale.md}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <MsqdxButton
                        variant="text"
                        size="small"
                        onClick={() => router.push('/')}
                        sx={{ mb: `${MSQDX_SPACING.scale.sm}px`, color: MSQDX_THEME.dark.text.tertiary }}
                    >
                        ← Dashboard
                    </MsqdxButton>
                    <MsqdxTypography
                        variant="h4"
                        sx={{ fontWeight: 700, mb: `${MSQDX_SPACING.scale.xs}px`, letterSpacing: '-0.02em' }}
                    >
                        Scan-Ergebnis
                    </MsqdxTypography>
                    <MsqdxTypography
                        variant="body2"
                        sx={{
                            color: MSQDX_THEME.dark.text.tertiary,
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
                <Box sx={{ position: 'relative', display: 'inline-flex', mr: `${MSQDX_SPACING.scale.md}px` }}>
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
                        <MsqdxTypography variant="caption" sx={{ fontSize: '0.6rem', color: MSQDX_THEME.dark.text.tertiary }}>
                            SCORE
                        </MsqdxTypography>
                    </Box>
                </Box>
            </Box>

            {/* Meta info & Stats - Main Card */}
            <MsqdxMoleculeCard
                variant="flat"
                borderRadius="lg"
                sx={{ mb: `${MSQDX_SPACING.scale.lg}px` }}
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
                                    color: MSQDX_THEME.dark.text.secondary,
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
                                        brandColor={result.device === d ? 'green' : 'neutral'}
                                        size="small"
                                        onClick={() => router.push(`/results/${scan.id}`)}
                                        startIcon={d === 'mobile' ? 'smartphone' : d === 'tablet' ? 'tablet_mac' : 'desktop_windows'}
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
                        gap: `${MSQDX_SPACING.scale.sm}px`,
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
                    gap: `${MSQDX_SPACING.scale.lg}px`,
                    mb: `${MSQDX_SPACING.scale.lg}px`,
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
            <Box sx={{ mb: MSQDX_SPACING.scale.lg }}>
                <MsqdxTabs
                    value={viewMode}
                    onChange={(v: string) => setViewMode(v as any)}
                    tabs={[
                        { value: 'list', label: 'Liste & Details' },
                        { value: 'visual', label: 'Visuelle Analyse' },
                        { value: 'ux', label: 'UX Audit' },
                    ]}
                />
            </Box>

            {viewMode === 'list' && (
                <MsqdxMoleculeCard // Use Molecule Card here
                    title="Gefundene Issues"
                    variant="flat"
                    borderRadius="lg"
                    headerActions={
                        <Box sx={{ display: 'flex', gap: `${MSQDX_SPACING.scale.xs}px` }}>
                            {TABS.map((t) => (
                                <MsqdxButton
                                    key={t.key}
                                    variant={tab === t.key ? 'contained' : 'text'}
                                    brandColor={
                                        t.key === 'passed' ? 'green' :
                                            tab === t.key ? (t.key === 'error' ? 'red' : t.key === 'warning' ? 'orange' : 'green') :
                                                undefined
                                    }
                                    size="small"
                                    onClick={() => setTab(t.key)}
                                    sx={{
                                        fontSize: '0.75rem',
                                        ...(tab !== t.key && { color: MSQDX_THEME.dark.text.secondary }),
                                        minWidth: 'auto'
                                    }}
                                >
                                    {t.label}
                                    ({t.count})
                                </MsqdxButton>
                            ))}
                            {/* Divider */}
                            <Box sx={{ width: 1, height: 24, bgcolor: MSQDX_THEME.dark.border.subtle, mx: 1, alignSelf: 'center' }} />

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
                                        color: levelFilter === level ? '#000' : MSQDX_THEME.dark.text.secondary,
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
                                sx={{ display: 'flex', flexDirection: 'column', gap: `${MSQDX_SPACING.scale.sm}px`, background: 'transparent', border: 'none' }}
                            >
                                {result.passes.map((pass, idx) => {
                                    const itemId = `pass-${idx}`;
                                    return (
                                        <MsqdxAccordionItem
                                            key={itemId}
                                            id={itemId}
                                            summary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: `${MSQDX_SPACING.scale.sm}px`, width: '100%' }}>
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
                                                        <Box sx={{ display: 'flex', gap: `${MSQDX_SPACING.scale.xs}px`, mt: `${MSQDX_SPACING.scale.xs}px`, flexWrap: 'wrap' }}>
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
                                                                    color: MSQDX_THEME.dark.text.tertiary,
                                                                    fontSize: '0.6rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            }
                                        >
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${MSQDX_SPACING.scale.sm}px`, width: '100%' }}>
                                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_THEME.dark.text.secondary }}>
                                                    {pass.description}
                                                </MsqdxTypography>

                                                <Box sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: `${MSQDX_SPACING.scale.xs}px`,
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    p: `${MSQDX_SPACING.scale.xs}px`,
                                                    borderRadius: `${MSQDX_SPACING.scale.xs}px`,
                                                    backgroundColor: alpha(MSQDX_NEUTRAL[900], 0.3),
                                                    border: `1px solid ${MSQDX_THEME.dark.border.subtle}`
                                                }}>
                                                    {pass.nodes.slice(0, 50).map((node, nodeIdx) => (
                                                        <Box key={nodeIdx} sx={{
                                                            p: `${MSQDX_SPACING.scale.xs}px`,
                                                            borderBottom: nodeIdx < pass.nodes.length - 1 ? `1px solid ${MSQDX_THEME.dark.border.subtle}` : 'none'
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
                                    py: `${MSQDX_SPACING.scale.xl}px`,
                                }}
                            >
                                <MsqdxTypography variant="h6" sx={{ color: MSQDX_THEME.dark.text.secondary }}>
                                    Keine validierten Elemente gefunden (oder Scan wurde nicht mit Validierung durchgeführt).
                                </MsqdxTypography>
                            </Box>
                        )
                    ) : filteredIssues.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: `${MSQDX_SPACING.scale.xl}px`,
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
                            onHover={handleHover}
                            registerRef={handleRefRegister}
                        />
                    )}
                </MsqdxMoleculeCard>
            )}

            {viewMode === 'visual' && (
                <MsqdxMoleculeCard
                    title="Visuelle Analyse"
                    variant="flat"
                    borderRadius="lg"
                    sx={{ mb: `${MSQDX_SPACING.scale.lg}px` }}
                >
                    {result.screenshot ? (
                        <Box sx={{ overflow: 'auto', position: 'relative', width: '100%', border: `1px solid ${MSQDX_NEUTRAL[800]}`, borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                            {/* ... same visual view content ... */}
                            <Box sx={{ position: 'relative', width: 1280, minHeight: 600, bgcolor: '#fff' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={result.screenshot} alt="Scan Screenshot" style={{ width: 1280, display: 'block' }} />
                                {filteredIssues.map((issue, idx) => (
                                    issue.boundingBox && (
                                        <MsqdxTooltip
                                            key={idx}
                                            title={
                                                <Box>
                                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{issue.message}</MsqdxTypography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <MsqdxChip label={issue.type} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: SEVERITY_CONFIG[issue.type].color, color: '#000' }} />
                                                        {issue.wcagLevel && issue.wcagLevel !== 'Unknown' && <MsqdxChip label={issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_BRAND_PRIMARY.blue, color: '#fff' }} />}
                                                    </Box>
                                                    <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{issue.selector}</MsqdxTypography>
                                                </Box>
                                            }
                                            brandColor={SEVERITY_CONFIG[issue.type].label === 'Error' ? 'pink' : SEVERITY_CONFIG[issue.type].label === 'Warning' ? 'yellow' : 'purple'}
                                        >
                                            <Box sx={{
                                                position: 'absolute',
                                                left: issue.boundingBox.x,
                                                top: issue.boundingBox.y,
                                                width: issue.boundingBox.width,
                                                height: issue.boundingBox.height,
                                                border: highlightedIndex === idx ? `4px solid ${SEVERITY_CONFIG[issue.type].color}` : `3px solid ${SEVERITY_CONFIG[issue.type].color}`,
                                                backgroundColor: highlightedIndex === idx ? alpha(SEVERITY_CONFIG[issue.type].color, 0.5) : alpha(SEVERITY_CONFIG[issue.type].color, 0.2),
                                                cursor: 'pointer',
                                                zIndex: highlightedIndex === idx ? 30 : 10,
                                                transition: 'all 0.2s',
                                                boxShadow: highlightedIndex === idx ? `0 0 0 4px ${alpha(SEVERITY_CONFIG[issue.type].color, 0.4)}` : 'none',
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
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <MsqdxTypography variant="body1" sx={{ color: MSQDX_THEME.dark.text.secondary }}>
                                Kein Screenshot verfügbar. (Scans vor dem Update haben keine visuellen Daten)
                            </MsqdxTypography>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}
            {viewMode === 'ux' && (
                <MsqdxMoleculeCard
                    title="User Experience Issues"
                    description="Deep dive into usability and interactivity problems."
                >
                    {result.ux ? (
                        <UxIssueList ux={result.ux} />
                    ) : (
                        <MsqdxTypography>No UX data available for this scan.</MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>
            )}
        </Box>
    );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <Box
            sx={{
                p: `${MSQDX_SPACING.scale.md}px`,
                borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                backgroundColor: MSQDX_NEUTRAL[900],
                border: `1px solid ${MSQDX_THEME.dark.border.subtle}`,
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
                    color: MSQDX_THEME.dark.text.tertiary,
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
