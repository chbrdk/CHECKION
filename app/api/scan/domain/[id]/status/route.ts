import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedDomainScan } from '@/lib/cache';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const scan = await getCachedDomainScan(id, session.user.id);

    if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json(scan);
}
