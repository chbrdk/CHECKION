import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listScans } from '@/lib/db/scans';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scans = await listScans(session.user.id);
    return NextResponse.json({
        success: true,
        count: scans.length,
        data: scans
    });
}
