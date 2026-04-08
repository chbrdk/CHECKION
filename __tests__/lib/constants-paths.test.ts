/**
 * Tests for path/API constants (URL/Path centralization).
 */
import {
    PATH_HOME,
    PATH_SCAN,
    pathResults,
    pathDomain,
    pathScanDomain,
    pathJourneyAgent,
    pathGeoEeat,
    pathShare,
    apiScan,
    apiScanScreenshot,
    apiScanDomainStatus,
    apiScanDomainSummary,
    apiShareToken,
    apiShareTokenPages,
    apiShareTokenPagesScreenshot,
    apiScanJourneyAgent,
    apiScanGeoEeat,
    apiSearch,
    apiSaliencyResult,
    apiShareByResource,
    DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX,
    DOMAIN_UX_BROKEN_LINKS_PREVIEW,
    DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
    SCAN_ISSUE_LIST_ROW_FALLBACK_PX,
    PRETEXT_PACKAGE_NAME,
    PRETEXT_NPM_URL,
    PRETEXT_REPO_URL,
    apiScanDomainSlimPages,
    apiScanDomainBundle,
    apiScanDomainSeoPages,
    apiScanDomainPageResolve,
    DOMAIN_SLIM_PAGES_PAGE_SIZE,
    DOMAIN_SEO_PAGES_PAGE_SIZE,
    DOMAIN_ISSUES_PAGE_SIZE,
    HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON,
    CACHE_REVALIDATE_DOMAIN,
    VIRTUAL_CHIP_LIST_ROW_ESTIMATE_PX,
    VIRTUAL_CHIP_LIST_OVERSCAN,
    VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX,
    VIRTUAL_CHIP_LIST_INLINE_THRESHOLD,
    LAYOUT_MAX_CONTENT_WIDTH_PX,
    APP_LAYOUT_INNER_BORDER_WIDTH_PX,
} from '@/lib/constants';

describe('Path constants', () => {
    it('PATH_HOME is /', () => {
        expect(PATH_HOME).toBe('/');
    });

    it('PATH_SCAN is /scan', () => {
        expect(PATH_SCAN).toBe('/scan');
    });

    it('pathResults builds /results/[id]', () => {
        expect(pathResults('abc-123')).toBe('/results/abc-123');
    });

    it('pathDomain builds /domain/[id]', () => {
        expect(pathDomain('xyz')).toBe('/domain/xyz');
    });

    it('pathDomain with query adds search params', () => {
        expect(pathDomain('xyz', { restoreJourney: 'j1' })).toBe('/domain/xyz?restoreJourney=j1');
    });

    it('pathScanDomain builds /scan/domain?url=...&projectId=...', () => {
        expect(pathScanDomain({ url: 'https://example.com' })).toBe('/scan/domain?url=https%3A%2F%2Fexample.com');
        expect(pathScanDomain({ url: 'https://a.com', projectId: '550e8400-e29b-41d4-a716-446655440000' })).toBe(
            '/scan/domain?url=https%3A%2F%2Fa.com&projectId=550e8400-e29b-41d4-a716-446655440000'
        );
    });

    it('pathJourneyAgent builds /journey-agent/[jobId]', () => {
        expect(pathJourneyAgent('job-99')).toBe('/journey-agent/job-99');
    });

    it('pathGeoEeat builds /geo-eeat/[jobId]', () => {
        expect(pathGeoEeat('geo-1')).toBe('/geo-eeat/geo-1');
    });

    it('pathShare builds /share/[token]', () => {
        expect(pathShare('tok_abc')).toBe('/share/tok_abc');
    });
});

