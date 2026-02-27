'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, CircularProgress, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxFormField,
    MsqdxSelect,
    MsqdxCheckboxField,
    MsqdxTabs,
} from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import {
    MSQDX_SPACING,
    MSQDX_THEME,
    MSQDX_BRAND_PRIMARY,
    MSQDX_STATUS,
} from '@msqdx/tokens';
import type { ScanResult, WcagStandard, Runner } from '@/lib/types';
import type { SelectChangeEvent } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function ScanPage() {
    const router = useRouter();
    const { t } = useI18n();
    const STANDARDS: { value: WcagStandard; label: string }[] = [
        { value: 'WCAG2A', label: t('standards.wcag2a') },
        { value: 'WCAG2AA', label: t('standards.wcag2aa') },
        { value: 'WCAG2AAA', label: t('standards.wcag2aaa') },
    ];
    const RUNNERS: { value: Runner; label: string; desc: string }[] = [
        { value: 'axe', label: t('runners.axe').split(' (')[0], desc: t('runners.axe') },
        { value: 'htmlcs', label: t('runners.htmlcs').split(' (')[0], desc: t('runners.htmlcs') },
    ];
    const [url, setUrl] = useState('');
    const [standard, setStandard] = useState<WcagStandard>('WCAG2AA');
    const [selectedRunners, setSelectedRunners] = useState<Runner[]>(['axe', 'htmlcs']);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [scanMode, setScanMode] = useState<'single' | 'deep' | 'journey' | 'geoEeat'>('single');
    const [task, setTask] = useState('');
    const [journeyHistory, setJourneyHistory] = useState<Array<{ id: string; url: string; task: string; status: string; createdAt: string }>>([]);
    const [geoEeatHistory, setGeoEeatHistory] = useState<Array<{ id: string; url: string; status: string; createdAt: string }>>([]);
    const [geoEeatCompetitive, setGeoEeatCompetitive] = useState(false);
    const [geoEeatCompetitors, setGeoEeatCompetitors] = useState('');
    const [geoEeatQueries, setGeoEeatQueries] = useState('');
    const [geoEeatSuggesting, setGeoEeatSuggesting] = useState(false);
    const [geoEeatSuggestError, setGeoEeatSuggestError] = useState<string | null>(null);
    const [geoEeatSuggestMessage, setGeoEeatSuggestMessage] = useState<string | null>(null);

    useEffect(() => {
        if (scanMode !== 'journey') return;
        fetch('/api/scan/journey-agent/history?limit=15')
            .then((res) => res.ok ? res.json() : { runs: [] })
            .then((data: { runs?: Array<{ id: string; url: string; task: string; status: string; createdAt: string }> }) =>
                setJourneyHistory(data.runs ?? [])
            )
            .catch(() => setJourneyHistory([]));
    }, [scanMode]);

    useEffect(() => {
        if (scanMode !== 'geoEeat') return;
        fetch('/api/scan/geo-eeat/history?limit=15')
            .then((res) => (res.ok ? res.json() : { runs: [] }))
            .then((data: { runs?: Array<{ id: string; url: string; status: string; createdAt: string }> }) =>
                setGeoEeatHistory(data.runs ?? [])
            )
            .catch(() => setGeoEeatHistory([]));
    }, [scanMode]);

    const handleScan = async () => {
        if (!url.trim()) return;
        if (scanMode === 'journey' && !task.trim()) return;
        setError(null);
        setScanning(true);

        try {
            if (scanMode === 'geoEeat') {
                const body: { url: string; runCompetitive?: boolean; competitors?: string[]; queries?: string[] } = { url: url.trim() };
                if (geoEeatCompetitive) {
                    body.runCompetitive = true;
                    body.competitors = geoEeatCompetitors.trim().split(/\n/).map((s) => s.trim()).filter(Boolean);
                    body.queries = geoEeatQueries.trim().split(/\n/).map((s) => s.trim()).filter(Boolean);
                }
                const res = await fetch('/api/scan/geo-eeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    setError(data.error || t('scan.error'));
                    setScanning(false);
                    return;
                }
                const jobId = data.jobId as string;
                router.push(`/geo-eeat/${jobId}`);
                return;
            }
            if (scanMode === 'journey') {
                const res = await fetch('/api/scan/journey-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url.trim(), task: task.trim() }),
                });
                const data = await res.json();
                if (res.status === 501) {
                    setError(data.hint || data.error || t('scan.journeyNotConfigured'));
                    setScanning(false);
                    return;
                }
                if (!res.ok || !data.success) {
                    setError(data.error || t('scan.journeyError'));
                    setScanning(false);
                    return;
                }
                const jobId = data.jobId as string;
                router.push(`/journey-agent/${jobId}`);
                return;
            }
            if (scanMode === 'single') {
                const res = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url.trim(), standard, runners: selectedRunners }),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    setError(data.error || t('scan.error'));
                    setScanning(false);
                    return;
                }

                const result = data.data as ScanResult;
                // Heatmap: user starts it on the result page (async job + poll) to avoid timeouts
                router.push(`/results/${result.id}`);
            } else {
                // Deep Scan
                // We use the existing progress page for viewing progress, so we can just redirect there with the URL check logic
                // Or better, start it here and redirect to /scan/domain?url=... which handles picking up the ID

                // Let's trigger it directly via API to be cleaner
                const res = await fetch('/api/scan/domain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url.trim() }),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    setError(data.error || t('scan.error'));
                    setScanning(false);
                    return;
                }

                // Redirect to the Domain Scan Progress page
                // We pass the URL parameter so the page knows what we are looking for, 
                // but since we already started it, let's redirect to monitoring
                router.push(`/scan/domain?url=${encodeURIComponent(url.trim())}`);
            }

        } catch (err) {
            setError(t('scan.networkError'));
            setScanning(false);
        }
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: MSQDX_SPACING.scale.md }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: MSQDX_SPACING.scale.xs }}>
                    <MsqdxTypography
                        variant="h4"
                        sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
                    >
                        {t('scan.title')}
                    </MsqdxTypography>
                    <InfoTooltip title={t('info.scanPage')} ariaLabel={t('common.info')} />
                </Box>
                <MsqdxTypography
                    variant="body2"
                    sx={{ color: 'var(--color-text-muted-on-light)' }}
                >
                    {t('scan.subtitle')}
                </MsqdxTypography>
            </Box>

            {/* Main Scan Card */}
            <MsqdxMoleculeCard
                title={t('scan.configTitle')}
                headerActions={<InfoTooltip title={t('info.scanConfig')} ariaLabel={t('common.info')} />}
                variant="flat"
                borderRadius="lg"
                footerDivider={false}
                sx={{ bgcolor: 'var(--color-card-bg)' }}
                actions={
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        size="medium"
                        onClick={handleScan}
                        disabled={!url.trim() || scanning || (scanMode === 'journey' && !task.trim())}
                        loading={scanning}
                        sx={{ minWidth: 150 }}
                    >
                        {scanning ? t('scan.scanningCta') : scanMode === 'journey' ? t('scan.startJourneyCta') : scanMode === 'geoEeat' ? t('scan.geoEeatStartCta') : t('scan.startCta')}
                    </MsqdxButton>
                }
            >
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' }, gap: 'var(--msqdx-spacing-md)', alignItems: 'start' }}>

                    {/* Scan Mode Selection */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' }, mb: 1 }}>
                        <MsqdxTabs
                            value={scanMode}
                            onChange={(v: string) => setScanMode(v as 'single' | 'deep' | 'journey' | 'geoEeat')}
                            tabs={[
                                { value: 'single', label: t('scan.singleTab') },
                                { value: 'deep', label: t('scan.deepTab') },
                                { value: 'journey', label: t('scan.journeyTab') },
                                { value: 'geoEeat', label: t('scan.geoEeatTab') },
                            ]}
                        />
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                            {scanMode === 'single' ? t('scan.singleHint') : scanMode === 'deep' ? t('scan.deepHint') : scanMode === 'journey' ? t('scan.journeyHint') : t('scan.geoEeatHint')}
                        </MsqdxTypography>
                    </Box>

                    {/* URL Input - Grows to fill available space */}
                    <Box sx={{ flex: 1 }}>
                        <MsqdxFormField
                            label={t('scan.urlLabel')}
                            placeholder={scanMode === 'single' ? t('scan.urlPlaceholderSingle') : scanMode === 'deep' ? t('scan.urlPlaceholderDeep') : scanMode === 'geoEeat' ? t('scan.urlPlaceholderSingle') : 'https://example.com'}
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            disabled={scanning}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleScan()}
                            autoFocus
                            fullWidth
                        />
                    </Box>

                    {/* Task (only for UX Journey) */}
                    {scanMode === 'journey' && (
                        <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
                            <MsqdxFormField
                                label={t('scan.taskLabel')}
                                placeholder={t('scan.taskPlaceholder')}
                                value={task}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTask(e.target.value)}
                                disabled={scanning}
                                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleScan()}
                                fullWidth
                            />
                        </Box>
                    )}

                    {/* GEO/E-E-A-T: Competitive Benchmark (optional) */}
                    {scanMode === 'geoEeat' && (
                        <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MsqdxCheckboxField
                                label={t('scan.geoEeatCompetitiveLabel')}
                                options={[{ value: 'on', label: t('scan.geoEeatCompetitiveCheckbox') }]}
                                value={geoEeatCompetitive ? ['on'] : []}
                                onChange={(val) => setGeoEeatCompetitive(Array.isArray(val) && val.includes('on'))}
                            />
                            {geoEeatCompetitive && (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <MsqdxButton
                                            variant="outlined"
                                            size="small"
                                            disabled={!url.trim() || scanning || geoEeatSuggesting}
                                            onClick={async () => {
                                                if (!url.trim()) return;
                                                setGeoEeatSuggestError(null);
                                                setGeoEeatSuggestMessage(null);
                                                setGeoEeatSuggesting(true);
                                                const controller = new AbortController();
                                                const timeoutId = setTimeout(() => controller.abort(), 60000);
                                                try {
                                                    const res = await fetch('/api/scan/geo-eeat/suggest-competitors-queries', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ url: url.trim() }),
                                                        signal: controller.signal,
                                                    });
                                                    clearTimeout(timeoutId);
                                                    const text = await res.text();
                                                    let data: { error?: string; competitors?: string[]; queries?: string[] } = {};
                                                    if (text.trim()) {
                                                        try {
                                                            data = JSON.parse(text) as typeof data;
                                                        } catch {
                                                            setGeoEeatSuggestError(t('scan.geoEeatSuggestError'));
                                                            return;
                                                        }
                                                    }
                                                    if (!res.ok) {
                                                        setGeoEeatSuggestError(data.error || t('scan.geoEeatSuggestError'));
                                                        return;
                                                    }
                                                    const comp = Array.isArray(data.competitors) ? data.competitors : [];
                                                    const q = Array.isArray(data.queries) ? data.queries : [];
                                                    setGeoEeatCompetitors(comp.join('\n'));
                                                    setGeoEeatQueries(q.join('\n'));
                                                    if (comp.length === 0 && q.length === 0) {
                                                        setGeoEeatSuggestMessage(t('scan.geoEeatSuggestEmpty'));
                                                    } else {
                                                        setGeoEeatSuggestMessage(t('scan.geoEeatSuggestSuccess', { competitors: comp.length, queries: q.length }));
                                                    }
                                                } catch (err) {
                                                    clearTimeout(timeoutId);
                                                    if (err instanceof Error && err.name === 'AbortError') {
                                                        setGeoEeatSuggestError(t('scan.geoEeatSuggestTimeout'));
                                                    } else {
                                                        setGeoEeatSuggestError(t('scan.networkError'));
                                                    }
                                                } finally {
                                                    setGeoEeatSuggesting(false);
                                                }
                                            }}
                                        >
                                            {geoEeatSuggesting ? t('scan.geoEeatSuggestLoading') : t('scan.geoEeatSuggestCta')}
                                        </MsqdxButton>
                                        {(geoEeatSuggestError || geoEeatSuggestMessage) && (
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    py: 0.5,
                                                    px: 1,
                                                    borderRadius: 1,
                                                    backgroundColor: geoEeatSuggestError
                                                        ? alpha(MSQDX_STATUS.error.base, 0.1)
                                                        : alpha(MSQDX_STATUS.success?.base ?? MSQDX_BRAND_PRIMARY, 0.08),
                                                    border: `1px solid ${geoEeatSuggestError ? alpha(MSQDX_STATUS.error.base, 0.25) : alpha(MSQDX_STATUS.success?.base ?? MSQDX_BRAND_PRIMARY, 0.2)}`,
                                                }}
                                            >
                                                <MsqdxTypography
                                                    variant="body2"
                                                    sx={{ color: geoEeatSuggestError ? MSQDX_STATUS.error.light : 'var(--color-text-secondary)' }}
                                                >
                                                    {geoEeatSuggestError ?? geoEeatSuggestMessage}
                                                </MsqdxTypography>
                                            </Box>
                                        )}
                                    </Box>
                                    <MsqdxFormField
                                        label={t('scan.geoEeatCompetitorsLabel')}
                                        placeholder={t('scan.geoEeatCompetitorsPlaceholder')}
                                        value={geoEeatCompetitors}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeoEeatCompetitors(e.target.value)}
                                        disabled={scanning}
                                        fullWidth
                                        multiline
                                        minRows={2}
                                    />
                                    <MsqdxFormField
                                        label={t('scan.geoEeatQueriesLabel')}
                                        placeholder={t('scan.geoEeatQueriesPlaceholder')}
                                        value={geoEeatQueries}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeoEeatQueries(e.target.value)}
                                        disabled={scanning}
                                        fullWidth
                                        multiline
                                        minRows={2}
                                    />
                                </>
                            )}
                        </Box>
                    )}

                    {/* WCAG Standard (Only for Single Page currently) */}
                    <Box sx={{ minWidth: 200, opacity: scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat' ? 0.5 : 1, pointerEvents: scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat' ? 'none' : 'auto' }}>
                        <MsqdxSelect
                            label={t('scan.standardLabel')}
                            value={standard}
                            onChange={(e: SelectChangeEvent<unknown>) => setStandard(e.target.value as WcagStandard)}
                            options={STANDARDS}
                            disabled={scanning || scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat'}
                            fullWidth
                        />
                    </Box>

                    {/* Runners (Only for Single Page currently) */}
                    <Box sx={{ minWidth: 200, pt: 0.5, opacity: scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat' ? 0.5 : 1, pointerEvents: scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat' ? 'none' : 'auto' }}>
                        <MsqdxCheckboxField
                            label={t('scan.enginesLabel')}
                            options={RUNNERS.map(r => ({ value: r.value, label: r.label, disabled: scanning || scanMode === 'deep' || scanMode === 'journey' || scanMode === 'geoEeat' }))}
                            value={selectedRunners}
                            onChange={(val) => setSelectedRunners(val as Runner[])}
                        // row -- Vertical might be better in this layout if we have multiple
                        />
                    </Box>
                </Box>


                {/* Error - Full width below */}
                {error && (
                    <Box
                        sx={{
                            mt: 'var(--msqdx-spacing-md)',
                            p: 'var(--msqdx-spacing-sm)',
                            borderRadius: MSQDX_SPACING.borderRadius.md,
                            backgroundColor: alpha(MSQDX_STATUS.error.base, 0.1),
                            border: `1px solid ${alpha(MSQDX_STATUS.error.base, 0.3)}`,
                        }}
                    >
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.light }}>
                            {error}
                        </MsqdxTypography>
                    </Box>
                )}

                {scanMode === 'journey' && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-md)', pt: 'var(--msqdx-spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                        <MsqdxTypography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            {t('scan.journeyHistoryTitle')}
                        </MsqdxTypography>
                        {journeyHistory.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {journeyHistory.map((run) => (
                                    <Box
                                        key={run.id}
                                        component="li"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            flexWrap: 'wrap',
                                            py: 0.75,
                                            px: 1,
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                                {run.task.length > 60 ? run.task.slice(0, 60) + '…' : run.task}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="caption" color="text.secondary">
                                                {run.url} · {run.status === 'complete' ? t('scan.journeyStatusComplete') : run.status === 'error' ? t('scan.journeyStatusError') : t('scan.journeyStatusRunning')}
                                            </MsqdxTypography>
                                        </Box>
                                        <Link href={`/journey-agent/${run.id}`} style={{ textDecoration: 'none' }}>
                                            <MsqdxButton variant="text" size="small">
                                                {t('scan.journeyView')}
                                            </MsqdxButton>
                                        </Link>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <MsqdxTypography variant="body2" color="text.secondary">
                                {t('scan.journeyHistoryEmpty')}
                            </MsqdxTypography>
                        )}
                    </Box>
                )}

                {scanMode === 'geoEeat' && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-md)', pt: 'var(--msqdx-spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                        <MsqdxTypography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            {t('scan.geoEeatHistoryTitle')}
                        </MsqdxTypography>
                        {geoEeatHistory.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {geoEeatHistory.map((run) => (
                                    <Box
                                        key={run.id}
                                        component="li"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            flexWrap: 'wrap',
                                            py: 0.75,
                                            px: 1,
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                                {run.url.length > 60 ? run.url.slice(0, 60) + '…' : run.url}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="caption" color="text.secondary">
                                                {run.status === 'complete' ? t('geoEeat.statusComplete') : run.status === 'error' ? t('geoEeat.statusError') : run.status === 'running' ? t('geoEeat.statusRunning') : run.status}
                                            </MsqdxTypography>
                                        </Box>
                                        <Link href={`/geo-eeat/${run.id}`} style={{ textDecoration: 'none' }}>
                                            <MsqdxButton variant="text" size="small">
                                                {t('scan.geoEeatView')}
                                            </MsqdxButton>
                                        </Link>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <MsqdxTypography variant="body2" color="text.secondary">
                                {t('scan.geoEeatHistoryEmpty')}
                            </MsqdxTypography>
                        )}
                    </Box>
                )}
            </MsqdxMoleculeCard>

            {scanning && (
                <Box sx={{ mt: 'var(--msqdx-spacing-md)', textAlign: 'center' }}>
                    <CircularProgress size={28} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                    <MsqdxTypography
                        variant="caption"
                        sx={{ color: 'var(--color-text-muted-on-light)', mt: 'var(--msqdx-spacing-xs)', display: 'block' }}
                    >
                        {t('scan.analyzing')}
                    </MsqdxTypography>
                </Box>
            )}
        </Box>
    );
}
