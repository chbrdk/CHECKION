'use client';

import React, { memo, useCallback } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { MSQDX_INNER_CARD_BORDER_SX, THEME_ACCENT_CSS, THEME_ACCENT_TINT_CSS } from '@/lib/theme-accent';
import { formatUrlForList } from '@/lib/format-url-display';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedUx } from '@/lib/domain-aggregation';
import {
    DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    DOMAIN_UX_BROKEN_LINKS_PREVIEW,
} from '@/lib/constants';
import { UxBrokenLinkScrollRow } from '@/components/domain/UxBrokenLinkScrollRow';

export type DomainResultUxAuditSectionProps = {
    t: (key: string, params?: Record<string, string | number>) => string;
    ux: AggregatedUx;
    onOpenPageUrl: (url: string) => void;
    uxBrokenLinksPreview: AggregatedUx['brokenLinks'];
};

function kpiScoreColor(score: number): string {
    if (score >= 80) return THEME_ACCENT_CSS;
    if (score >= 55) return MSQDX_STATUS.warning.base;
    return MSQDX_STATUS.error.base;
}

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

function DomainResultUxAuditSectionInner({ t, ux, onOpenPageUrl, uxBrokenLinksPreview }: DomainResultUxAuditSectionProps) {
    const hh = ux.headingHierarchy;
    const showHeadingsHint =
        hh.totalPages > 0 && (hh.pagesWithMultipleH1 > 0 || hh.pagesWithSkippedLevels > 0);

    const readLine = ux.readability.grade
        ? t('domainResult.uxAuditKpiReadabilityLine', {
              grade: ux.readability.grade,
              score: ux.readability.score,
          })
        : t('domainResult.uxAuditKpiReadabilityEmpty');

    return (
        <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
            <MsqdxMoleculeCard
                title={t('domainResult.uxAuditTitle')}
                headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />}
                subtitle={t('domainResult.uxAuditSubtitle')}
                variant="flat"
                borderRadius="1.5xl"
                footerDivider={false}
                sx={{ bgcolor: 'var(--color-card-bg)' }}
            >
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
                    <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                        {t('domainResult.uxAuditHeadingsHint', {
                            multiH1: hh.pagesWithMultipleH1,
                            skipped: hh.pagesWithSkippedLevels,
                            total: hh.totalPages,
                        })}
                    </MsqdxTypography>
                ) : null}
            </MsqdxMoleculeCard>

            {ux.pagesByScore.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.uxAuditSectionPriority')}
                    subtitle={t('domainResult.uxAuditSectionPriorityIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX }}
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
            ) : null}

            {ux.consoleErrorsByPage.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.uxAuditSectionConsole')}
                    subtitle={t('domainResult.uxAuditSectionConsoleIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX }}
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
            ) : null}

            {ux.tapTargets.detailsByPage.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.uxAuditSectionTap')}
                    subtitle={t('domainResult.uxAuditSectionTapIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX }}
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
            ) : null}

            {ux.focusOrderByPage.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.uxAuditSectionFocus')}
                    subtitle={t('domainResult.uxAuditSectionFocusIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX }}
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
            ) : null}

            {ux.brokenLinks.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.uxAuditBrokenTitle')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)', ...MSQDX_INNER_CARD_BORDER_SX }}
                >
                    <VirtualScrollList
                        items={uxBrokenLinksPreview}
                        maxHeight={220}
                        estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(l, i) => `${l.href}|${l.pageUrl}|${l.status}|${i}`}
                        renderItem={(l) => <UxBrokenLinkScrollRow link={l} />}
                    />
                    {ux.brokenLinks.length > DOMAIN_UX_BROKEN_LINKS_PREVIEW ? (
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                            {t('domainResult.uxAuditBrokenMore', {
                                count: ux.brokenLinks.length - DOMAIN_UX_BROKEN_LINKS_PREVIEW,
                            })}
                        </MsqdxTypography>
                    ) : null}
                </MsqdxMoleculeCard>
            ) : null}
        </Stack>
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
