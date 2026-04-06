import { describe, expect, it } from 'vitest';
import { isDomainRouteWithProject, isProjectRoute, isResultsRoute } from '@/components/AppShellHeaderNav';

describe('AppShellHeaderNav route helpers', () => {
    it('isProjectRoute matches /projects/[id] only', () => {
        expect(isProjectRoute('/projects/abc')).toBe(true);
        expect(isProjectRoute('/projects/abc/seo')).toBe(true);
        expect(isProjectRoute('/domain/x')).toBe(false);
        expect(isProjectRoute(null)).toBe(false);
    });

    it('isResultsRoute matches /results/[id]', () => {
        expect(isResultsRoute('/results/r1')).toBe(true);
        expect(isResultsRoute('/domain/x')).toBe(false);
    });

    it('isDomainRouteWithProject requires path and projectId query value', () => {
        expect(isDomainRouteWithProject('/domain/scan-1', 'proj-uuid')).toBe(true);
        expect(isDomainRouteWithProject('/domain/scan-1', null)).toBe(false);
        expect(isDomainRouteWithProject('/projects/x', 'proj')).toBe(false);
    });
});
