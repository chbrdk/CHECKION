/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan                                         */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';
import { scanStore } from '@/lib/store';
import type { ScanRequest, Device } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ScanRequest;

        if (!body.url || typeof body.url !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid "url" field.' },
                { status: 400 },
            );
        }

        // Basic URL validation
        try {
            new URL(body.url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format. Please provide a full URL including protocol (e.g. https://example.com).' },
                { status: 400 },
            );
        }



        const groupId = uuidv4();
        const devices: Device[] = ['desktop', 'tablet', 'mobile'];

        // Run scans in parallel
        const results = await Promise.all(
            devices.map(device =>
                runScan({
                    url: body.url,
                    standard: body.standard,
                    runners: body.runners,
                    device,
                    groupId
                })
            )
        );

        // Store all results
        results.forEach(result => scanStore.add(result));

        // Find desktop result to return (for redirect)
        const desktopResult = results.find(r => r.device === 'desktop') || results[0];

        return NextResponse.json(desktopResult);
    } catch (err) {
        console.error('[CHECKION] Scan failed:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: `Scan failed: ${message}` },
            { status: 500 },
        );
    }
}

export async function GET() {
    return NextResponse.json(scanStore.list());
}
