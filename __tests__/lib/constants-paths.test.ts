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
    apiScanDomainSlimPages,
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

    it('pathScanDomain builds /scan/domain?url=...', () => {
        expect(pathScanDomain({ url: 'https://example.com' })).toBe('/scan/domain?url=https%3A%2F%2Fexample.com');
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
    });
});
