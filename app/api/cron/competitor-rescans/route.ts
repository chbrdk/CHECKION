/**
 * POST /api/cron/competitor-rescans
 * Authorization: Bearer {CHECKION_CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { runCompetitorRescanCron } from '@/lib/competitor-rescan-cron';

function authorizeCron(req: NextRequest): boolean {
    const secret = process.env.CHECKION_CRON_SECRET?.trim();
    if (!secret) return false;
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    return token.length > 0 && token === secret;
}

export async function POST(req: NextRequest) {
    if (!authorizeCron(req)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const minAgeDays = Number(req.nextUrl.searchParams.get('minAgeDays') ?? '');
    const maxProjects = Number(req.nextUrl.searchParams.get('maxProjects') ?? '');

    const result = await runCompetitorRescanCron({
        ...(Number.isFinite(minAgeDays) && minAgeDays > 0 ? { minAgeDays } : {}),
        ...(Number.isFinite(maxProjects) && maxProjects > 0 ? { maxProjects } : {}),
    });

    return NextResponse.json({ success: true, data: result });
}
