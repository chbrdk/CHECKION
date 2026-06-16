'use client';

import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { CompetitorChangeAlertRow } from '@/lib/db/competitor-change-alerts';

export function CompetitorAlertsBanner({
    alerts,
    onDismiss,
}: {
    alerts: CompetitorChangeAlertRow[];
    onDismiss: () => void;
}) {
    const { t } = useI18n();
    if (alerts.length === 0) return null;

    return (
        <Box
            sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid var(--color-border-subtle)',
                bgcolor: 'var(--color-card-bg)',
            }}
        >
            <MsqdxTypography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                {t('projects.competitorChanges.alertsTitle', { count: alerts.length })}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {alerts.slice(0, 6).map((a) => (
                    <MsqdxChip
                        key={a.id}
                        size="small"
                        label={t('projects.competitorChanges.alertChip', {
                            domain: a.domain,
                            new: a.summary.newCount,
                            updated: a.summary.likelyUpdatedCount,
                        })}
                    />
                ))}
            </Box>
            <MsqdxButton variant="text" size="small" onClick={onDismiss}>
                {t('projects.competitorChanges.alertsDismiss')}
            </MsqdxButton>
        </Box>
    );
}
