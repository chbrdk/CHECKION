'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Box, CircularProgress, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxCard, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PDF_LOGO_PATH } from '@/lib/constants';
import type { UxJourneyAgentStep } from '@/lib/types';

/** Number of step cards visible at once: 1 on mobile, 2 on desktop. */
const STEP_CARDS_DESKTOP = 2;
const STEP_CARDS_MOBILE = 1;

/**
 * Parses agent result string with key='value' pairs (e.g. thinking='...', memory='...', next_goal='...').
 * Values can be multiline and may contain single quotes; we detect value end by the pattern ' followed by optional whitespace and next key='.
 */
function parseStepResult(raw: string): Array<{ key: string; value: string }> {
    if (!raw?.trim()) return [];
    const pairs: Array<{ key: string; value: string }> = [];
    const keyValueRe = /(\w+)='/g;
    let match: RegExpExecArray | null;
    while ((match = keyValueRe.exec(raw)) !== null) {
        const key = match[1];
        const valueStart = match.index + match[0].length;
        const rest = raw.slice(valueStart);
        // Value ends at a quote that is followed by optional whitespace and then the next key='
        const closingMatch = rest.match(/'(\s*\w+=)/);
        const valueLength = closingMatch ? closingMatch.index! : rest.length;
        const value = rest.slice(0, valueLength).trim();
        if (value) pairs.push({ key, value });
    }
    return pairs;
}

const RESULT_SECTION_LABELS: Record<string, string> = {
    thinking: 'Thinking',
    memory: 'Memory',
    next_goal: 'Next step',
    nextstep: 'Next step',
    evaluation_previous_goal: 'Previous goal evaluation',
    goal: 'Goal',
    evaluation: 'Evaluation',
};

function labelForResultKey(key: string): string {
    return RESULT_SECTION_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Renders parsed result sections (thinking, memory, next_goal, etc.) as small labeled blocks. */
function StepResultSections({ resultText }: { resultText: string }) {
    const sections = useMemo(() => parseStepResult(resultText), [resultText]);
    if (sections.length === 0) {
        return (
            <MsqdxTypography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-muted-on-light)' }}
            >
                {resultText.length > 500 ? resultText.slice(0, 500) + '…' : resultText}
            </MsqdxTypography>
        );
    }
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-sm)' }}>
            {sections.map(({ key, value }) => (
                <Box
                    key={key}
                    sx={{
                        p: 'var(--msqdx-spacing-sm)',
                        borderRadius: 'var(--msqdx-radius-sm)',
                        bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                        borderLeft: '3px solid',
                        borderColor: 'var(--color-theme-accent)',
                    }}
                >
                    <MsqdxTypography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            display: 'block',
                            mb: 'var(--msqdx-spacing-xxs)',
                            color: 'var(--color-text-on-light)',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {labelForResultKey(key)}
                    </MsqdxTypography>
                    <MsqdxTypography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-muted-on-light)' }}
                    >
                        {value.length > 800 ? value.slice(0, 800) + '…' : value}
                    </MsqdxTypography>
                </Box>
            ))}
        </Box>
    );
}

type Status = 'idle' | 'loading' | 'running' | 'complete' | 'error' | 'unavailable';

const INTRO_OVERLAY_DURATION_SEC = 2;
const VIDEO_MAX_WIDTH = 960;

/** Video player with MSQDX logomark overlay at the start (floating) instead of the default placeholder. */
function JourneyVideoWithIntroLogo({ videoUrl }: { videoUrl: string }) {
    const [showIntroOverlay, setShowIntroOverlay] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onTimeUpdate = () => setShowIntroOverlay(video.currentTime < INTRO_OVERLAY_DURATION_SEC);
        video.addEventListener('timeupdate', onTimeUpdate);
        return () => video.removeEventListener('timeupdate', onTimeUpdate);
    }, []);

    return (
        <Box sx={{ mt: 'var(--msqdx-spacing-md)', mb: 'var(--msqdx-spacing-md)' }}>
            <MsqdxTypography variant="subtitle2" sx={{ mb: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-on-light)' }}>
                Aufzeichnung
            </MsqdxTypography>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: VIDEO_MAX_WIDTH,
                    borderRadius: 'var(--msqdx-radius-sm)',
                    bgcolor: '#000',
                    overflow: 'hidden',
                }}
            >
                <Box
                    component="video"
                    ref={videoRef}
                    controls
                    playsInline
                    sx={{ width: '100%', display: 'block', verticalAlign: 'middle' }}
                    src={videoUrl}
                >
                    Your browser does not support the video tag.
                </Box>
                {showIntroOverlay && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#000',
                            pointerEvents: 'none',
                        }}
                    >
                        <Box
                            component="img"
                            src={PDF_LOGO_PATH}
                            alt="MSQDX"
                            sx={{
                                width: 120,
                                height: 'auto',
                                filter: 'invert(1) brightness(1.1)',
                                opacity: 0.9,
                                animation: 'journey-video-float 2.5s ease-in-out infinite',
                            }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}

