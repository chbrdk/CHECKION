'use client';

import type { ProjectReportBundle } from '@/lib/project-report/types';

/**
 * Renders a stored project report bundle to PDF (client-side, no LLM).
 */
export async function downloadProjectReportPdf(bundle: ProjectReportBundle): Promise<void> {
    const [{ pdf }, { ProjectReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/ProjectReportDocument'),
    ]);
    const blob = await pdf(<ProjectReportDocument bundle={bundle} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = bundle.project.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    a.href = url;
    a.download = `checkion-project-report-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
}
