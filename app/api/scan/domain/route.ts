import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runDomainScan } from '@/lib/spider';
import { createDomainScan, updateDomainScan, getDomainScan, addScan } from '@/lib/db/scans';
import { v4 as uuidv4 } from 'uuid';
import type { DomainScanResult } from '@/lib/types';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    let url: string;
    try {
        const body = await req.json();
        url = body.url;
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

    (async () => {
        try {
            await updateDomainScan(id, userId, { status: 'scanning' });
            for await (const update of runDomainScan(url, {})) {
                const currentScan = await getDomainScan(id, userId);
                if (!currentScan) break;
                if (update.type === 'progress') {
                    await updateDomainScan(id, userId, {
                        progress: { scanned: update.scannedCount, total: 0, currentUrl: update.url }
                    });
                } else if (update.type === 'complete') {
                    await updateDomainScan(id, userId, {
                        score: update.domainResult.score,
                        pages: update.domainResult.pages,
                        graph: update.domainResult.graph,
                        systemicIssues: update.domainResult.systemicIssues,
                        totalPages: update.domainResult.totalPages
                    });
                    for (const page of update.domainResult.pages) {
                        await addScan(userId, { ...page, groupId: id });
                    }
                }
            }
            await updateDomainScan(id, userId, { status: 'complete' });
        } catch (e) {
            console.error('Background Scan Error:', e);
            await updateDomainScan(id, userId, { status: 'error', error: (e as Error).message } as Partial<DomainScanResult>);
        }
    })();

    return NextResponse.json({
        success: true,
        data: { id, status: 'queued', message: 'Scan started in background' }
    }, { status: 202 });
}
