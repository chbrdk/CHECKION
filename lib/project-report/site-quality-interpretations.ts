/**
 * Reader-facing interpretations for Site Quality KPIs (agent + deterministic fallback).
 */
import type {
    MetricInterpretations,
    SiteQualityMetricInterpretations,
} from '@/lib/project-report/narrative-schema';
import type {
    DomainFacts,
    ProjectReportBundle,
    ProjectReportLocale,
    SystemicIssueFact,
} from '@/lib/project-report/types';

export function lcpToMs(lcp: number | null | undefined): number | null {
    if (lcp == null || Number.isNaN(lcp)) return null;
    return lcp > 0 && lcp < 100 ? Math.round(lcp * 1000) : Math.round(lcp);
}

export function getSiteQualitySectionAnalysis(
    bundle: ProjectReportBundle
): { summary: string; keyFindings: string[]; metricInterpretations?: MetricInterpretations } | null {
    const section =
        bundle.deep?.sections.siteQuality ?? bundle.narrative?.sections?.siteQuality ?? null;
    if (!section?.summary?.trim()) return null;
    return section;
}

export function buildFallbackSiteQualityInterpretations(
    domain: DomainFacts,
    locale: ProjectReportLocale
): SiteQualityMetricInterpretations {
    const de = locale === 'de';
    const errorsPerPage =
        domain.totalPageCount > 0 ? domain.issueStats.errors / domain.totalPageCount : domain.issueStats.errors;
    const lcpMs = lcpToMs(domain.performance?.avgLcp ?? null);

    let wcagErrors: string;
    if (domain.issueStats.errors === 0 && domain.issueStats.warnings === 0) {
        wcagErrors = de
            ? 'Keine kritischen WCAG-Fehler im Scan — die Barrierefreiheit wirkt auf Domain-Ebene stabil. Einzelne Seiten können dennoch Warnungen haben.'
            : 'No critical WCAG errors in the scan — accessibility looks stable at domain level. Individual pages may still show warnings.';
    } else if (errorsPerPage >= 0.5 || domain.issueStats.errors >= 20) {
        wcagErrors = de
            ? `${domain.issueStats.errors} Fehler und ${domain.issueStats.warnings} Warnungen über ${domain.totalPageCount} Seiten: hohe Belastung für Nutzer mit Assistenztechnologien und erhöhtes Risiko für Compliance-Anforderungen.`
            : `${domain.issueStats.errors} errors and ${domain.issueStats.warnings} warnings across ${domain.totalPageCount} pages: high burden for assistive-tech users and elevated compliance risk.`;
    } else {
        wcagErrors = de
            ? `${domain.issueStats.errors} Fehler / ${domain.issueStats.warnings} Warnungen — moderates Niveau. Priorisieren Sie wiederkehrende Muster, die viele Seiten betreffen.`
            : `${domain.issueStats.errors} errors / ${domain.issueStats.warnings} warnings — moderate level. Prioritize recurring patterns affecting many pages.`;
    }

    let domainScore: string;
    if (domain.score >= 80) {
        domainScore = de
            ? `Domain-Score ${domain.score}/100: insgesamt solide UX- und Qualitätsbasis; verbleibende Punkte liegen meist in Details oder Einzelseiten.`
            : `Domain score ${domain.score}/100: solid overall UX and quality baseline; remaining gaps are usually detail-level or page-specific.`;
    } else if (domain.score >= 60) {
        domainScore = de
            ? `Domain-Score ${domain.score}/100: gemischtes Bild — Kernflows funktionieren, aber wiederkehrende Issues bremsen Vertrauen und Conversion.`
            : `Domain score ${domain.score}/100: mixed picture — core flows work, but recurring issues hurt trust and conversion.`;
    } else {
        domainScore = de
            ? `Domain-Score ${domain.score}/100: deutlicher Handlungsbedarf — UX-Reibung und technische Schwächen sind für Nutzer spürbar.`
            : `Domain score ${domain.score}/100: clear need for action — UX friction and technical weaknesses are noticeable to users.`;
    }

    let performance: string | undefined;
    if (domain.performance) {
        const { avgTtfb, avgFcp, avgLcp } = domain.performance;
        if (lcpMs != null && lcpMs <= 2500) {
            performance = de
                ? `Performance (Ø LCP ${avgLcp ?? '–'}): im grünen Bereich — Ladeerlebnis unterstützt Nutzer und SEO-Core-Web-Vitals.`
                : `Performance (avg LCP ${avgLcp ?? '–'}): in the green zone — load experience supports users and SEO Core Web Vitals.`;
        } else if (lcpMs != null) {
            performance = de
                ? `Performance (TTFB ${avgTtfb ?? '–'} · FCP ${avgFcp ?? '–'} · LCP ${avgLcp ?? '–'}): LCP über dem empfohlenen Ziel — spürbar langsameres Laden, besonders auf Mobilgeräten.`
                : `Performance (TTFB ${avgTtfb ?? '–'} · FCP ${avgFcp ?? '–'} · LCP ${avgLcp ?? '–'}): LCP above the recommended target — noticeably slower loads, especially on mobile.`;
        } else {
            performance = de
                ? `Performance-Kennzahlen (TTFB ${avgTtfb ?? '–'} · FCP ${avgFcp ?? '–'}): eingeschränkte LCP-Daten — dennoch auf Server- und Render-Zeiten achten.`
                : `Performance metrics (TTFB ${avgTtfb ?? '–'} · FCP ${avgFcp ?? '–'}): limited LCP data — still monitor server and render timings.`;
        }
    }

    let eco: string | undefined;
    if (domain.eco?.avgCo2 != null) {
        const co2 = domain.eco.avgCo2;
        eco =
            co2 <= 0.5
                ? de
                    ? `Ø ${co2}g CO₂ pro Seitenaufruf: ressourcenschonend — nachhaltiges Hosting und schlanke Seiten wirken positiv.`
                    : `Avg ${co2}g CO₂ per page view: resource-efficient — lean pages and sustainable hosting help.`
                : de
                  ? `Ø ${co2}g CO₂ pro Seitenaufruf: erhöhter Verbrauch — Bilder, Skripte und Third-Party-Requests prüfen.`
                  : `Avg ${co2}g CO₂ per page view: elevated consumption — review images, scripts, and third-party requests.`;
    }

    let systemicIssues: string | undefined;
    if (domain.systemicIssues.length > 0) {
        const top = domain.systemicIssues[0];
        systemicIssues = de
            ? `Systemische Issues sind wiederkehrende WCAG- oder UX-Muster, die auf vielen Seiten gleich auftreten — ein Fix wirkt oft domain-weit. Beispiel: „${top?.title ?? '…'}“ (${top?.count ?? 0} Seiten).`
            : `Systemic issues are recurring WCAG or UX patterns across many pages — one fix often helps site-wide. Example: "${top?.title ?? '…'}" (${top?.count ?? 0} pages).`;
    }

    return {
        domainScore,
        wcagErrors,
        performance,
        eco,
        systemicIssues,
    };
}

