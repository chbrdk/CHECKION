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
import {
    MSQDX_SPACING,
    MSQDX_THEME,
    MSQDX_BRAND_PRIMARY,
    MSQDX_STATUS,
} from '@msqdx/tokens';
import type { ScanResult, WcagStandard, Runner } from '@/lib/types';
import type { SelectChangeEvent } from '@mui/material';

const STANDARDS: { value: WcagStandard; label: string }[] = [
    { value: 'WCAG2A', label: 'WCAG 2.0 Level A' },
    { value: 'WCAG2AA', label: 'WCAG 2.0 Level AA' },
    { value: 'WCAG2AAA', label: 'WCAG 2.0 Level AAA' },
];

const RUNNERS: { value: Runner; label: string; desc: string }[] = [
    { value: 'axe', label: 'axe-core', desc: 'Deque axe accessibility engine' },
    { value: 'htmlcs', label: 'HTML CodeSniffer', desc: 'Squiz HTML_CodeSniffer' },
];

export default function ScanPage() {
    const router = useRouter();
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
                    setError(data.error || 'Scan fehlgeschlagen');
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
                    setError(data.error || 'Scan fehlgeschlagen');
                    setScanning(false);
                    return;
                }

                // Redirect to the Domain Scan Progress page
                // We pass the URL parameter so the page knows what we are looking for, 
                // but since we already started it, let's redirect to monitoring
                router.push(`/scan/domain?url=${encodeURIComponent(url.trim())}`);
            }

        } catch (err) {
            setError('Netzwerkfehler. Bitte prüfe deine Verbindung.');
            setScanning(false);
        }
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: MSQDX_SPACING.scale.md }}>
                <MsqdxTypography
                    variant="h4"
                    sx={{ fontWeight: 700, mb: MSQDX_SPACING.scale.xs, letterSpacing: '-0.02em' }}
                >
                    Neuer Scan
                </MsqdxTypography>
                <MsqdxTypography
                    variant="body2"
                    sx={{ color: 'var(--color-text-muted-on-light)' }}
                >
                    Gib eine URL ein und starte einen automatisierten WCAG Accessibility Check (Desktop, Tablet & Mobile).
                </MsqdxTypography>
            </Box>

            {/* Main Scan Card */}
            <MsqdxMoleculeCard
                title="Scan Konfiguration"
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
                        {scanning ? 'Scan läuft…' : 'Scan starten'}
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
                                { value: 'single', label: 'Single Page Scan' },
                                { value: 'deep', label: 'Deep Domain Scan' }
                            ]}
                        />
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                            {scanMode === 'single'
                                ? 'Analysiert genau EINE Seite sofort (Synchron). Inklusive Screenshots & Visueller Analyse.'
                                : 'Analysiert die gesamte Domain im Hintergrund (Asynchron). Findet systemische Fehler.'}
                        </MsqdxTypography>
                    </Box>

                    {/* URL Input - Grows to fill available space */}
                    <Box sx={{ flex: 1 }}>
                        <MsqdxFormField
                            label="Ziel-URL"
                            placeholder={scanMode === 'single' ? "https://example.com/page" : "https://example.com"}
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
                            label="Standard"
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
                            label="Engines"
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
                        Die Seite wird geladen und analysiert. Das kann einige Sekunden dauern…
                    </MsqdxTypography>
                </Box>
            )}
        </Box>
    );
}
