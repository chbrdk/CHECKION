'use client';

import React, { memo } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { InfoTooltip } from '@/components/InfoTooltip';
import {
    apiScanDomainSummarize,
} from '@/lib/constants';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';

export type DomainResultUxCxSectionProps = {
    t: (key: string) => string;
    result: DomainSummaryApiResponse;
    summarizing: boolean;
    setSummarizing: React.Dispatch<React.SetStateAction<boolean>>;
    summarizeError: string | null;
    setSummarizeError: React.Dispatch<React.SetStateAction<string | null>>;
    setResult: React.Dispatch<React.SetStateAction<DomainSummaryApiResponse | null>>;
};

function DomainResultUxCxSectionInner({
    t,
    result,
    summarizing,
    setSummarizing,
    summarizeError,
    setSummarizeError,
    setResult,
}: DomainResultUxCxSectionProps) {
    return (
        <MsqdxMoleculeCard
            title="UX/CX Check (Domain)"
            headerActions={<InfoTooltip title={t('info.uxCxCheck')} ariaLabel={t('common.info')} />}
            subtitle="Bewertung und Handlungsempfehlungen für die gesamte Domain"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
            borderRadius="lg"
        >
            {result.llmSummary ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                    {result.llmSummary.overallGrade && (
                        <MsqdxChip label={result.llmSummary.overallGrade} size="small" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
                    )}
                    <MsqdxTypography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {result.llmSummary.summary}
                    </MsqdxTypography>
                    {result.llmSummary.themes?.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Themen</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {result.llmSummary.themes.map((th, i) => (
                                    <MsqdxChip
                                        key={i}
                                        label={th.description ? `${th.name}: ${th.description}` : th.name}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            bgcolor: th.severity === 'high' ? alpha(MSQDX_STATUS.error.base, 0.08) : th.severity === 'medium' ? alpha(MSQDX_STATUS.warning.base, 0.08) : undefined,
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
                        Generiert mit {result.llmSummary.modelUsed} am{' '}
                        <span suppressHydrationWarning>{new Date(result.llmSummary.generatedAt).toLocaleString('de-DE')}</span>.
                    </MsqdxTypography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                        Hier erscheint eine Gesamtbewertung der Domain und konkrete Handlungsempfehlungen auf Basis aller gescannten Seiten und systemischen Issues.
                    </MsqdxTypography>
                    {summarizeError && (
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{summarizeError}</MsqdxTypography>
                    )}
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        disabled={summarizing || result.status !== 'complete'}
                        onClick={async () => {
                            if (!result?.id || summarizing) return;
                            setSummarizeError(null);
                            setSummarizing(true);
                            try {
                                const res = await fetch(apiScanDomainSummarize(result.id), { method: 'POST' });
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
    );
}

export const DomainResultUxCxSection = memo(DomainResultUxCxSectionInner);