/** Renders reasoning text with paragraphs, numbered and bullet lists for a readable layout. */
function ReasoningBlock({ text }: { text: string }) {
    const blocks = text.split(/\n\s*\n/).filter(Boolean);
    return (
        <Box component="div" sx={{ '& > * + *': { mt: 1 } }}>
            {blocks.map((block, idx) => {
                const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
                const isNumberedList = lines.length > 0 && /^\d+\.\s/.test(lines[0]);
                const isBulletList = lines.length > 0 && /^[-*•]\s/.test(lines[0]);
                if (isNumberedList || isBulletList) {
                    return (
                        <Box component="ul" key={idx} sx={{ m: 0, pl: 2.5, py: 0 }}>
                            {lines.map((line, i) => (
                                <MsqdxTypography key={i} variant="body2" component="li" sx={{ mb: 0.25, color: 'var(--color-text-muted-on-light)' }}>
                                    {line.replace(/^(\d+\.|[-*•])\s*/, '')}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    );
                }
                return (
                    <MsqdxTypography key={idx} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-muted-on-light)' }}>
                        {lines.join('\n')}
                    </MsqdxTypography>
                );
            })}
        </Box>
    );
}

function actionLabel(action: string): string {
    if (action === 'navigate') return 'Seite';
    if (action === 'click') return 'Klick';
    if (action === 'done') return 'Abgeschlossen';
    return action;
}

/** Single step card: action chip, target, reasoning, parsed result sections. */
function StepCard({
    step,
    stepNumber,
    totalSteps,
    t,
}: {
    step: UxJourneyAgentStep;
    stepNumber: number;
    totalSteps: number;
    t: (key: string) => string;
}) {
    return (
        <Box
            sx={{
                p: 'var(--msqdx-spacing-md)',
                borderRadius: 'var(--msqdx-radius-sm)',
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                bgcolor: 'var(--color-card-bg)',
                flex: '1 1 0',
                minWidth: { xs: '100%', md: 260 },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', flexWrap: 'wrap', mb: 'var(--msqdx-spacing-xs)' }}>
                <MsqdxChip
                    size="small"
                    label={actionLabel(step.action)}
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        ...(step.action === 'done'
                            ? { bgcolor: `${MSQDX_STATUS.success.base}20`, color: MSQDX_STATUS.success.base }
                            : step.action === 'navigate'
                              ? { bgcolor: `${MSQDX_STATUS.info.base}20`, color: MSQDX_STATUS.info.base }
                              : { bgcolor: `${MSQDX_BRAND_PRIMARY.green}20`, color: MSQDX_BRAND_PRIMARY.green }),
                    }}
                />
                {totalSteps > 1 && (
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        Schritt {stepNumber} / {totalSteps}
                    </MsqdxTypography>
                )}
            </Box>
            <MsqdxTypography variant="body2" sx={{ fontWeight: 500, color: 'var(--color-text-on-light)', mb: 'var(--msqdx-spacing-xs)' }}>
                {step.target && step.target !== '—' ? (step.target.length > 120 ? step.target.slice(0, 120) + '…' : step.target) : null}
            </MsqdxTypography>
            {step.reasoning && (
                <Box
                    sx={{
                        mb: 'var(--msqdx-spacing-sm)',
                        p: 'var(--msqdx-spacing-sm)',
                        borderRadius: 'var(--msqdx-radius-sm)',
                        bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                        borderLeft: '4px solid',
                        borderColor: 'var(--color-theme-accent)',
                    }}
                >
                    <MsqdxTypography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            display: 'block',
                            mb: 'var(--msqdx-spacing-xxs)',
                            color: 'var(--color-text-on-light)',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {t('scan.journeyReasoning')}
                    </MsqdxTypography>
                    <ReasoningBlock text={step.reasoning} />
                </Box>
            )}
            {step.result && (
                <Box sx={{ mt: 'var(--msqdx-spacing-xs)' }}>
                    <StepResultSections resultText={step.result} />
                </Box>
            )}
        </Box>
    );
}

export default function JourneyAgentStatusPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
    const jobId = params.jobId as string;

    const [status, setStatus] = useState<Status>('loading');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        steps?: UxJourneyAgentStep[];
        success?: boolean;
        taskDescription?: string;
        siteDomain?: string;
        videoUrl?: string;
    } | null>(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    const steps = result?.steps ?? [];
    const cardsVisible = isDesktop ? STEP_CARDS_DESKTOP : STEP_CARDS_MOBILE;
    const visibleSteps = useMemo(
        () => steps.slice(activeStepIndex, activeStepIndex + cardsVisible),
        [steps, activeStepIndex, cardsVisible]
    );

    const goToPrev = useCallback(() => {
        setActiveStepIndex((i) => Math.max(0, i - 1));
    }, []);
    const goToNext = useCallback(() => {
        setActiveStepIndex((i) => Math.min(steps.length - 1, i + 1));
    }, [steps.length]);
    const goTo = useCallback((index: number) => {
        setActiveStepIndex((_) => Math.max(0, Math.min(index, steps.length - 1)));
    }, [steps.length]);

    useEffect(() => {
        if (!jobId) return;

        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(`/api/scan/journey-agent/${encodeURIComponent(jobId)}`);
                const data = await res.json();
                if (cancelled) return;

                if (res.status === 501) {
                    setStatus('unavailable');
                    setError(data.error || null);
                    return;
                }
                if (!res.ok) {
                    setStatus('error');
                    setError(data.error || 'Unknown error');
                    return;
                }

                const st = data.status as string;
                if (st === 'complete' || data.result) {
                    setStatus('complete');
                    setResult(data.result || data);
                } else if (st === 'error') {
                    setStatus('error');
                    setError(data.error || 'Journey failed');
                } else {
                    setStatus('running');
                    setTimeout(poll, 2000);
                }
            } catch (e) {
                if (!cancelled) {
                    setStatus('error');
                    setError(e instanceof Error ? e.message : 'Network error');
                }
            }
        };

        poll();
        return () => {
            cancelled = true;
        };
    }, [jobId]);

    useEffect(() => {
        if (result?.steps?.length) setActiveStepIndex(0);
    }, [result?.steps?.length]);

    if (!jobId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 800, mx: 'auto' }}>
                <MsqdxTypography variant="body1" sx={{ color: 'var(--color-text-on-light)' }}>
                    {t('results.errorNotFound')}
                </MsqdxTypography>
            </Box>
        );
    }

    const canGoPrev = steps.length > 0 && activeStepIndex > 0;
    const canGoNext = steps.length > 0 && activeStepIndex < steps.length - 1;
    const stepRangeLabel =
        steps.length > 1
            ? cardsVisible > 1 && visibleSteps.length > 1
                ? `${activeStepIndex + 1}–${activeStepIndex + visibleSteps.length} / ${steps.length}`
                : `${activeStepIndex + 1} / ${steps.length}`
            : null;

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: VIDEO_MAX_WIDTH + 48, mx: 'auto' }}>
            <MsqdxTypography variant="h5" sx={{ fontWeight: 600, mb: 'var(--msqdx-spacing-md)', color: 'var(--color-text-on-light)' }}>
                {t('scan.journeyTab')} – {jobId.slice(0, 8)}…
            </MsqdxTypography>

            {status === 'loading' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                    <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
                        Loading…
                    </MsqdxTypography>
                </Box>
            )}

            {status === 'running' && (
                <Box sx={{ py: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 'var(--msqdx-spacing-md)' }}>
                        <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
                            {t('scan.journeyStatusRunning')}
                        </MsqdxTypography>
                    </Box>
                    <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxTypography variant="subtitle2" sx={{ mb: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-on-light)' }}>
                            Live-Ansicht
                        </MsqdxTypography>
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: VIDEO_MAX_WIDTH,
                                borderRadius: 'var(--msqdx-radius-sm)',
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'var(--color-secondary-dx-grey-light-tint)',
                                bgcolor: 'var(--color-card-bg)',
                                minHeight: 200,
                            }}
                        >
                            <Box
                                component="img"
                                src={`/api/scan/journey-agent/${encodeURIComponent(jobId)}/live/stream`}
                                alt="Agent-Browser Live-Ansicht"
                                sx={{ display: 'block', width: '100%', height: 'auto', verticalAlign: 'top' }}
                            />
                        </Box>
                    </Box>
                </Box>
            )}

            {status === 'unavailable' && (
                <MsqdxCard
                    variant="flat"
                    sx={{
                        p: 'var(--msqdx-spacing-md)',
                        mb: 'var(--msqdx-spacing-md)',
                        bgcolor: 'var(--color-card-bg)',
                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                        borderRadius: 'var(--msqdx-radius-sm)',
                    }}
                >
                    <MsqdxTypography variant="body2" sx={{ mb: 1, color: 'var(--color-text-on-light)' }}>
                        {error || t('scan.journeyNotConfigured')}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'error' && (
                <MsqdxCard
                    variant="flat"
                    sx={{
                        p: 'var(--msqdx-spacing-md)',
                        mb: 'var(--msqdx-spacing-md)',
                        bgcolor: 'var(--color-card-bg)',
                        border: '1px solid',
                        borderColor: MSQDX_STATUS.error.base,
                        borderRadius: 'var(--msqdx-radius-sm)',
                    }}
                >
                    <MsqdxTypography variant="body2" sx={{ mb: 1, color: MSQDX_STATUS.error.base }}>
                        {error}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'complete' && result && (
                <>
                    <MsqdxMoleculeCard
                        variant="flat"
                        borderRadius="lg"
                        sx={{
                            bgcolor: 'var(--color-card-bg)',
                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            mb: 'var(--msqdx-spacing-md)',
                        }}
                        title={result.success ? t('scan.journeyStatusComplete') : t('scan.journeyStatusFinished')}
                        subtitle={
                            [result.taskDescription && `${t('scan.journeyTaskLabel')}: ${result.taskDescription}`, result.siteDomain && `Site: ${result.siteDomain}`]
                                .filter(Boolean)
                                .join(' · ') || undefined
                        }
                        actions={
                            <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                                {t('scan.journeyNewJourney')}
                            </MsqdxButton>
                        }
                    />

                    {result.videoUrl && (
                        <JourneyVideoWithIntroLogo videoUrl={result.videoUrl} />
                    )}

                    {steps.length > 0 && (
                        <MsqdxMoleculeCard
                            variant="flat"
                            borderRadius="lg"
                            sx={{
                                bgcolor: 'var(--color-card-bg)',
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                color: 'var(--color-text-on-light)',
                            }}
                            title={`${t('scan.journeyStepsTitle')} (${steps.length})`}
                            headerActions={
                                stepRangeLabel ? (
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {stepRangeLabel}
                                    </MsqdxTypography>
                                ) : undefined
                            }
                        >
                            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 'var(--msqdx-spacing-sm)' }}>
                                <IconButton
                                    size="small"
                                    onClick={goToPrev}
                                    disabled={!canGoPrev}
                                    sx={{ flexShrink: 0, alignSelf: 'center', color: 'var(--color-text-on-light)' }}
                                    aria-label={t('domainResult.journeyPrevStep')}
                                >
                                    <ChevronLeft size={24} />
                                </IconButton>
                                <Box
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: 'var(--msqdx-spacing-md)',
                                        overflow: 'auto',
                                    }}
                                >
                                    {visibleSteps.map((step, i) => (
                                        <StepCard
                                            key={activeStepIndex + i}
                                            step={step}
                                            stepNumber={activeStepIndex + i + 1}
                                            totalSteps={steps.length}
                                            t={t}
                                        />
                                    ))}
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={goToNext}
                                    disabled={!canGoNext}
                                    sx={{ flexShrink: 0, alignSelf: 'center', color: 'var(--color-text-on-light)' }}
                                    aria-label={t('domainResult.journeyNextStep')}
                                >
                                    <ChevronRight size={24} />
                                </IconButton>
                            </Box>
                            {steps.length > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap', mt: 'var(--msqdx-spacing-sm)' }}>
                                    {steps.map((_, i) => (
                                        <Box
                                            key={i}
                                            onClick={() => goTo(i)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goTo(i)}
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: i === activeStepIndex ? 'var(--color-theme-accent)' : 'var(--color-secondary-dx-grey-light-tint)',
                                                cursor: 'pointer',
                                            }}
                                            aria-label={`Schritt ${i + 1}`}
                                        />
                                    ))}
                                </Box>
                            )}
                        </MsqdxMoleculeCard>
                    )}

                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')} sx={{ mt: 'var(--msqdx-spacing-md)' }}>
                        {t('scan.journeyNewJourney')}
                    </MsqdxButton>
                </>
            )}

            <MsqdxButton variant="text" size="small" onClick={() => router.push('/')} sx={{ mt: 'var(--msqdx-spacing-md)', color: 'var(--color-text-on-light)' }}>
                {t('results.dashboard')}
            </MsqdxButton>
        </Box>
    );
}
