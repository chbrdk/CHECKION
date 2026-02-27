import { NextRequest, NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { API_SSL_LABS_BASE } from '@/lib/external-apis';

export async function GET(req: NextRequest) {
    const host = req.nextUrl.searchParams.get('host');
    if (!host) {
        return apiError('host is required', API_STATUS.BAD_REQUEST);
    }
    const hostname = host.replace(/^https?:\/\//, '').split('/')[0];
    if (!hostname || hostname.includes(' ')) {
        return apiError('Invalid host', API_STATUS.BAD_REQUEST);
    }

    try {
        const startRes = await fetch(
            `${API_SSL_LABS_BASE}/analyze?host=${encodeURIComponent(hostname)}&all=done`,
            { signal: AbortSignal.timeout(5000) }
        );
        if (!startRes.ok) {
            return apiError('SSL Labs API error: ' + startRes.statusText, API_STATUS.BAD_GATEWAY);
        }
        const data = (await startRes.json()) as {
            status?: string;
            grade?: string;
            endpoints?: Array<{ grade?: string; serverName?: string }>;
            certificates?: Array<{ subject?: string; issuer?: string }>;
        };

        if (data.status === 'ERROR') {
            return apiError('SSL Labs analysis failed', API_STATUS.BAD_GATEWAY);
        }
        if (data.status !== 'READY' && data.status !== 'IN_PROGRESS') {
            return NextResponse.json({
                success: true,
                status: data.status,
                message: 'Analysis may still be in progress. Try again in 1–2 minutes.',
            });
        }

        const grade = data.grade ?? data.endpoints?.[0]?.grade ?? null;
        return NextResponse.json({
            success: true,
            data: {
                host: hostname,
                grade,
                status: data.status,
                endpoints: data.endpoints?.slice(0, 3).map((e) => ({ grade: e.grade, serverName: e.serverName })),
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return apiError(msg, API_STATUS.INTERNAL_ERROR);
    }
}
