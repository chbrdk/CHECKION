'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, LinearProgress, MenuItem, TextField } from '@mui/material';
import { MsqdxButton, MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProjectReport, apiProjectReportRun, apiProjectReportLatest } from '@/lib/constants';
import type { ProjectReportBundle, ProjectReportVariant } from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';
import { downloadProjectReportPdf } from '@/lib/project-report/export-project-report-pdf';
import { downloadProjectReportPptx } from '@/lib/project-report/export-project-report-pptx';
import {
    formatProgressDuration,
    isAgentProgressStage,
    secondsSinceProgressUpdate,
    shouldShowAgentStillRunningHint,
} from '@/lib/project-report/progress-ui';

type ReportStatus = 'idle' | 'queued' | 'running' | 'complete' | 'error';

interface StoredReportMeta {
    id: string;
    completedAt: string | null;
    variant: string;
    bundle: ProjectReportBundle;
}

export function ProjectReportExport({ projectId }: { projectId: string }) {
    const { t, locale } = useI18n();
    const [status, setStatus] = useState<ReportStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<ProjectReportBundle | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [pdfExporting, setPdfExporting] = useState(false);
    const [pptxExporting, setPptxExporting] = useState(false);
    const [variant, setVariant] = useState<ProjectReportVariant>('executive');
    const [progress, setProgress] = useState<ReportProgress | null>(null);
    const [storedReport, setStoredReport] = useState<StoredReportMeta | null>(null);
    const [storedLoading, setStoredLoading] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const runIdRef = useRef<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    useEffect(() => () => stopPolling(), [stopPolling]);

    const loadStoredReport = useCallback(async () => {
        if (!projectId) return;
        setStoredLoading(true);
        try {
            const res = await fetch(apiProjectReportLatest(projectId));
            const json = await res.json();
            if (json.success && json.data?.bundle) {
                setStoredReport(json.data as StoredReportMeta);
            } else {
                setStoredReport(null);
            }
        } finally {
            setStoredLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadStoredReport();
    }, [loadStoredReport]);

    const isLoading = status === 'queued' || status === 'running';
    const stepSeconds = secondsSinceProgressUpdate(progress, nowMs);
    const showAgentHint =
        variant === 'comprehensive' && isLoading && isAgentProgressStage(progress?.stage);
    const showStillRunning = shouldShowAgentStillRunningHint(progress, nowMs);

    useEffect(() => {
        if (!isLoading) return;
        const tick = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(tick);
    }, [isLoading]);

    const pollRun = useCallback(
        (runId: string) => {
            stopPolling();
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch(apiProjectReportRun(projectId, runId));
                    const json = await res.json();
                    if (!json.success) {
                        setStatus('error');
                        setError(json.error ?? 'Poll failed');
                        stopPolling();
                        return;
                    }
                    const data = json.data;
                    setStatus(data.status);
                    if (data.progress) setProgress(data.progress);
                    if (data.status === 'complete') {
                        setBundle(data.bundle);
                        setPreviewOpen(true);
                        void loadStoredReport();
                        stopPolling();
                    } else if (data.status === 'error') {
                        setError(data.error ?? 'Report generation failed');
                        stopPolling();
                    }
                } catch (e) {
                    setStatus('error');
                    setError(e instanceof Error ? e.message : 'Poll failed');
                    stopPolling();
                }
            }, 2000);
        },
        [projectId, stopPolling, loadStoredReport]
    );

    const handleCreateReport = async () => {
        setError(null);
        setStatus('queued');
        setBundle(null);
        setProgress(null);
        try {
            const res = await fetch(apiProjectReport(projectId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locale: locale === 'en' ? 'en' : 'de',
                    variant,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                setStatus('error');
                setError(json.error ?? 'Failed to start report');
                return;
            }
            runIdRef.current = json.data.runId;
            setStatus(json.data.status);
            pollRun(json.data.runId);
        } catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Failed to start report');
        }
    };

    const handlePdfDownload = async (sourceBundle?: ProjectReportBundle) => {
        const target = sourceBundle ?? bundle;
        if (!target) return;
        setPdfExporting(true);
        try {
            await downloadProjectReportPdf(target);
        } catch (e) {
            console.error('[CHECKION] project report PDF export', e);
            setError(e instanceof Error ? e.message : 'PDF export failed');
        } finally {
            setPdfExporting(false);
        }
    };

    const handlePptxDownload = async () => {
        if (!projectId) return;
        setPptxExporting(true);
        try {
            await downloadProjectReportPptx(projectId);
        } catch (e) {
            console.error('[CHECKION] project report PPTX export', e);
            setError(e instanceof Error ? e.message : 'PPTX export failed');
        } finally {
            setPptxExporting(false);
        }
    };

    return (
        <>
            <MsqdxMoleculeCard sx={{ p: 2 }}>
                <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1 }}>
                    {t('projectReport.title')}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {variant === 'comprehensive'
                        ? t('projectReport.comprehensiveDescription')
                        : t('projectReport.description')}
                </MsqdxTypography>
                <TextField
                    select
                    size="small"
                    label={t('projectReport.variantLabel')}
                    value={variant}
                    onChange={(e) => setVariant(e.target.value as ProjectReportVariant)}
                    disabled={isLoading}
                    sx={{ mb: 2, minWidth: 260 }}
                >
                    <MenuItem value="executive">{t('projectReport.variantExecutive')}</MenuItem>
                    <MenuItem value="comprehensive">{t('projectReport.variantComprehensive')}</MenuItem>
                </TextField>
                {isLoading ? (
                    <>
                        <LinearProgress
                            variant={progress?.percent != null ? 'determinate' : 'indeterminate'}
                            value={progress?.percent ?? 0}
                            sx={{ mb: 1 }}
                        />
                        {progress?.label ? (
                            <MsqdxTypography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('projectReport.progressLabel')}: {progress.label}
                                {progress.percent != null ? ` (${progress.percent}%)` : ''}
                            </MsqdxTypography>
                        ) : null}
                        {isLoading ? (
                            <MsqdxTypography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('projectReport.stillPolling')}
                            </MsqdxTypography>
                        ) : null}
                        {showAgentHint && stepSeconds > 0 ? (
                            <MsqdxTypography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('projectReport.stepDuration')}: {formatProgressDuration(stepSeconds)}
                            </MsqdxTypography>
                        ) : null}
                        {showAgentHint ? (
                            <MsqdxTypography variant="caption" color="text.secondary" sx={{ mb: showStillRunning ? 0.5 : 2, display: 'block' }}>
                                {t('projectReport.agentStepHint')}
                            </MsqdxTypography>
                        ) : null}
                        {showStillRunning ? (
                            <MsqdxTypography variant="caption" color="warning.main" sx={{ mb: 2, display: 'block' }}>
                                {t('projectReport.agentStillRunning')}
                            </MsqdxTypography>
                        ) : null}
                        {!showAgentHint && isLoading ? <Box sx={{ mb: 2 }} /> : null}
                    </>
                ) : null}
                {error ? (
                    <MsqdxTypography variant="body2" color="error" sx={{ mb: 1 }}>
                        {error}
                    </MsqdxTypography>
                ) : null}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <MsqdxButton
                        variant="contained"
                        onClick={handleCreateReport}
                        disabled={isLoading}
                    >
                        {isLoading ? t('projectReport.generating') : t('projectReport.create')}
                    </MsqdxButton>
                    {bundle ? (
                        <MsqdxButton variant="outlined" onClick={() => setPreviewOpen(true)}>
                            {t('projectReport.preview')}
                        </MsqdxButton>
                    ) : null}
                </Box>
                {bundle?.freshness?.sources?.length ? (
                    <MsqdxTypography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('projectReport.freshnessHint')}
                    </MsqdxTypography>
                ) : null}
            </MsqdxMoleculeCard>

            {!storedLoading && storedReport ? (
                <MsqdxMoleculeCard sx={{ p: 2, mt: 2 }}>
                    <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                        {t('projectReport.reexportPdfTitle')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('projectReport.reexportPdfDescription')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {t('projectReport.reexportPptxDescription')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {t('projectReport.lastReportAt', {
                            date: new Date(
                                storedReport.completedAt ?? storedReport.bundle.generatedAt
                            ).toLocaleString(),
                        })}{' '}
                        · {storedReport.variant}
                    </MsqdxTypography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <MsqdxButton
                            variant="outlined"
                            loading={pdfExporting}
                            onClick={() => void handlePdfDownload(storedReport.bundle)}
                        >
                            {pdfExporting ? t('projectReport.pdfExporting') : t('projectReport.reexportPdf')}
                        </MsqdxButton>
                        <MsqdxButton
                            variant="outlined"
                            loading={pptxExporting}
                            onClick={() => void handlePptxDownload()}
                        >
                            {pptxExporting ? t('projectReport.pptxExporting') : t('projectReport.reexportPptx')}
                        </MsqdxButton>
                    </Box>
                </MsqdxMoleculeCard>
            ) : null}

            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('projectReport.previewTitle')}</DialogTitle>
                <DialogContent>
                    {bundle ? (
                        <>
                            {bundle.narrative?.executiveSummary ? (
                                <MsqdxTypography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                    {bundle.narrative.executiveSummary.slice(0, 600)}
                                    {bundle.narrative.executiveSummary.length > 600 ? '…' : ''}
                                </MsqdxTypography>
                            ) : null}
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                {[
                                    { label: t('domainResult.domainScore'), value: bundle.domain?.score },
                                    { label: 'SEO', value: bundle.domain?.seoOnPageScore },
                                    { label: 'GEO', value: bundle.geo?.score },
                                    { label: 'Rank', value: bundle.rankings?.score },
                                ].map((kpi) => (
                                    <Box key={kpi.label}>
                                        <MsqdxTypography variant="caption" color="text.secondary">
                                            {kpi.label}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="h6">
                                            {kpi.value != null ? kpi.value : '–'}
                                        </MsqdxTypography>
                                    </Box>
                                ))}
                            </Box>
                            <MsqdxButton
                                variant="contained"
                                onClick={() => void handlePdfDownload()}
                                disabled={pdfExporting}
                            >
                                {pdfExporting ? t('projectReport.pdfExporting') : t('projectReport.downloadPdf')}
                            </MsqdxButton>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}
