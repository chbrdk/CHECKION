'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { JourneyStep } from '@/lib/types';
import type { PageIndexRegion } from '@/lib/types';

/** Minimal page info for screenshot + region lookup (from domain result pages). */
export interface JourneyPageRef {
    id: string;
    url: string;
    pageIndex?: { regions?: PageIndexRegion[] };
}

interface JourneyFlowchartProps {
    steps: JourneyStep[];
    goalReached: boolean;
    message?: string;
    onStepClick?: (step: JourneyStep) => void;
    /** When true, show a loading indicator after the last step (streaming). */
    streaming?: boolean;
    t: (key: string) => string;
    /** Pages from domain result (id, url, pageIndex) so we can show screenshot + click region per step. */
    pages?: JourneyPageRef[];
}

function shortUrl(url: string, maxLen = 50): string {
    try {
        const u = new URL(url);
        const path = u.pathname.replace(/\/$/, '') || '/';
        const full = u.origin + path;
        return full.length <= maxLen ? full : full.slice(0, maxLen - 3) + '...';
    } catch {
        return url.length <= maxLen ? url : url.slice(0, maxLen - 3) + '...';
    }
}

function normalizePageUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + (u.pathname.replace(/\/$/, '') || '/');
    } catch {
        return url;
    }
}

/** Find the region whose heading best matches the trigger label (for click highlight). */
function regionRectForTrigger(regions: PageIndexRegion[] | undefined, triggerLabel: string | undefined): { x: number; y: number; width: number; height: number } | null {
    if (!triggerLabel?.trim() || !regions?.length) return null;
    const label = triggerLabel.trim().toLowerCase();
    let best: PageIndexRegion | null = null;
    let bestScore = 0;
    for (const r of regions) {
        const text = (r.headingText ?? '').toLowerCase();
        if (!text) continue;
        const score = text.includes(label) ? label.length : (label.includes(text) ? text.length : 0);
        if (score > 0 && score > bestScore) {
            bestScore = score;
            best = r;
        }
    }
    return best?.rect ?? null;
}

/** Label for findability: high = easy to find, low = rather hidden. */
function findabilityLabel(score: number | undefined, t: (key: string) => string): string | null {
    if (score == null) return null;
    if (score >= 0.7) return t('domainResult.journeyFindabilityHigh');
    if (score >= 0.4) return t('domainResult.journeyFindabilityMedium');
    return t('domainResult.journeyFindabilityLow');
}

const KNOWN_REGION_TYPES = ['nav', 'hero', 'main', 'footer', 'aside', 'about', 'contact', 'product', 'pricing', 'faq', 'team', 'unknown'];

function regionTypeLabel(semanticType: string | undefined, t: (key: string) => string): string {
    if (!semanticType) return '';
    const key = `domainResult.journeyRegion_${semanticType}`;
    const out = t(key);
    return KNOWN_REGION_TYPES.includes(semanticType) ? out : semanticType.charAt(0).toUpperCase() + semanticType.slice(1);
}

const CARD_MIN_WIDTH = 280;
const CARD_GAP = 12;

/** Screenshot with optional highlight rect (where the agent "clicked"). */
function StepScreenshot({
    scanId,
    highlightRect,
    alt,
}: {
    scanId: string;
    highlightRect: { x: number; y: number; width: number; height: number } | null;
    alt: string;
}) {
    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
    const src = `/api/scan/${scanId}/screenshot`;
    return (
        <Box sx={{ position: 'relative', width: '100%', borderRadius: 1, overflow: 'hidden', bgcolor: 'var(--color-neutral-100)', aspectRatio: '16/10' }}>
            <Box
                component="img"
                alt={alt}
                src={src}
                loading="lazy"
                onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.naturalWidth && img.naturalHeight) setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                sx={{ width: '100%', height: 'auto', display: 'block', verticalAlign: 'middle' }}
            />
            {highlightRect && imgSize && highlightRect.width > 0 && highlightRect.height > 0 && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        left: `${(highlightRect.x / imgSize.w) * 100}%`,
                        top: `${(highlightRect.y / imgSize.h) * 100}%`,
                        width: `${(highlightRect.width / imgSize.w) * 100}%`,
                        height: `${(highlightRect.height / imgSize.h) * 100}%`,
                        border: '2px solid var(--color-secondary-dx-green)',
                        borderRadius: 0.5,
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 2px rgba(255,255,255,0.8)',
                    }}
                />
            )}
        </Box>
    );
}