describe('API path builders', () => {
    it('apiScan builds /api/scan/[id]', () => {
        expect(apiScan('scan-1')).toBe('/api/scan/scan-1');
    });

    it('apiScanScreenshot builds screenshot URL', () => {
        expect(apiScanScreenshot('s1')).toBe('/api/scan/s1/screenshot');
    });

    it('apiScanDomainStatus builds status URL', () => {
        expect(apiScanDomainStatus('d1')).toBe('/api/scan/domain/d1/status');
    });

    it('apiScanDomainSummary builds summary URL', () => {
        expect(apiScanDomainSummary('d2')).toBe('/api/scan/domain/d2/summary');
    });

    it('apiScanDomainSummary with light omits heavy SEO page rows via query', () => {
        expect(apiScanDomainSummary('d2', { light: true })).toBe('/api/scan/domain/d2/summary?light=1');
    });

    it('apiScanDomainSummary with seoFull loads only aggregated.seo for Tab 7 merge', () => {
        expect(apiScanDomainSummary('d2', { seoFull: true })).toBe('/api/scan/domain/d2/summary?seoFull=1');
    });

    it('apiScanDomainSlimPages builds paged slim-pages URL', () => {
        expect(apiScanDomainSlimPages('d1')).toBe('/api/scan/domain/d1/slim-pages');
        expect(apiScanDomainSlimPages('d1', { offset: 100, limit: 50 })).toBe(
            '/api/scan/domain/d1/slim-pages?offset=100&limit=50'
        );
        expect(apiScanDomainSlimPages('d1', { offset: 0, limit: 100, sort: 'score', dir: 'desc' })).toBe(
            '/api/scan/domain/d1/slim-pages?offset=0&limit=100&sort=score&dir=desc'
        );
    });

    it('apiScanDomainBundle builds bundle URL', () => {
        expect(apiScanDomainBundle('d1')).toBe('/api/scan/domain/d1/bundle');
    });

    it('apiScanDomainSeoPages builds seo-pages URL with sort', () => {
        expect(apiScanDomainSeoPages('d1', { offset: 50, limit: 50, sort: 'url', dir: 'asc' })).toBe(
            '/api/scan/domain/d1/seo-pages?offset=50&limit=50&sort=url&dir=asc'
        );
    });

    it('apiScanDomainPageResolve encodes url query', () => {
        expect(apiScanDomainPageResolve('d1', 'https://a.com/x y')).toContain('url=');
        expect(apiScanDomainPageResolve('d1', 'https://a.com/x')).toBe(
            '/api/scan/domain/d1/page-resolve?url=https%3A%2F%2Fa.com%2Fx'
        );
    });

    it('exposes positive domain pagination sizes', () => {
        expect(DOMAIN_SLIM_PAGES_PAGE_SIZE).toBeGreaterThan(0);
        expect(DOMAIN_SEO_PAGES_PAGE_SIZE).toBeGreaterThan(0);
        expect(DOMAIN_ISSUES_PAGE_SIZE).toBeGreaterThan(0);
    });

    it('apiShareToken builds share token URL', () => {
        expect(apiShareToken('t1')).toBe('/api/share/t1');
    });

    it('apiShareTokenPages builds pages URL', () => {
        expect(apiShareTokenPages('t1', 'p1')).toBe('/api/share/t1/pages/p1');
    });

    it('apiShareTokenPagesScreenshot builds screenshot URL with optional access', () => {
        expect(apiShareTokenPagesScreenshot('t1', 'p1')).toBe('/api/share/t1/pages/p1/screenshot');
        expect(apiShareTokenPagesScreenshot('t1', 'p1', 'acc123')).toBe('/api/share/t1/pages/p1/screenshot?access=acc123');
    });

    it('apiScanJourneyAgent builds journey agent URL', () => {
        expect(apiScanJourneyAgent('j1')).toBe('/api/scan/journey-agent/j1');
    });

    it('apiScanGeoEeat builds geo-eeat URL', () => {
        expect(apiScanGeoEeat('g1')).toBe('/api/scan/geo-eeat/g1');
    });

    it('apiSearch builds search URL', () => {
        expect(apiSearch('foo')).toContain('q=foo');
        expect(apiSearch('foo', 50)).toContain('limit=50');
    });

    it('apiSaliencyResult builds result URL', () => {
        expect(apiSaliencyResult('j1', 's1')).toBe('/api/saliency/result?jobId=j1&scanId=s1');
    });

    it('apiShareByResource builds by-resource URL', () => {
        expect(apiShareByResource('single', 'id1')).toBe('/api/share/by-resource?type=single&id=id1');
    });
});

describe('Domain tab virtual list constants', () => {
    it('exposes positive tuning values for VirtualScrollList', () => {
        expect(DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX).toBeGreaterThan(0);
        expect(DOMAIN_TAB_VIRTUAL_OVERSCAN).toBeGreaterThan(0);
        expect(DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX).toBeGreaterThan(DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX);
        expect(DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX).toBeGreaterThan(DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX);
        expect(DOMAIN_UX_BROKEN_LINKS_PREVIEW).toBeGreaterThan(0);
        expect(DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX).toBeGreaterThan(0);
        expect(SCAN_ISSUE_LIST_ROW_FALLBACK_PX).toBeGreaterThan(0);
        expect(VIRTUAL_CHIP_LIST_ROW_ESTIMATE_PX).toBeGreaterThan(0);
        expect(VIRTUAL_CHIP_LIST_OVERSCAN).toBeGreaterThan(0);
        expect(VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX).toBeGreaterThan(0);
        expect(VIRTUAL_CHIP_LIST_INLINE_THRESHOLD).toBeGreaterThan(1);
    });
});

describe('Layout constants', () => {
    it('defines max content width for centered pages', () => {
        expect(LAYOUT_MAX_CONTENT_WIDTH_PX).toBe(1600);
    });

    it('inner app frame border width matches MsqdxAppLayout thin', () => {
        expect(APP_LAYOUT_INNER_BORDER_WIDTH_PX).toBe(3);
    });
});

describe('Pretext reference constants', () => {
    it('points at npm package and repo', () => {
        expect(PRETEXT_PACKAGE_NAME).toBe('@chenglou/pretext');
        expect(PRETEXT_NPM_URL).toMatch(/^https:\/\/www\.npmjs\.com\/package\//);
        expect(PRETEXT_REPO_URL).toBe('https://github.com/chenglou/pretext');
    });
});

describe('HTTP cache hints (domain JSON APIs)', () => {
    it('private max-age matches CACHE_REVALIDATE_DOMAIN', () => {
        expect(HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON).toBe(`private, max-age=${CACHE_REVALIDATE_DOMAIN}`);
    });
});
