'use client';

import React, { memo, useCallback } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { MSQDX_INNER_CARD_BORDER_SX, THEME_ACCENT_CSS, THEME_ACCENT_TINT_CSS } from '@/lib/theme-accent';
import { formatUrlForList } from '@/lib/format-url-display';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedUx, ReadabilityBandKey } from '@/lib/domain-aggregation';

export type DomainResultUxAuditSectionProps = {
    t: (key: string, params?: Record<string, string | number>) => string;
    ux: AggregatedUx;
    onOpenPageUrl: (url: string) => void;
};

function kpiScoreColor(score: number): string {
    if (score >= 80) return THEME_ACCENT_CSS;
    if (score >= 55) return MSQDX_STATUS.warning.base;
    return MSQDX_STATUS.error.base;
}

/** Flex-Wrap in der rechten UX-Spalte: Karten nutzen die Breite, umbrechen auf kleiner Viewport/untereinander. */
const UX_DETAIL_WRAP_ITEM_SX = {
    flex: { xs: '1 1 100%', sm: '1 1 240px' },
    minWidth: { xs: 0, sm: 220 },
    maxWidth: '100%',
    display: 'flex',
} as const;

const UX_DETAIL_WRAP_FULL_SX = {
    flex: '1 1 100%',
    minWidth: 0,
    width: '100%',
    display: 'flex',
} as const;

type PageRowProps = {
    url: string;
    ariaLabel: string;
    onOpen: () => void;
    chipLabel: string;
};

const UxAuditPageRow = memo(function UxAuditPageRow({ url, ariaLabel, onOpen, chipLabel }: PageRowProps) {
    const display = formatUrlForList(url);
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
            }
        },
        [onOpen]
    );

    return (
        <Box
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            onClick={onOpen}
            onKeyDown={handleKeyDown}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 1,
                px: 1.25,
                borderRadius: 'var(--msqdx-radius-md)',
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background-color 120ms ease, border-color 120ms ease',
                '&:hover': {
                    bgcolor: THEME_ACCENT_TINT_CSS,
                    borderColor: THEME_ACCENT_CSS,
                },
                '&:focus-visible': {
                    boxShadow: `0 0 0 2px ${THEME_ACCENT_TINT_CSS}`,
                    borderColor: THEME_ACCENT_CSS,
                },
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <MsqdxTypography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        lineHeight: 1.35,
                        color: THEME_ACCENT_CSS,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={url}
                >
                    {display}
                </MsqdxTypography>
            </Box>
            <MsqdxChip
                label={chipLabel}
                size="small"
                sx={{
                    flexShrink: 0,
                    fontSize: '0.7rem',
                    height: 24,
                    bgcolor: 'var(--color-card-bg) !important',
                    border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
                    color: 'var(--color-text-on-light) !important',
                }}
            />
        </Box>
    );
});

const READABILITY_BAND_KEYS: ReadabilityBandKey[] = ['easy', 'standard', 'complex', 'veryComplex'];

