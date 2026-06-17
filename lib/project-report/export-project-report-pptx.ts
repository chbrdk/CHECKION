'use client';

import { apiProjectReportLatestPptx } from '@/lib/constants';

/**
 * Download PPTX for the latest stored project report (server-rendered, no LLM).
 */
export async function downloadProjectReportPptx(projectId: string): Promise<void> {
    const res = await fetch(apiProjectReportLatestPptx(projectId));
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const code = typeof json.error === 'string' ? json.error : 'pptx_export_failed';
        throw new Error(code);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `checkion-report-${new Date().toISOString().slice(0, 10)}.pptx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
