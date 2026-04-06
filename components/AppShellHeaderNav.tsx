'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ProjectHeaderNav } from './ProjectHeaderNav';
import { ResultsHeaderNav } from './ResultsHeaderNav';

/** Project sub-routes: show project subnav in header. */
export function isProjectRoute(path: string | null): boolean {
    return path != null && path.startsWith('/projects/') && /^\/projects\/[^/]+/.test(path);
}

/** Single-scan results: back + AddToProject + Share in header. */
export function isResultsRoute(path: string | null): boolean {
    return path != null && /^\/results\/[^/]+(?:\/|$)/.test(path);
}

export function isDomainRouteWithProject(path: string | null, projectId: string | null): boolean {
    return Boolean(path && /^\/domain\/[^/]+/.test(path) && projectId);
}

function AppShellHeaderNavInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const projectIdFromQuery = searchParams.get('projectId');

    if (isProjectRoute(pathname) || isDomainRouteWithProject(pathname, projectIdFromQuery)) {
        return <ProjectHeaderNav />;
    }
    if (isResultsRoute(pathname)) {
        return <ResultsHeaderNav />;
    }
    return null;
}

/** Header actions: project nav, domain-result project context, or single-scan nav. Wrapped in Suspense for useSearchParams. */
export function AppShellHeaderNav() {
    return (
        <Suspense fallback={null}>
            <AppShellHeaderNavInner />
        </Suspense>
    );
}
