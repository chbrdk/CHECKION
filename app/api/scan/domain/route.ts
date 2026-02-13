import { NextRequest, NextResponse } from 'next/server';
import { runDomainScan } from '@/lib/spider';
import { scanStore } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 10; // Fast response for async job

export async function POST(req: NextRequest) {
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

    // Initialize in store
    scanStore.createDomainScan(id, url);

    // Start Background Job (Fire & Forget)
    (async () => {
        try {
            scanStore.updateDomainScan(id, { status: 'scanning' });

            // Iterate over generator updates
            for await (const update of runDomainScan(url, {})) {

                // Map generator events to store updates
                const currentScan = scanStore.getDomainScan(id);
                if (!currentScan) break;

                if (update.type === 'progress') {
                    scanStore.updateDomainScan(id, {
                        progress: {
                            scanned: update.scannedCount,
                            total: 0, // Unknown/Unlimited
                            currentUrl: update.url
                        }
                    });
                } else if (update.type === 'complete') {
                    // Update the full result object when done
                    scanStore.updateDomainScan(id, {
                        score: update.domainResult.score,
                        pages: update.domainResult.pages,
                        graph: update.domainResult.graph,
                        systemicIssues: update.domainResult.systemicIssues,
                        totalPages: update.domainResult.totalPages
                    });

                    // Index individual pages so they can be opened via /results/[id]
                    update.domainResult.pages.forEach((page: any) => {
                        scanStore.add(page);
                    });
                }
            }

            // Mark complete
            scanStore.updateDomainScan(id, { status: 'complete' });

        } catch (e) {
            console.error('Background Scan Error:', e);
            scanStore.updateDomainScan(id, {
                status: 'error',
                error: (e as Error).message
            });
        }
    })();

    // Return immediately with 202 Accepted
    return NextResponse.json({
        id,
        status: 'queued',
        message: 'Scan started in background'
    }, { status: 202 });
}