export function JourneyFlowchart({
    steps,
    goalReached,
    message,
    onStepClick,
    streaming,
    t,
    pages = [],
}: JourneyFlowchartProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
        const center = el.scrollLeft + el.clientWidth / 2;
        const cards = el.querySelectorAll('[data-journey-card]');
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((card, idx) => {
            const rect = card.getBoundingClientRect();
            const containerRect = el.getBoundingClientRect();
            const cardCenter = rect.left - containerRect.left + el.scrollLeft + rect.width / 2;
            const dist = Math.abs(center - cardCenter);
            if (dist < bestDist) {
                bestDist = dist;
                best = idx;
            }
        });
        setActiveIndex(best);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [steps.length]);

    const goTo = (index: number) => {
        const i = Math.max(0, Math.min(index, steps.length - 1));
        setActiveIndex(i);
        const card = scrollRef.current?.querySelectorAll('[data-journey-card]')[i];
        (card as HTMLElement)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    if (steps.length === 0) {
        return (
            <Box sx={{ py: 3, textAlign: 'center' }}>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('domainResult.journeyNoSteps')}
                </MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(goalReached || message) && (
                <Box>
                    {goalReached && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-secondary-dx-green)', fontWeight: 600 }}>
                            {t('domainResult.journeyGoalReached')}
                        </MsqdxTypography>
                    )}
                    {message && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                            {message}
                        </MsqdxTypography>
                    )}
                </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                    size="small"
                    onClick={() => goTo(activeIndex - 1)}
                    disabled={!canScrollLeft}
                    sx={{ flexShrink: 0 }}
                    aria-label={t('domainResult.journeyPrevStep')}
                >
                    <ChevronLeft size={20} />
                </IconButton>
                <Box
                    ref={scrollRef}
                    sx={{
                        display: 'flex',
                        gap: CARD_GAP,
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        scrollBehavior: 'smooth',
                        py: 1,
                        px: 0.5,
                        scrollbarWidth: 'thin',
                        '& > *': { scrollSnapAlign: 'center', flexShrink: 0 },
                    }}
                    onScroll={updateScrollState}
                >
                    {steps.map((step, i) => {
                        const screenshotPageUrl = i === 0 ? step.pageUrl : steps[i - 1].pageUrl;
                        const screenshotPage = pages.find((p) => normalizePageUrl(p.url) === normalizePageUrl(screenshotPageUrl));
                        const highlightRect = i > 0 && screenshotPage?.pageIndex?.regions
                            ? regionRectForTrigger(screenshotPage.pageIndex.regions, step.triggerLabel)
                            : null;
                        return (
                        <Box
                            key={step.index}
                            data-journey-card
                            onClick={() => {
                                setActiveIndex(i);
                                onStepClick?.(step);
                            }}
                            sx={{
                                minWidth: CARD_MIN_WIDTH,
                                maxWidth: CARD_MIN_WIDTH,
                                scrollSnapAlign: 'center',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: goalReached && i === steps.length - 1 ? 'var(--color-secondary-dx-green)' : 'var(--color-neutral-200, #e0e0e0)',
                                bgcolor: 'var(--color-background-on-light)',
                                p: 2,
                                cursor: onStepClick ? 'pointer' : 'default',
                                transition: 'box-shadow 0.2s, border-color 0.2s',
                                '&:hover': onStepClick ? { boxShadow: 1, borderColor: 'var(--color-theme-accent, #1976d2)' } : {},
                            }}
                        >
                            {screenshotPage && (
                                <Box sx={{ mb: 1.5 }}>
                                    <StepScreenshot
                                        scanId={screenshotPage.id}
                                        highlightRect={highlightRect}
                                        alt={i === 0 ? (step.pageTitle || step.pageUrl) : (t('domainResult.journeySourceOnPage') + ': ' + (step.triggerLabel || ''))}
                                    />
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--color-text-muted-on-light)' }}>
                                    {t('domainResult.journeyStep')} {step.index + 1}
                                </MsqdxTypography>
                                {steps.length > 1 && (
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {i + 1} / {steps.length}
                                    </MsqdxTypography>
                                )}
                            </Box>
                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600, display: 'block', mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.pageUrl}>
                                {step.pageTitle || shortUrl(step.pageUrl)}
                            </MsqdxTypography>

                            {i > 0 && (
                                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid var(--color-neutral-100, #f5f5f5)' }}>
                                    {steps[i - 1]?.backtrackFromReason && (
                                        <MsqdxTypography variant="caption" sx={{ fontStyle: 'italic', color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                                            {t('domainResult.journeyBacktrackPrefix')} {steps[i - 1].backtrackFromReason}
                                        </MsqdxTypography>
                                    )}
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                        {t('domainResult.journeySourceOnPage')}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                        <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                                        <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.triggerLabel ?? ''}>
                                            {step.triggerLabel || t('domainResult.journeySourceLink')}
                                        </MsqdxTypography>
                                    </Box>
                                    {step.navigationReason && (
                                        <MsqdxTypography variant="caption" sx={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }} title={step.navigationReason}>
                                            {step.navigationReason}
                                        </MsqdxTypography>
                                    )}
                                    {(step.regionAboveFold != null || step.regionFindability != null || step.regionSemanticType) ? (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {step.regionSemanticType && regionTypeLabel(step.regionSemanticType, t) && (
                                                <MsqdxChip size="small" label={regionTypeLabel(step.regionSemanticType, t)} sx={{ height: 20, fontSize: '0.65rem' }} variant="outlined" />
                                            )}
                                            {step.regionAboveFold != null && (
                                                <MsqdxChip size="small" label={step.regionAboveFold ? t('domainResult.journeyAboveFold') : t('domainResult.journeyBelowFold')} sx={{ height: 20, fontSize: '0.65rem' }} />
                                            )}
                                            {findabilityLabel(step.regionFindability, t) && (
                                                <MsqdxChip
                                                    size="small"
                                                    label={findabilityLabel(step.regionFindability, t)}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        bgcolor: (step.regionFindability ?? 0) >= 0.7 ? 'var(--color-secondary-dx-green-tint)' : (step.regionFindability ?? 0) >= 0.4 ? 'var(--color-secondary-dx-yellow-tint)' : 'var(--color-secondary-dx-pink-tint)',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    ) : step.triggerLabel ? (
                                        <MsqdxTypography variant="caption" sx={{ fontSize: '0.65rem', fontStyle: 'italic', color: 'var(--color-text-muted-on-light)', mt: 0.5 }}>
                                            {t('domainResult.journeyNoRegionMatch')}
                                        </MsqdxTypography>
                                    ) : null}
                                </Box>
                            )}

                            {streaming && i === steps.length - 1 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: 'var(--color-text-muted-on-light)' }}>
                                    <CircularProgress size={14} sx={{ color: 'var(--color-theme-accent)' }} />
                                    <MsqdxTypography variant="caption">{t('domainResult.journeyStreaming')}</MsqdxTypography>
                                </Box>
                            )}
                        </Box>
                        );
                    })}
                </Box>
                <IconButton
                    size="small"
                    onClick={() => goTo(activeIndex + 1)}
                    disabled={!canScrollRight}
                    sx={{ flexShrink: 0 }}
                    aria-label={t('domainResult.journeyNextStep')}
                >
                    <ChevronRight size={20} />
                </IconButton>
            </Box>

            {steps.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {steps.map((_, i) => (
                        <Box
                            key={i}
                            onClick={() => goTo(i)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goTo(i)}
                            aria-label={`${t('domainResult.journeyStep')} ${i + 1}`}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: i === activeIndex ? 'var(--color-theme-accent)' : 'var(--color-neutral-300, #bdbdbd)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, background-color 0.2s',
                                '&:hover': { bgcolor: i === activeIndex ? 'var(--color-theme-accent)' : 'var(--color-neutral-400)' },
                                '&:focus-visible': { outline: '2px solid var(--color-theme-accent)', outlineOffset: 2 },
                            }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}
