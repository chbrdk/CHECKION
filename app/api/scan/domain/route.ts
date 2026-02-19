import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runDomainScan } from '@/lib/spider';
import { createDomainScan, updateDomainScan, getDomainScan, addScan } from '@/lib/db/scans';
import { invalidateDomainScan, invalidateDomainList } from '@/lib/cache';
import { v4 as uuidv4 } from 'uuid';
import type { DomainScanResult, ScanResult } from '@/lib/types';

const SLIM_LINKS_WITH_LABELS_CAP = 100;

/** Strip heavy fields from each page so the domain payload stays within JSON/DB limits. Keeps allLinksWithLabels for journey; caps per page for large domains. */
function slimPagesForPayload(pages: ScanResult[]): ScanResult[] {
    return pages.map(({ screenshot, saliencyHeatmap, allLinksWithLabels, ...rest }) => ({
        ...rest,
        screenshot: '',
        saliencyHeatmap: undefined,
        allLinksWithLabels: allLinksWithLabels?.slice(0, SLIM_LINKS_WITH_LABELS_CAP),
    }));
}

export const maxDuration = 10;

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    let url: string;
    let useSitemap = true;
    let maxPages: number | undefined;
    try {
        const body = await req.json();
        url = body.url;
        if (typeof body.useSitemap === 'boolean') useSitemap = body.useSitemap;
        if (typeof body.maxPages === 'number' && body.maxPages >= 1) maxPages = body.maxPages;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const id = uuidv4();
    const initial: DomainScanResult = {
        id,
        domain: url,
        timestamp: new Date().toISOString(),
        status: 'queued',
        progress: { scanned: 0, total: 0 },
        totalPages: 0,
        score: 0,
        pages: [],
        graph: { nodes: [], links: [] },
        systemicIssues: []
    };
    await createDomainScan(userId, initial);
    invalidateDomainList(userId);

    (async () => {
        try {
            await updateDomainScan(id, userId, { status: 'scanning' });
            invalidateDomainScan(id);
            for await (const update of runDomainScan(url, { useSitemap, maxPages })) {
                const currentScan = await getDomainScan(id, userId);
                if (!currentScan) break;
                if (update.type === 'progress') {
                    await updateDomainScan(id, userId, {
                        progress: { scanned: update.scannedCount, total: 0, currentUrl: update.url }
                    });
                    invalidateDomainScan(id);
                } else if (update.type === 'complete') {
                    const slimPages = slimPagesForPayload(update.domainResult.pages);
                    await updateDomainScan(id, userId, {
                        score: update.domainResult.score,
                        pages: slimPages,
                        graph: update.domainResult.graph,
                        systemicIssues: update.domainResult.systemicIssues,
                        totalPages: update.domainResult.totalPages,
                        eeat: update.domainResult.eeat,
                    });
                    for (const page of update.domainResult.pages) {
                        await addScan(userId, { ...page, groupId: id });
                    }
                    invalidateDomainScan(id);
                }
            }
            await updateDomainScan(id, userId, { status: 'complete' });
            invalidateDomainScan(id);
            invalidateDomainList(userId);
        } catch (e) {
            console.error('Background Scan Error:', e);
            await updateDomainScan(id, userId, { status: 'error', error: (e as Error).message } as Partial<DomainScanResult>);
            invalidateDomainScan(id);
            invalidateDomainList(userId);
        }
    })();

    return NextResponse.json({
        success: true,
        data: { id, status: 'queued', message: 'Scan started in background' }
    }, { status: 202 });
}
