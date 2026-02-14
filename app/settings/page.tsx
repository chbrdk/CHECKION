'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxSelect,
    MsqdxCheckboxField,
} from '@msqdx/react';
import {
    MSQDX_SPACING,
    MSQDX_THEME,
} from '@msqdx/tokens';
import type { WcagStandard, Runner } from '@/lib/types';
import type { SelectChangeEvent } from '@mui/material';

const STANDARDS: { value: WcagStandard; label: string; desc: string }[] = [
    { value: 'WCAG2A', label: 'Level A - Grundlegende Barrierefreiheit', desc: '' },
    { value: 'WCAG2AA', label: 'Level AA - Empfohlen für die meisten Websites', desc: '' },
    { value: 'WCAG2AAA', label: 'Level AAA - Höchstes Level der Barrierefreiheit', desc: '' },
];

const RUNNERS: { value: Runner; label: string; desc: string }[] = [
    { value: 'axe', label: 'axe-core (Deque axe accessibility engine)', desc: '' },
    { value: 'htmlcs', label: 'HTML CodeSniffer (Squiz HTML_CodeSniffer)', desc: '' },
];

export default function SettingsPage() {
    const [standard, setStandard] = useState<WcagStandard>('WCAG2AA');
    const [runners, setRunners] = useState<Runner[]>(['axe', 'htmlcs']);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // In a real app this would persist to a backend or localStorage
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: MSQDX_SPACING.scale.md }}>
                <MsqdxTypography
                    variant="h4"
                    sx={{ fontWeight: 700, mb: MSQDX_SPACING.scale.xs, letterSpacing: '-0.02em' }}
                >
                    Einstellungen
                </MsqdxTypography>
                <MsqdxTypography
                    variant="body2"
                    sx={{ color: 'var(--color-text-muted-on-light)' }}
                >
                    Konfiguriere die Standard-Parameter für neue Scans.
                </MsqdxTypography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 'var(--msqdx-spacing-md)' }}>

                {/* Left Column: Config */}
                <Box>
                    {/* Default Configuration */}
                    <MsqdxMoleculeCard
                        title="Standard Konfiguration"
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            {/* Default WCAG Standard */}
                            <MsqdxSelect
                                label="Standard WCAG Level"
                                value={standard}
                                onChange={(e: SelectChangeEvent<unknown>) => { setStandard(e.target.value as WcagStandard); setSaved(false); }}
                                options={STANDARDS}
                                fullWidth
                                helperText="Wähle das Standard-Level für neue Scans."
                            />

                            {/* Default Runners */}
                            <MsqdxCheckboxField
                                label="Standard Runners"
                                options={RUNNERS.map(r => ({ value: r.value, label: r.label }))}
                                value={runners}
                                onChange={(val) => { setRunners(val as Runner[]); setSaved(false); }}
                            />
                        </Box>
                    </MsqdxMoleculeCard>

                    {/* Save */}
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        size="medium"
                        onClick={handleSave}
                        sx={{ mt: 'var(--msqdx-spacing-md)', width: 'auto', minWidth: 200 }}
                    >
                        {saved ? '✓ Gespeichert' : 'Einstellungen speichern'}
                    </MsqdxButton>
                </Box>

                {/* Right Column: About */}
                <Box>
                    <MsqdxMoleculeCard
                        title="Über CHECKION"
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                    >
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.7 }}>
                            CHECKION nutzt <strong>pa11y</strong> und <strong>axe-core</strong> um automatisierte WCAG Accessibility
                            Checks durchzuführen. Die Ergebnisse helfen dir, deine Webseiten barrierefrei zu gestalten und gängige
                            Standards (WCAG 2.0 A, AA, AAA) einzuhalten.
                        </MsqdxTypography>
                        <MsqdxTypography
                            variant="caption"
                            sx={{ color: 'var(--color-text-muted-on-light)', mt: MSQDX_SPACING.scale.sm, display: 'block', fontSize: '0.6rem' }}
                        >
                            Basiert auf dem MSQDX Design System · v0.1.0
                        </MsqdxTypography>
                    </MsqdxMoleculeCard>
                </Box>

            </Box>
        </Box>
    );
}
