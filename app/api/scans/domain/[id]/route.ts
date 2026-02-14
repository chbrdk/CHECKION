import { NextRequest, NextResponse } from 'next/server';
import { scanStore } from '@/lib/store';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const success = scanStore.deleteDomainScan(id);

    if (!success) {
        return NextResponse.json({ success: false, error: 'Domain scan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Domain scan deleted' });
}
