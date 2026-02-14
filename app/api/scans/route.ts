import { NextResponse } from 'next/server';
import { scanStore } from '@/lib/store';

export async function GET() {
    const scans = scanStore.list();
    return NextResponse.json({
        success: true,
        count: scans.length,
        data: scans
    });
}
