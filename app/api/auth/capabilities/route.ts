/* GET /api/auth/capabilities — feature flags for the signed-in user (no secrets). */
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    return NextResponse.json({
        userId: user.id,
        domainScansListAllUsers: canListAllUsersDomainScans(request, user.id),
        uxJourneyAgentEnabled: uxJourneyAgentEnabled(),
    });
}