function DomainResultUxAuditSectionInner({ t, ux, onOpenPageUrl }: DomainResultUxAuditSectionProps) {
    const hh = ux.headingHierarchy;
    const showHeadingsHint =
        hh.totalPages > 0 && (hh.pagesWithMultipleH1 > 0 || hh.pagesWithSkippedLevels > 0);

    const read = ux.readability;
    const readLine = read.pagesWithReadability > 0
        ? t('domainResult.uxAuditKpiReadabilityLine', {
              grade: read.grade,
              score: read.score,
          })
        : t('domainResult.uxAuditKpiReadabilityEmpty');

    const hasPriority = ux.pagesByScore.length > 0;
    const hasReadabilitySection = ux.pageCount > 0;
    const hasReadabilityRows = read.pagesWithReadability > 0;
    const readabilityBands =
        read.bandCounts ??
        ({ easy: 0, standard: 0, complex: 0, veryComplex: 0 } satisfies Record<ReadabilityBandKey, number>);
    const hasDetailContent =
        ux.consoleErrorsByPage.length > 0 ||
        ux.tapTargets.detailsByPage.length > 0 ||
        ux.focusOrderByPage.length > 0 ||
        hasReadabilitySection;

    const priorityCard = hasPriority ? (
        <MsqdxMoleculeCard
            title={t('domainResult.uxAuditSectionPriority')}
            titleVariant="h6"
            subtitle={t('domainResult.uxAuditSectionPriorityIntro')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX, width: '100%' }}
        >
            <Stack spacing={1}>
                {ux.pagesByScore.slice(0, 10).map(({ url, score, cls }) => (
                    <UxAuditPageRow
                        key={url}
                        url={url}
                        ariaLabel={t('domainResult.uxAuditOpenScanAria', { url })}
                        onOpen={() => onOpenPageUrl(url)}
                        chipLabel={t('domainResult.uxAuditScoreChip', { score, cls })}
                    />
                ))}
            </Stack>
        </MsqdxMoleculeCard>
    ) : null;

    const detailColumn = hasDetailContent ? (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'stretch',
                alignContent: 'flex-start',
                minWidth: 0,
                width: '100%',
            }}
        >
            {hasReadabilitySection ? (
                <Box sx={UX_DETAIL_WRAP_FULL_SX}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.uxAuditReadabilityTitle')}
                        titleVariant="h6"
                        subtitle={t('domainResult.uxAuditReadabilityIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX, width: '100%' }}
                    >
                        {!hasReadabilityRows ? (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                                {t('domainResult.uxAuditReadabilityNoData')}
                            </MsqdxTypography>
                        ) : (
                            <Stack spacing={2}>
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', lineHeight: 1.45 }}>
                                    {t('domainResult.uxAuditReadabilityRange', {
                                        avg: read.score,
                                        min: read.minScore,
                                        max: read.maxScore,
                                        withData: read.pagesWithReadability,
                                        total: ux.pageCount,
                                    })}
                                </MsqdxTypography>
                                <Stack spacing={1}>
                                    {READABILITY_BAND_KEYS.map((band) => {
                                        const n = readabilityBands[band];
                                        const total = read.pagesWithReadability;
                                        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                                        return (
                                            <Box key={band}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25, gap: 1 }}>
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                        {t(`domainResult.uxAuditReadabilityBand.${band}`)}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                        {n} ({pct}%)
                                                    </MsqdxTypography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 1,
                                                        bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            height: '100%',
                                                            width: `${pct}%`,
                                                            bgcolor: THEME_ACCENT_CSS,
                                                            transition: 'width 0.2s ease',
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                                {(read.hardestPages ?? []).length > 0 ? (
                                    <Stack spacing={0.5}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)' }}>
                                            {t('domainResult.uxAuditReadabilityHardest')}
                                        </MsqdxTypography>
                                        <Stack spacing={1}>
                                            {(read.hardestPages ?? []).map(({ url, score, grade }) => (
                                                <UxAuditPageRow
                                                    key={`r-${url}`}
                                                    url={url}
                                                    ariaLabel={t('domainResult.uxAuditOpenScanAria', { url })}
                                                    onOpen={() => onOpenPageUrl(url)}
                                                    chipLabel={t('domainResult.uxAuditReadabilityChip', { score, grade })}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>
                                ) : null}
                            </Stack>
                        )}
                    </MsqdxMoleculeCard>
                </Box>
            ) : null}

            {ux.consoleErrorsByPage.length > 0 ? (
                <Box sx={UX_DETAIL_WRAP_ITEM_SX}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.uxAuditSectionConsole')}
                        titleVariant="h6"
                        subtitle={t('domainResult.uxAuditSectionConsoleIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX, width: '100%' }}
                    >
                        <Stack spacing={1}>
                            {ux.consoleErrorsByPage.slice(0, 8).map(({ url, count }) => (
                                <UxAuditPageRow
                                    key={`c-${url}`}
                                    url={url}
                                    ariaLabel={t('domainResult.uxAuditOpenScanAria', { url })}
                                    onOpen={() => onOpenPageUrl(url)}
                                    chipLabel={t('domainResult.uxAuditCountChip', { count })}
                                />
                            ))}
                        </Stack>
                    </MsqdxMoleculeCard>
                </Box>
            ) : null}

            {ux.tapTargets.detailsByPage.length > 0 ? (
                <Box sx={UX_DETAIL_WRAP_ITEM_SX}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.uxAuditSectionTap')}
                        titleVariant="h6"
                        subtitle={t('domainResult.uxAuditSectionTapIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX, width: '100%' }}
                    >
                        <Stack spacing={1}>
                            {ux.tapTargets.detailsByPage.slice(0, 8).map(({ url, count }) => (
                                <UxAuditPageRow
                                    key={`t-${url}`}
                                    url={url}
                                    ariaLabel={t('domainResult.uxAuditOpenScanAria', { url })}
                                    onOpen={() => onOpenPageUrl(url)}
                                    chipLabel={t('domainResult.uxAuditCountChip', { count })}
                                />
                            ))}
                        </Stack>
                    </MsqdxMoleculeCard>
                </Box>
            ) : null}

            {ux.focusOrderByPage.length > 0 ? (
                <Box sx={UX_DETAIL_WRAP_ITEM_SX}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.uxAuditSectionFocus')}
                        titleVariant="h6"
                        subtitle={t('domainResult.uxAuditSectionFocusIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX, width: '100%' }}
                    >
                        <Stack spacing={1}>
                            {ux.focusOrderByPage.slice(0, 8).map(({ url, count }) => (
                                <UxAuditPageRow
                                    key={`f-${url}`}
                                    url={url}
                                    ariaLabel={t('domainResult.uxAuditOpenScanAria', { url })}
                                    onOpen={() => onOpenPageUrl(url)}
                                    chipLabel={t('domainResult.uxAuditCountChip', { count })}
                                />
                            ))}
                        </Stack>
                    </MsqdxMoleculeCard>
                </Box>
            ) : null}
        </Box>
    ) : null;

    return (
        <MsqdxMoleculeCard
            title={t('domainResult.uxAuditTitle')}
            headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.uxAuditSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            {t('domainResult.uxAuditKpiUxScore')}
                        </MsqdxTypography>
                        <MsqdxTypography variant="h5" sx={{ fontWeight: 700, color: kpiScoreColor(ux.score), mt: 0.5 }}>
                            {ux.score}
                        </MsqdxTypography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            {t('domainResult.uxAuditKpiCls')}
                        </MsqdxTypography>
                        <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                            {ux.cls}
                        </MsqdxTypography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            {t('domainResult.uxAuditKpiBrokenLinks')}
                        </MsqdxTypography>
                        <MsqdxTypography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                mt: 0.5,
                                color: ux.brokenLinks.length === 0 ? undefined : MSQDX_STATUS.warning.base,
                            }}
                        >
                            {ux.brokenLinks.length}
                        </MsqdxTypography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            {t('domainResult.uxAuditKpiReadability')}
                        </MsqdxTypography>
                        <MsqdxTypography variant="body1" sx={{ fontWeight: 600, mt: 0.5, lineHeight: 1.3 }}>
                            {readLine}
                        </MsqdxTypography>
                    </Box>
                </Box>
                {showHeadingsHint ? (
                    <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                        {t('domainResult.uxAuditHeadingsHint', {
                            multiH1: hh.pagesWithMultipleH1,
                            skipped: hh.pagesWithSkippedLevels,
                            total: hh.totalPages,
                        })}
                    </MsqdxTypography>
                ) : null}

                {hasPriority && hasDetailContent ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: 'flex-start',
                            gap: 2,
                            width: '100%',
                            minWidth: 0,
                        }}
                    >
                        <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>{priorityCard}</Box>
                        <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>{detailColumn}</Box>
                    </Box>
                ) : null}
                {hasPriority && !hasDetailContent ? <Box sx={{ minWidth: 0 }}>{priorityCard}</Box> : null}
                {!hasPriority && hasDetailContent ? <Box sx={{ minWidth: 0 }}>{detailColumn}</Box> : null}
            </Stack>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultUxAuditSection = memo(DomainResultUxAuditSectionInner);

function DomainResultUxAuditEmptyInner({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.uxAuditTitle')}
            headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('domainResult.uxAuditEmpty')}
            </MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultUxAuditEmpty = memo(DomainResultUxAuditEmptyInner);
