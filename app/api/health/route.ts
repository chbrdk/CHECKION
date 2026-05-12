/**
 * Health check for Coolify/Docker and load balancers.
 * GET /api/health → 200 { status: "ok" }
 */
import { getRuntimeMetadata } from '@/lib/runtime-metadata';

export async function GET() {
    return Response.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
            ...getRuntimeMetadata(),
        },
        { status: 200 }
    );
}
