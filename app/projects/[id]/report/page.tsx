'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, LinearProgress, MenuItem, TextField } from '@mui/material';
import { MsqdxButton, MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProjectReport, apiProjectReportRun } from '@/lib/constants';
import type { ProjectReportBundle, ProjectReportVariant } from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';

interface ReportRunListItem {
    id: string;
    status: string;
    locale: string;
    variant: string;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
    hasBundle: boolean;
    progress: ReportProgress | null;
}

function statusLabel(status: string, t: (key: string) => string): string {
    switch (status) {
        case 'queued':
            return t('projectReport.statusQueued');
        case 'running':
            return t('projectReport.statusRunning');
        case 'complete':
            return t('projectReport.statusComplete');
        case 'error':
            return t('projectReport.statusError');
        default:
            return status;
    }
}

export default function ProjectReportHistoryPage() {
    const params = useParams();
    const projectId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
    const { t, locale } = useI18n();
    const [runs, setRuns] = useState<ReportRunListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pdfExporting, setPdfExporting] = useState<string | null>(null);
    const [variant, setVariant] = useState<ProjectReportVariant>('executive');

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadRuns = useCallback(async (options?: { silent?: boolean }) => {
        if (!projectId) return;
        if (!options?.silent) setLoading(true);
        try {
            const res = await fetch(apiProjectReport(projectId));
            const json = await res.json();
            if (json.success) setRuns(json.data ?? []);
        } finally {
            if (!options?.silent) setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadRuns();
    }, [loadRuns]);

    const hasInFlight = runs.some((r) => r.status === 'queued' || r.status === 'running');

    useEffect(() => {
        if (!hasInFlight) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }
        if (pollRef.current) return;
        pollRef.current = setInterval(() => {
            void loadRuns({ silent: true });
        }, 2000);
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [hasInFlight, loadRuns]);

    const downloadPdf = async (runId: string) => {
        setPdfExporting(runId);
        try {
            const res = await fetch(apiProjectReportRun(projectId, runId));
            const json = await res.json();
            if (!json.success || !json.data?.bundle) return;
            const bundle = json.data.bundle as ProjectReportBundle;
            const [{ pdf }, { ProjectReportDocument }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('@/components/pdf/ProjectReportDocument'),
            ]);
            const blob = await pdf(<ProjectReportDocument bundle={bundle} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checkion-project-report-${runId.slice(0, 8)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setPdfExporting(null);
        }
    };

    const handleCreate = async () => {
        const res = await fetch(apiProjectReport(projectId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: locale === 'en' ? 'en' : 'de', variant }),
        });
        if (res.ok) await loadRuns();
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <MsqdxTypography variant="h5">{t('projectReport.historyTitle')}</MsqdxTypography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        select
                        size="small"
                        label={t('projectReport.variantLabel')}
                        value={variant}
                        onChange={(e) => setVariant(e.target.value as ProjectReportVariant)}
                        sx={{ minWidth: 220 }}
                    >
                        <MenuItem value="executive">{t('projectReport.variantExecutive')}</MenuItem>
                        <MenuItem value="comprehensive">{t('projectReport.variantComprehensive')}</MenuItem>
                    </TextField>
                    <MsqdxButton variant="contained" onClick={handleCreate}>
                        {t('projectReport.create')}
                    </MsqdxButton>
                </Box>
            </Box>
            {hasInFlight ? (
                <>
                    {(() => {
                        const active = runs.find((r) => r.status === 'queued' || r.status === 'running');
                        const pct = active?.progress?.percent;
                        return (
                            <LinearProgress
                                variant={pct != null ? 'determinate' : 'indeterminate'}
                                value={pct ?? 0}
                                sx={{ mb: 1 }}
                                aria-label={t('projectReport.generating')}
                            />
                        );
                    })()}
                    <MsqdxTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        {runs.find((r) => r.status === 'running')?.progress?.label ?? t('projectReport.pollingHint')}
                    </MsqdxTypography>
                </>
            ) : null}
            {loading ? (
                <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
            ) : runs.length === 0 ? (
                <MsqdxTypography variant="body2">{t('projectReport.historyEmpty')}</MsqdxTypography>
            ) : (
                runs.map((run) => (
                    <MsqdxMoleculeCard key={run.id} sx={{ mb: 1, p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                                <MsqdxTypography variant="subtitle2">
                                    {new Date(run.createdAt).toLocaleString()}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="text.secondary">
                                    {statusLabel(run.status, t)} · {run.variant} · {run.locale}
                                    {run.progress?.label && (run.status === 'queued' || run.status === 'running')
                                        ? ` · ${run.progress.label} (${run.progress.percent}%)`
                                        : ''}
                                </MsqdxTypography>
                                {run.error ? (
                                    <MsqdxTypography variant="caption" color="error">
                                        {run.error}
                                    </MsqdxTypography>
                                ) : null}
                            </Box>
                            {run.status === 'complete' && run.hasBundle ? (
                                <MsqdxButton
                                    size="small"
                                    variant="outlined"
                                    loading={pdfExporting === run.id}
                                    onClick={() => downloadPdf(run.id)}
                                >
                                    {t('projectReport.downloadPdf')}
                                </MsqdxButton>
                            ) : null}
                        </Box>
                    </MsqdxMoleculeCard>
                ))
            )}
        </Box>
    );
}
