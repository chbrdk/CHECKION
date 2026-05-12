import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listStandaloneScansFull, listSharedProjectStandaloneScansFull } from '@/lib/db/scans';
import { listProjects } from '@/lib/db/projects';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const sharedProjectIds = (await listProjects(user.id))
        .filter((project) => project.userId !== user.id)
        .map((project) => project.id);
    const [ownScans, sharedScans] = await Promise.all([
        listStandaloneScansFull(user.id),
        sharedProjectIds.length > 0
            ? listSharedProjectStandaloneScansFull(sharedProjectIds)
            : Promise.resolve([]),
    ]);
    const scans = [...ownScans, ...sharedScans].sort((a, b) => {
        if (a.timestamp < b.timestamp) return 1;
        if (a.timestamp > b.timestamp) return -1;
        return 0;
    });
    return NextResponse.json({
        success: true,
        count: scans.length,
        data: scans
    });
}
