import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, scanDomainBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { startDomainScan } from '@/lib/domain-scan-start';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
    const user = await getRequestUser(req);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = checkRateLimit(`scan:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }
    const parsed = await parseApiBody(req, scanDomainBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const url = parsed.url.trim().toLowerCase().startsWith('http') ? parsed.url.trim() : `https://${parsed.url.trim()}`;
    const { id } = await startDomainScan(user.id, url, {
        projectId: parsed.projectId,
        useSitemap: parsed.useSitemap,
        maxPages: parsed.maxPages,
    });
    return NextResponse.json({
        success: true,
        data: { id, status: 'queued', message: 'Scan started in background' }
    }, { status: 202 });
}
