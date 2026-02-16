import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listDomainScans, getDomainScansCount } from '@/lib/db/scans';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const [scans, total] = await Promise.all([
        listDomainScans(session.user.id, { limit, offset }),
        getDomainScansCount(session.user.id),
    ]);
    const summary = scans.map(s => ({
        id: s.id,
        domain: s.domain,
        timestamp: s.timestamp,
        status: s.status,
        score: s.score,
        totalPages: s.totalPages,
    }));
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        success: true,
        count: summary.length,
        data: summary,
        pagination: { total, page, limit, totalPages },
    });
}
