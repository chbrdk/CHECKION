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

    const handleScan = async () => {
        if (!url.trim()) return;
        setError(null);
        setScanning(true);

        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), standard, runners: selectedRunners }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Scan fehlgeschlagen');
                setScanning(false);
                return;
            }

            const result = data as ScanResult;
            router.push(`/results/${result.id}`);
        } catch (err) {
            setError('Netzwerkfehler. Bitte prüfe deine Verbindung.');
            setScanning(false);
        }
    };

    return (
        <Box sx={{ p: `${MSQDX_SPACING.scale.md}px`, maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: `${MSQDX_SPACING.scale.md}px` }}>
                <MsqdxTypography
                    variant="h4"
                    sx={{ fontWeight: 700, mb: `${MSQDX_SPACING.scale.xs}px`, letterSpacing: '-0.02em' }}
                >
                    Neuer Scan
                </MsqdxTypography>
                <MsqdxTypography
                    variant="body2"
                    sx={{ color: MSQDX_THEME.dark.text.tertiary }}
                >
                    Gib eine URL ein und starte einen automatisierten WCAG Accessibility Check (Desktop, Tablet & Mobile).
                </MsqdxTypography>
            </Box>

            {/* Main Scan Card */}
            <MsqdxMoleculeCard
                title="Scan Konfiguration"
                variant="flat"
                borderRadius="lg"
                footerDivider={false} // Custom footer layout
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
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' }, gap: MSQDX_SPACING.scale.lg, alignItems: 'start' }}>

                    {/* URL Input - Grows to fill available space */}
                    <Box sx={{ flex: 1 }}>
                        <MsqdxFormField
                            label="Ziel-URL"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            disabled={scanning}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleScan()}
                            autoFocus
                            fullWidth
                        />
                    </Box>

                    {/* WCAG Standard */}
                    <Box sx={{ minWidth: 200 }}>
                        <MsqdxSelect
                            label="Standard"
                            value={standard}
                            onChange={(e: SelectChangeEvent<unknown>) => setStandard(e.target.value as WcagStandard)}
                            options={STANDARDS}
                            disabled={scanning}
                            fullWidth
                        />
                    </Box>

                    {/* Runners */}
                    <Box sx={{ minWidth: 200, pt: 0.5 }}>
                        <MsqdxCheckboxField
                            label="Engines"
                            options={RUNNERS.map(r => ({ value: r.value, label: r.label, disabled: scanning }))}
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
                            mt: MSQDX_SPACING.scale.lg,
                            p: MSQDX_SPACING.scale.md,
                            borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
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
                <Box sx={{ mt: MSQDX_SPACING.scale.lg, textAlign: 'center' }}>
                    <CircularProgress size={28} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                    <MsqdxTypography
                        variant="caption"
                        sx={{ color: MSQDX_THEME.dark.text.tertiary, mt: MSQDX_SPACING.scale.sm, display: 'block' }}
                    >
                        Die Seite wird geladen und analysiert. Das kann einige Sekunden dauern…
                    </MsqdxTypography>
                </Box>
            )}
        </Box>
    );
}
