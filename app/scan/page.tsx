'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

    const [scanMode, setScanMode] = useState<'single' | 'deep'>('single');

    const handleScan = async () => {
        if (!url.trim()) return;
        setError(null);
        setScanning(true);

        try {
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
                        disabled={!url.trim() || scanning}
                        loading={scanning}
                        sx={{ minWidth: 150 }}
                    >
                        {scanning ? t('scan.scanningCta') : t('scan.startCta')}
                    </MsqdxButton>
                }
            >
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' }, gap: 'var(--msqdx-spacing-md)', alignItems: 'start' }}>

                    {/* Scan Mode Selection */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' }, mb: 1 }}>
                        <MsqdxTabs
                            value={scanMode}
                            onChange={(v: string) => setScanMode(v as 'single' | 'deep')}
                            tabs={[
                                { value: 'single', label: t('scan.singleTab') },
                                { value: 'deep', label: t('scan.deepTab') }
                            ]}
                        />
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                            {scanMode === 'single' ? t('scan.singleHint') : t('scan.deepHint')}
                        </MsqdxTypography>
                    </Box>

                    {/* URL Input - Grows to fill available space */}
                    <Box sx={{ flex: 1 }}>
                        <MsqdxFormField
                            label={t('scan.urlLabel')}
                            placeholder={scanMode === 'single' ? t('scan.urlPlaceholderSingle') : t('scan.urlPlaceholderDeep')}
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            disabled={scanning}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleScan()}
                            autoFocus
                            fullWidth
                        />
                    </Box>

                    {/* WCAG Standard (Only for Single Page currently) */}
                    <Box sx={{ minWidth: 200, opacity: scanMode === 'deep' ? 0.5 : 1, pointerEvents: scanMode === 'deep' ? 'none' : 'auto' }}>
                        <MsqdxSelect
                            label={t('scan.standardLabel')}
                            value={standard}
                            onChange={(e: SelectChangeEvent<unknown>) => setStandard(e.target.value as WcagStandard)}
                            options={STANDARDS}
                            disabled={scanning || scanMode === 'deep'}
                            fullWidth
                        />
                    </Box>

                    {/* Runners (Only for Single Page currently) */}
                    <Box sx={{ minWidth: 200, pt: 0.5, opacity: scanMode === 'deep' ? 0.5 : 1, pointerEvents: scanMode === 'deep' ? 'none' : 'auto' }}>
                        <MsqdxCheckboxField
                            label={t('scan.enginesLabel')}
                            options={RUNNERS.map(r => ({ value: r.value, label: r.label, disabled: scanning || scanMode === 'deep' }))}
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
