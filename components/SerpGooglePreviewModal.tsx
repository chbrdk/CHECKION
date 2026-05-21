'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
} from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { X } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiRankTrackingKeywordSerpPreview } from '@/lib/constants';
import { domainMatchesOrganic, type SerpOrganicResult } from '@/lib/serp-organic';

export interface SerpGooglePreviewModalProps {
    open: boolean;
    onClose: () => void;
    keywordId: string | null;
    ourDomain: string;
    competitorDomains?: string[];
}

interface SerpPreviewData {
    keyword: string;
    domain: string;
    country: string;
    language: string;
    device?: string;
    position: number | null;
    recordedAt: string;
    organic: SerpOrganicResult[];
}

function formatDisplayUrl(link: string): string {
    try {
        const u = new URL(link.startsWith('http') ? link : `https://${link}`);
        const path = u.pathname === '/' ? '' : u.pathname;
        return `${u.hostname}${path}${u.search}`;
    } catch {
        return link;
    }
}

function getResultRole(
    item: SerpOrganicResult,
    ourDomain: string,
    competitorDomains: string[]
): 'ours' | 'competitor' | null {
    if (domainMatchesOrganic(ourDomain, item.domain)) return 'ours';
    for (const c of competitorDomains) {
        if (domainMatchesOrganic(c, item.domain)) return 'competitor';
    }
    return null;
}

