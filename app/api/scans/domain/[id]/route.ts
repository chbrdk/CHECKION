import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteDomainScan } from '@/lib/db/scans';
import { invalidateDomainScan, invalidateDomainList } from '@/lib/cache';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const success = await deleteDomainScan(id, session.user.id);

    if (!success) {
        return NextResponse.json({ success: false, error: 'Domain scan not found' }, { status: 404 });
    }
    invalidateDomainScan(id);
    invalidateDomainList(session.user.id);

    return NextResponse.json({ success: true, message: 'Domain scan deleted' });
}
