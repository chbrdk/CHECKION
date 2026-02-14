import { NextResponse } from 'next/server';
import { scanStore } from '@/lib/store';

export async function GET() {
    const scans = scanStore.listDomainScans();
    // Return summary only (lighter payload)
    const summary = scans.map(s => ({
        id: s.id,
        domain: s.domain,
        timestamp: s.timestamp,
        status: s.status,
        score: s.score,
        totalPages: s.totalPages,
        // Omit heavy graph/pages data for list view
    }));

    return NextResponse.json({
        success: true,
        count: summary.length,
        data: summary
    });
}
