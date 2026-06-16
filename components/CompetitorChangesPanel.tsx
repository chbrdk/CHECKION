'use client';

import { useState } from 'react';
import { Box, Collapse } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';
import { pathDomain } from '@/lib/constants';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CompetitorChangesPanelData {
    own: DomainScanDiffResult | null;
    competitors: Record<string, DomainScanDiffResult | null>;
}

function activityCount(diff: DomainScanDiffResult | null): number {
    if (!diff?.previousScanId) return 0;
    return diff.summary.newCount + diff.summary.likelyUpdatedCount + diff.summary.removedCount;
}

function DiffSummaryChips({ diff }: { diff: DomainScanDiffResult }) {
    const { t } = useI18n();
    const s = diff.summary;
    const chips: Array<{ label: string; show: boolean }> = [
        { label: t('projects.competitorChanges.newPages', { count: s.newCount }), show: s.newCount > 0 },
        {
            label: t('projects.competitorChanges.updatedPages', { count: s.likelyUpdatedCount }),
            show: s.likelyUpdatedCount > 0,
        },
        { label: t('projects.competitorChanges.removedPages', { count: s.removedCount }), show: s.removedCount > 0 },
        {
            label: t('projects.competitorChanges.newThemes', {
                count: (diff.themes ?? []).filter((th) => th.kind === 'new').length,
            }),
            show: (diff.themes ?? []).some((th) => th.kind === 'new'),
        },
    ];
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {chips
                .filter((c) => c.show)
                .map((c) => (
                    <MsqdxChip key={c.label} size="small" label={c.label} />
                ))}
        </Box>
    );
}

function DomainDiffBlock({
    domain,
    diff,
    scanId,
    projectId,
    isOwn,
}: {
    domain: string;
    diff: DomainScanDiffResult;
    scanId: string;
    projectId: string;
    isOwn?: boolean;
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const newPages = diff.pages.filter((p) => p.kind === 'new').slice(0, 8);
    const updatedPages = diff.pages.filter((p) => p.kind === 'likely_updated').slice(0, 8);
    const newThemes = (diff.themes ?? []).filter((th) => th.kind === 'new').slice(0, 6);

    if (!diff.previousScanId) {
        return (
            <Box sx={{ py: 0.75, borderBottom: '1px solid var(--color-border-subtle)' }}>
                <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                    {domain}
                    {isOwn ? ` (${t('projects.ownDomainScanLabel')})` : ''}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                    {t('projects.competitorChanges.firstScan')}
                </MsqdxTypography>
            </Box>
        );
    }

    if (activityCount(diff) === 0 && newThemes.length === 0) {
        return null;
    }

    return (
        <Box sx={{ py: 0.75, borderBottom: '1px solid var(--color-border-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                        {domain}
                        {isOwn ? ` (${t('projects.ownDomainScanLabel')})` : ''}
                    </MsqdxTypography>
                    <DiffSummaryChips diff={diff} />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <MsqdxButton variant="text" size="small" onClick={() => setOpen((v) => !v)}>
                        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </MsqdxButton>
                    <Link href={pathDomain(scanId, { projectId })} style={{ textDecoration: 'none' }}>
                        <MsqdxButton variant="outlined" size="small">
                            {t('projects.open')}
                        </MsqdxButton>
                    </Link>
                </Box>
            </Box>
            <Collapse in={open}>
                <Box sx={{ mt: 1, pl: 0.5 }}>
                    {newPages.length > 0 ? (
                        <Box sx={{ mb: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                {t('projects.competitorChanges.newPagesList')}
                            </MsqdxTypography>
                            {newPages.map((p) => (
                                <MsqdxTypography
                                    key={p.url}
                                    variant="caption"
                                    sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', wordBreak: 'break-all' }}
                                >
                                    {p.url}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    ) : null}
                    {updatedPages.length > 0 ? (
                        <Box sx={{ mb: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                {t('projects.competitorChanges.updatedPagesList')}
                            </MsqdxTypography>
                            {updatedPages.map((p) => (
                                <MsqdxTypography
                                    key={p.url}
                                    variant="caption"
                                    sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', wordBreak: 'break-all' }}
                                >
                                    {p.url}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    ) : null}
                    {newThemes.length > 0 ? (
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                {t('projects.competitorChanges.newThemesList')}
                            </MsqdxTypography>
                            {newThemes.map((th) => (
                                <MsqdxTypography key={th.themeTagKey} variant="caption" sx={{ display: 'block' }}>
                                    {th.themeTag}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    ) : null}
                </Box>
            </Collapse>
        </Box>
    );
}

export function CompetitorChangesPanel({
    data,
    projectId,
    loading,
}: {
    data: CompetitorChangesPanelData | null;
    projectId: string;
    loading?: boolean;
}) {
    const { t } = useI18n();

    const hasCompetitors = data && Object.keys(data.competitors).length > 0;
    const hasOwn = Boolean(data?.own);
    if (!hasCompetitors && !hasOwn) return null;

    const anyActivity =
        activityCount(data?.own ?? null) > 0 ||
        Object.values(data?.competitors ?? {}).some((d) => activityCount(d) > 0);

    const hasComparable =
        Boolean(data?.own?.previousScanId) ||
        Object.values(data?.competitors ?? {}).some((d) => d?.previousScanId);

    return (
        <MsqdxMoleculeCard
            title={t('projects.competitorChanges.title')}
            subtitle={t('projects.competitorChanges.subtitle')}
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', mt: 1.5 }}
        >
            {loading ? (
                <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
            ) : !hasComparable && !hasOwn ? (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('projects.competitorChanges.empty')}
                </MsqdxTypography>
            ) : (
                <Box>
                    {!anyActivity && hasComparable ? (
                        <MsqdxTypography
                            variant="body2"
                            sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}
                        >
                            {t('projects.competitorChanges.allUnchanged')}
                        </MsqdxTypography>
                    ) : null}
                    {data?.own ? (
                        <DomainDiffBlock
                            domain={data.own.lineageKey.split('|').pop() ?? t('projects.ownDomainScanLabel')}
                            diff={data.own}
                            scanId={data.own.currentScanId}
                            projectId={projectId}
                            isOwn
                        />
                    ) : null}
                    {Object.entries(data?.competitors ?? {}).map(([domain, diff]) =>
                        diff ? (
                            <DomainDiffBlock
                                key={domain}
                                domain={domain}
                                diff={diff}
                                scanId={diff.currentScanId}
                                projectId={projectId}
                            />
                        ) : null,
                    )}
                </Box>
            )}
        </MsqdxMoleculeCard>
    );
}

/** Badge count for competitor row in project overview. */
export function competitorChangeBadgeCount(
    diff: DomainScanDiffResult | null | undefined,
): number {
    if (!diff?.previousScanId) return 0;
    return diff.summary.newCount + diff.summary.likelyUpdatedCount;
}
