'use client';

import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { DomainScanDiffResult, DomainThemeChange } from '@/lib/domain-scan-diff';

function collectThemeHighlights(diff: DomainScanDiffResult | null): DomainThemeChange[] {
    if (!diff?.themes?.length) return [];
    return diff.themes.filter((t) => t.kind === 'new' || t.kind === 'strengthened' || t.kind === 'tier_changed').slice(0, 8);
}

export function PageTopicsChangeHighlights({
    competitors,
}: {
    competitors: Record<string, DomainScanDiffResult | null>;
}) {
    const { t } = useI18n();
    const entries = Object.entries(competitors)
        .map(([domain, diff]) => ({ domain, themes: collectThemeHighlights(diff) }))
        .filter((e) => e.themes.length > 0);

    if (entries.length === 0) return null;

    return (
        <Box sx={{ mb: 2 }}>
            <MsqdxTypography variant="subtitle2" sx={{ mb: 1 }}>
                {t('projects.pageTopicsChangeHighlightsTitle')}
            </MsqdxTypography>
            {entries.map(({ domain, themes }) => (
                <Box key={domain} sx={{ mb: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                        {domain}
                    </MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                        {themes.map((th) => (
                            <MsqdxChip
                                key={`${domain}-${th.themeTagKey}`}
                                size="small"
                                label={`${th.themeTag} (${th.kind})`}
                            />
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