export function SerpGooglePreviewModal({
    open,
    onClose,
    keywordId,
    ourDomain,
    competitorDomains = [],
}: SerpGooglePreviewModalProps) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SerpPreviewData | null>(null);

    const loadPreview = useCallback(async () => {
        if (!keywordId) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await fetch(apiRankTrackingKeywordSerpPreview(keywordId), { credentials: 'same-origin' });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.success && json?.data) {
                setData(json.data as SerpPreviewData);
            } else if (res.status === 404) {
                setError(t('projects.serpPreviewNoData'));
            } else if (typeof json?.error === 'string') {
                setError(json.error);
            } else {
                setError(t('common.error'));
            }
        } catch {
            setError(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [keywordId, t]);

    useEffect(() => {
        if (open && keywordId) loadPreview();
        if (!open) {
            setData(null);
            setError(null);
        }
    }, [open, keywordId, loadPreview]);

    const marketLabel =
        data?.country && data?.language ? `${data.country.toUpperCase()} · ${data.language}` : '';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
            PaperProps={{
                sx: {
                    borderRadius: 'var(--msqdx-spacing-md, 8px)',
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    fontWeight: 600,
                    pb: 1,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <MsqdxTypography variant="subtitle1" weight="semibold">
                        {t('projects.serpPreviewTitle')}
                    </MsqdxTypography>
                    {data && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.serpPreviewSubtitle', {
                                count: String(data.organic.length),
                                date: new Date(data.recordedAt).toLocaleString(),
                            })}
                            {marketLabel ? ` · ${marketLabel}` : ''}
                        </MsqdxTypography>
                    )}
                </Box>
                <IconButton onClick={onClose} aria-label={t('projects.cancel')} size="small">
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: 'var(--color-theme-accent)' }} />
                    </Box>
                )}
                {error && !loading && (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error)', mb: 2 }}>
                            {error}
                        </MsqdxTypography>
                        <MsqdxButton variant="outlined" size="small" onClick={loadPreview}>
                            {t('projects.serpPreviewRetry')}
                        </MsqdxButton>
                    </Box>
                )}
                {data && !loading && !error && (
                    <Box
                        sx={{
                            bgcolor: '#fff',
                            color: '#202124',
                            borderRadius: 2,
                            border: '1px solid #dadce0',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                px: { xs: 2, sm: 3 },
                                pt: 2.5,
                                pb: 1.5,
                                borderBottom: '1px solid #ebebeb',
                            }}
                        >
                            <MsqdxTypography
                                variant="h5"
                                sx={{
                                    fontFamily: 'Arial, sans-serif',
                                    fontWeight: 400,
                                    letterSpacing: -0.5,
                                    color: '#4285f4',
                                    mb: 2,
                                    fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                }}
                            >
                                Google
                            </MsqdxTypography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    border: '1px solid #dfe1e5',
                                    borderRadius: '24px',
                                    px: 2,
                                    py: 1.25,
                                    boxShadow: '0 1px 6px rgba(32,33,36,.28)',
                                    bgcolor: '#fff',
                                }}
                            >
                                <MsqdxTypography
                                    variant="body1"
                                    sx={{ fontFamily: 'Arial, sans-serif', fontSize: '1rem', flex: 1 }}
                                >
                                    {data.keyword}
                                </MsqdxTypography>
                            </Box>
                            <MsqdxTypography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    mt: 1.5,
                                    color: '#70757a',
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {t('projects.serpPreviewAbout', { count: String(data.organic.length) })}
                                {data.position != null
                                    ? ` · ${t('projects.serpPreviewYourPosition', { position: String(data.position) })}`
                                    : ` · ${t('projects.serpPreviewNotRanked')}`}
                            </MsqdxTypography>
                        </Box>
                        <Box
                            component="ul"
                            sx={{
                                listStyle: 'none',
                                m: 0,
                                p: { xs: 2, sm: 3 },
                                maxHeight: 'min(55vh, 520px)',
                                overflowY: 'auto',
                            }}
                        >
                            {data.organic.map((item) => {
                                const role = getResultRole(item, ourDomain, competitorDomains);
                                return (
                                    <Box
                                        component="li"
                                        key={`${item.position}-${item.link}`}
                                        sx={{
                                            mb: 2.5,
                                            pb: 2.5,
                                            borderBottom: '1px solid #ebebeb',
                                            '&:last-child': { borderBottom: 0, mb: 0, pb: 0 },
                                            ...(role === 'ours' && {
                                                bgcolor: 'rgba(26, 115, 232, 0.06)',
                                                borderRadius: 1,
                                                px: 1.5,
                                                py: 1.5,
                                                ml: -1.5,
                                                mr: -1.5,
                                            }),
                                            ...(role === 'competitor' && {
                                                bgcolor: 'rgba(234, 67, 53, 0.04)',
                                                borderRadius: 1,
                                                px: 1.5,
                                                py: 1.5,
                                                ml: -1.5,
                                                mr: -1.5,
                                            }),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                            <MsqdxTypography
                                                variant="caption"
                                                sx={{
                                                    color: '#70757a',
                                                    fontFamily: 'Arial, sans-serif',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                {item.position}. {item.domain}
                                            </MsqdxTypography>
                                            {role === 'ours' && (
                                                <MsqdxChip
                                                    label={t('projects.serpPreviewYou')}
                                                    size="small"
                                                    color="primary"
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                            {role === 'competitor' && (
                                                <MsqdxChip
                                                    label={t('projects.serpPreviewCompetitor')}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                        </Box>
                                        <Box
                                            component="a"
                                            href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                display: 'block',
                                                color: '#1a0dab',
                                                fontFamily: 'Arial, sans-serif',
                                                fontSize: '1.25rem',
                                                lineHeight: 1.3,
                                                textDecoration: 'none',
                                                mb: 0.25,
                                                '&:hover': { textDecoration: 'underline' },
                                                '&:visited': { color: '#681da8' },
                                            }}
                                        >
                                            {item.title}
                                        </Box>
                                        <MsqdxTypography
                                            variant="caption"
                                            component="div"
                                            sx={{
                                                color: '#006621',
                                                fontFamily: 'Arial, sans-serif',
                                                fontSize: '0.875rem',
                                                mb: 0.5,
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {formatDisplayUrl(item.link)}
                                        </MsqdxTypography>
                                        {item.snippet && (
                                            <MsqdxTypography
                                                variant="body2"
                                                sx={{
                                                    color: '#4d5156',
                                                    fontFamily: 'Arial, sans-serif',
                                                    fontSize: '0.875rem',
                                                    lineHeight: 1.58,
                                                }}
                                            >
                                                {item.snippet}
                                            </MsqdxTypography>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
