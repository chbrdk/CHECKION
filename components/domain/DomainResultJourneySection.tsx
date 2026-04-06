'use client';

import React, { memo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxFormField, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { JourneyResult, JourneyStep } from '@/lib/types';
import type { SlimPage } from '@/lib/types';
import { pathDomainSection } from '@/lib/domain-result-sections';
import {
    apiScanDomainJourney,
    API_JOURNEYS,
} from '@/lib/constants';
import { InfoTooltip } from '@/components/InfoTooltip';

const JourneyFlowchart = dynamic(
    () => import('@/components/JourneyFlowchart').then((m) => ({ default: m.JourneyFlowchart })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);

export type DomainResultJourneySectionProps = {
    t: (key: string) => string;
    domainId: string;
    domainLinkQuery: Record<string, string>;
    pages: SlimPage[];
    onOpenPageUrl: (url: string) => void;
    journeyGoal: string;
    setJourneyGoal: React.Dispatch<React.SetStateAction<string>>;
    journeyLoading: boolean;
    setJourneyLoading: React.Dispatch<React.SetStateAction<boolean>>;
    journeyResult: JourneyResult | null;
    setJourneyResult: React.Dispatch<React.SetStateAction<JourneyResult | null>>;
    journeyError: string | null;
    setJourneyError: React.Dispatch<React.SetStateAction<string | null>>;
    journeySaving: boolean;
    setJourneySaving: React.Dispatch<React.SetStateAction<boolean>>;
    journeySaved: boolean;
    setJourneySaved: React.Dispatch<React.SetStateAction<boolean>>;
    journeySaveName: string;
    setJourneySaveName: React.Dispatch<React.SetStateAction<string>>;
};

function DomainResultJourneySectionInner({
    t,
    domainId,
    domainLinkQuery,
    pages,
    onOpenPageUrl,
    journeyGoal,
    setJourneyGoal,
    journeyLoading,
    setJourneyLoading,
    journeyResult,
    setJourneyResult,
    journeyError,
    setJourneyError,
    journeySaving,
    setJourneySaving,
    journeySaved,
    setJourneySaved,
    journeySaveName,
    setJourneySaveName,
}: DomainResultJourneySectionProps) {
    const router = useRouter();
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.journeyTitle')}
            headerActions={<InfoTooltip title={t('domainResult.journeyDescription')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.journeySubtitle')}
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200, maxWidth: 480 }}>
                        <MsqdxFormField
                            label={t('domainResult.journeyGoalLabel')}
                            placeholder={t('domainResult.journeyPlaceholder')}
                            value={journeyGoal}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJourneyGoal(e.target.value)}
                            disabled={journeyLoading}
                        />
                    </Box>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        disabled={journeyLoading || !journeyGoal.trim()}
                        onClick={async () => {
                            if (!domainId || !journeyGoal.trim()) return;
                            setJourneyError(null);
                            setJourneyResult(null);
                            setJourneyLoading(true);
                            try {
                                const res = await fetch(apiScanDomainJourney(domainId), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ goal: journeyGoal.trim(), stream: true }),
                                });
                                if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data.error ?? t('domainResult.journeyError'));
                                }
                                const reader = res.body?.getReader();
                                const decoder = new TextDecoder();
                                if (!reader) {
                                    setJourneyError(t('domainResult.journeyError'));
                                    return;
                                }
                                let buffer = '';
                                const streamedSteps: JourneyStep[] = [];
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split('\n\n');
                                    buffer = lines.pop() ?? '';
                                    for (const line of lines) {
                                        const dataMatch = line.match(/^data:\s*(.+)$/m);
                                        if (!dataMatch) continue;
                                        try {
                                            const event = JSON.parse(dataMatch[1].trim()) as { type: string; step?: JourneyStep; result?: JourneyResult; message?: string };
                                            if (event.type === 'step' && event.step) {
                                                streamedSteps.push(event.step);
                                                setJourneyResult({ steps: [...streamedSteps], goalReached: false });
                                            } else if (event.type === 'done' && event.result) {
                                                setJourneyResult(event.result);
                                            } else if (event.type === 'error' && event.message) {
                                                setJourneyError(event.message);
                                            }
                                        } catch {
                                            /* ignore parse errors for partial chunks */
                                        }
                                    }
                                }
                            } catch (e) {
                                setJourneyError(e instanceof Error ? e.message : t('domainResult.journeyError'));
                            } finally {
                                setJourneyLoading(false);
                            }
                        }}
                    >
                        {journeyLoading ? t('domainResult.journeyLoading') : t('domainResult.journeyButton')}
                    </MsqdxButton>
                </Box>
                {journeyError && (
                    <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{journeyError}</MsqdxTypography>
                )}
                {journeyResult && (
                    <>
                        <JourneyFlowchart
                            steps={journeyResult.steps}
                            goalReached={journeyResult.goalReached}
                            message={journeyResult.message}
                            streaming={journeyLoading}
                            t={t}
                            pages={pages}
                            onStepClick={(step) => onOpenPageUrl(step.pageUrl)}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', pt: 1 }}>
                            <Box sx={{ minWidth: 200, maxWidth: 320 }}>
                                <MsqdxFormField
                                    label={t('domainResult.journeySaveNameLabel')}
                                    placeholder={t('domainResult.journeySaveNamePlaceholder')}
                                    value={journeySaveName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJourneySaveName(e.target.value)}
                                    disabled={journeySaving}
                                />
                            </Box>
                            <MsqdxButton
                                variant="outlined"
                                disabled={journeySaving || journeySaved}
                                onClick={async () => {
                                    if (!domainId || !journeyResult) return;
                                    setJourneySaving(true);
                                    try {
                                        const res = await fetch(API_JOURNEYS, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                domainScanId: domainId,
                                                goal: journeyGoal,
                                                result: journeyResult,
                                                name: journeySaveName.trim() || undefined,
                                            }),
                                        });
                                        if (!res.ok) throw new Error('Save failed');
                                        const data = await res.json().catch(() => ({}));
                                        setJourneySaved(true);
                                        if (data?.id && domainId) {
                                            router.replace(
                                                pathDomainSection(domainId, 'journey', {
                                                    ...domainLinkQuery,
                                                    restoreJourney: String(data.id),
                                                }),
                                                { scroll: false }
                                            );
                                        }
                                    } catch {
                                        setJourneyError(t('domainResult.journeySaveError'));
                                    } finally {
                                        setJourneySaving(false);
                                    }
                                }}
                            >
                                {journeySaving ? t('domainResult.journeySaving') : journeySaved ? t('domainResult.journeySaved') : t('domainResult.journeySave')}
                            </MsqdxButton>
                        </Box>
                    </>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultJourneySection = memo(DomainResultJourneySectionInner);
