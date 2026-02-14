/**
 * Health check for Coolify/Docker and load balancers.
 * GET /api/health → 200 { status: "ok" }
 */
export async function GET() {
    return Response.json({ status: 'ok' }, { status: 200 });
}