export function resolveSiteQualityInterpretations(
    bundle: ProjectReportBundle
): SiteQualityMetricInterpretations {
    const domain = bundle.domain;
    if (!domain) return {};

    const agent = getSiteQualitySectionAnalysis(bundle)?.metricInterpretations ?? {};
    const fallback = buildFallbackSiteQualityInterpretations(domain, bundle.locale);

    return {
        domainScore: agent.domainScore?.trim() || fallback.domainScore,
        wcagErrors: agent.wcagErrors?.trim() || fallback.wcagErrors,
        performance: agent.performance?.trim() || fallback.performance,
        eco: agent.eco?.trim() || fallback.eco,
        systemicIssues: agent.systemicIssues?.trim() || fallback.systemicIssues,
    };
}

export function systemicIssueDescription(
    issue: SystemicIssueFact,
    keyFindings: string[],
    locale: ProjectReportLocale
): string {
    const de = locale === 'de';
    const matched = keyFindings.find((f) =>
        f.toLowerCase().includes(issue.title.toLowerCase().slice(0, 12))
    );
    if (matched) return matched;

    return de
        ? `Betrifft ${issue.count} gescannte Seite(n) — strukturelles Muster, das zentral behoben werden sollte.`
        : `Affects ${issue.count} scanned page(s) — structural pattern that should be fixed centrally.`;
}
