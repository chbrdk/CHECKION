/**
 * Health check for Coolify/Docker and load balancers.
 * GET /api/health → 200 { status: "ok" }
 */
import { getAudionIntegrationEnvSnapshot } from '@/lib/paths/audion-api';
import { getRuntimeMetadata } from '@/lib/runtime-metadata';

export const dynamic = 'force-dynamic';

export async function GET() {
    return Response.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
            ...getRuntimeMetadata(),
            integrations: {
                audion: getAudionIntegrationEnvSnapshot(),
            },
        },
        { status: 200 }
    );
}
