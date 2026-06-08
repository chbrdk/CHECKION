'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box } from '@mui/material';
import { MsqdxButton, MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProjectReport, apiProjectReportRun } from '@/lib/constants';
import type { ProjectReportBundle } from '@/lib/project-report/types';

interface ReportRunListItem {
    id: string;
    status: string;
    locale: string;
    variant: string;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
    hasBundle: boolean;
}

export default function ProjectReportHistoryPage() {
    const params = useParams();
    const projectId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
    const { t, locale } = useI18n();
    const [runs, setRuns] = useState<ReportRunListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pdfExporting, setPdfExporting] = useState<string | null>(null);

    const loadRuns = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await fetch(apiProjectReport(projectId));
            const json = await res.json();
            if (json.success) setRuns(json.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadRuns();
    }, [loadRuns]);

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
            body: JSON.stringify({ locale: locale === 'en' ? 'en' : 'de', variant: 'executive' }),
        });
        if (res.ok) await loadRuns();
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <MsqdxTypography variant="h5">{t('projectReport.historyTitle')}</MsqdxTypography>
                <MsqdxButton variant="contained" onClick={handleCreate}>
                    {t('projectReport.create')}
                </MsqdxButton>
            </Box>
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
                                    {run.status} · {run.variant} · {run.locale}
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
