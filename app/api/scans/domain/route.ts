import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listDomainScans } from '@/lib/db/scans';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scans = await listDomainScans(session.user.id);
    const summary = scans.map(s => ({
        id: s.id,
        domain: s.domain,
        timestamp: s.timestamp,
        status: s.status,
        score: s.score,
        totalPages: s.totalPages,
    }));

    return NextResponse.json({
        success: true,
        count: summary.length,
        data: summary
    });
}
