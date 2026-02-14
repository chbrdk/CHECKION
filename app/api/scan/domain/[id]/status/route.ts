import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const scan = await getDomainScan(id, session.user.id);

    if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json(scan);
}
