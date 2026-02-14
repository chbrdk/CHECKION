/**
 * Builds a reduced JSON payload from a ScanResult for the LLM.
 * Excludes screenshot and truncates large fields to limit tokens.
 */

import type { ScanResult } from '@/lib/types';

const CONTEXT_MAX_LEN = 200;

export function buildSummaryPayload(result: ScanResult): Record<string, unknown> {
    const issues = (result.issues ?? []).map((issue) => ({
        code: issue.code,
        type: issue.type,
        message: issue.message,
        selector: issue.selector,
        wcagLevel: issue.wcagLevel,
        context: typeof issue.context === 'string'
            ? issue.context.slice(0, CONTEXT_MAX_LEN) + (issue.context.length > CONTEXT_MAX_LEN ? '…' : '')
            : undefined,
    }));

    const ux = result.ux
        ? {
            score: result.ux.score,
            cls: result.ux.cls,
            readability: result.ux.readability,
            tapTargets: {
                issueCount: result.ux.tapTargets?.issues?.length ?? 0,
                issues: result.ux.tapTargets?.issues?.slice(0, 5) ?? [],
                detailsCount: result.ux.tapTargets?.details?.length ?? 0,
                detailsSample: (result.ux.tapTargets?.details ?? []).slice(0, 3).map((d) => ({
                    message: d.message,
                    size: d.size,
                })),
            },
            viewport: result.ux.viewport,
            focusOrderCount: result.ux.focusOrder?.length ?? 0,
            headingHierarchy: result.ux.headingHierarchy,
            altTextIssuesCount: result.ux.altTextIssues?.length ?? 0,
            altTextSample: (result.ux.altTextIssues ?? []).slice(0, 2).map((a) => ({ reason: a.reason, alt: a.alt?.slice(0, 50) })),
            ariaIssuesCount: result.ux.ariaIssues?.length ?? 0,
            ariaSample: (result.ux.ariaIssues ?? []).slice(0, 2).map((a) => a.message),
            formIssuesCount: result.ux.formIssues?.length ?? 0,
            formSample: (result.ux.formIssues ?? []).slice(0, 2).map((f) => f.message),
            vagueLinkTexts: result.ux.vagueLinkTexts?.slice(0, 5),
            imageIssues: result.ux.imageIssues,
            consoleErrorsCount: result.ux.consoleErrors?.length ?? 0,
            consoleErrorsSample: (result.ux.consoleErrors ?? []).slice(0, 3),
            brokenLinksCount: result.ux.brokenLinks?.length ?? 0,
            brokenLinksSample: (result.ux.brokenLinks ?? []).slice(0, 3),
            hasSkipLink: result.ux.hasSkipLink,
            reducedMotionInCss: result.ux.reducedMotionInCss,
            focusVisibleFailCount: result.ux.focusVisibleFailCount,
            mediaAccessibility: result.ux.mediaAccessibility,
            iframeIssues: result.ux.iframeIssues,
            metaRefreshPresent: result.ux.metaRefreshPresent,
            fontDisplayIssues: result.ux.fontDisplayIssues,
        }
        : undefined;

    const seo = result.seo
        ? {
            title: result.seo.title,
            metaDescription: result.seo.metaDescription?.slice(0, 150),
            h1: result.seo.h1,
            canonical: result.seo.canonical,
            ogTitle: result.seo.ogTitle,
            ogDescription: result.seo.ogDescription?.slice(0, 100),
            ogImage: result.seo.ogImage,
            twitterCard: result.seo.twitterCard,
            robotsTxtPresent: result.seo.robotsTxtPresent,
            sitemapUrl: result.seo.sitemapUrl,
            duplicateContentWarning: result.seo.duplicateContentWarning,
            skinnyContent: result.seo.skinnyContent,
            bodyWordCount: result.seo.bodyWordCount,
            keywordAnalysis: result.seo.keywordAnalysis
                ? {
                    totalWords: result.seo.keywordAnalysis.totalWords,
                    topKeywords: result.seo.keywordAnalysis.topKeywords?.slice(0, 8),
                    keywordPresence: result.seo.keywordAnalysis.keywordPresence?.slice(0, 5),
                }
                : undefined,
            structuredDataRequiredFields: result.seo.structuredDataRequiredFields,
        }
        : undefined;

    const links = result.links
        ? {
            brokenCount: result.links.broken?.length ?? 0,
            brokenSample: (result.links.broken ?? []).slice(0, 5).map((b) => ({ url: b.url, statusCode: b.statusCode, text: b.text?.slice(0, 40) })),
            total: result.links.total,
            internal: result.links.internal,
            external: result.links.external,
            missingNoopenerCount: result.links.missingNoopener?.length ?? 0,
        }
        : undefined;

    const generative = result.generative
        ? {
            score: result.generative.score,
            technical: result.generative.technical,
            content: result.generative.content,
            expertise: result.generative.expertise,
        }
        : undefined;

    return {
        url: result.url,
        device: result.device,
        standard: result.standard,
        durationMs: result.durationMs,
        score: result.score,
        stats: result.stats,
        passesCount: result.passes?.length ?? 0,
        issues,
        performance: result.performance,
        eco: result.eco,
        ux,
        seo,
        links,
        geo: result.geo,
        generative,
        privacy: result.privacy,
        security: result.security,
        technicalInsights: result.technicalInsights
            ? {
                thirdPartyDomainsCount: result.technicalInsights.thirdPartyDomains?.length ?? 0,
                thirdPartyDomainsSample: (result.technicalInsights.thirdPartyDomains ?? []).slice(0, 5),
                manifest: result.technicalInsights.manifest,
                themeColor: result.technicalInsights.themeColor,
                appleTouchIcon: result.technicalInsights.appleTouchIcon,
                serviceWorkerRegistered: result.technicalInsights.serviceWorkerRegistered,
                redirectCount: result.technicalInsights.redirectCount,
                metaRefreshPresent: result.technicalInsights.metaRefreshPresent,
            }
            : undefined,
    };
}
