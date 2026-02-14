/* ------------------------------------------------------------------ */
/*  CHECKION – Pa11y + axe-core scanner wrapper                       */
/* ------------------------------------------------------------------ */

import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { Issue, Runner, ScanResult, ScanStats, WcagStandard, Device, ScanOptions } from './types';

/**
 * Viewport definitions for supported devices.
 */
const VIEWPORTS: Record<Device, { width: number; height: number; isMobile: boolean; hasTouch: boolean }> = {
    desktop: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
    tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true }, // iPad Portrait
    mobile: { width: 375, height: 667, isMobile: true, hasTouch: true }, // iPhone SE
};

/**
 * Map pa11y's numeric type codes to our severity labels.
 * Pa11y uses: 1 = error, 2 = warning, 3 = notice
 */
function mapSeverity(typeCode: number | string): Issue['type'] {
    if (typeCode === 1 || typeCode === 'error') return 'error';
    if (typeCode === 2 || typeCode === 'warning') return 'warning';
    return 'notice';
}

/** Detect which runner produced an issue based on its code prefix. */
function detectRunner(code: string): Runner {
    // axe-core issues contain dashes in their IDs (e.g. "color-contrast")
    // HTML_CodeSniffer issues follow the dot-separated WCAG path format
    if (/^[a-z]/.test(code) && code.includes('-')) return 'axe';
    return 'htmlcs';
}

function computeStats(issues: Issue[]): ScanStats {
    const stats: ScanStats = { errors: 0, warnings: 0, notices: 0, total: issues.length };
    for (const issue of issues) {
        if (issue.type === 'error') stats.errors++;
        else if (issue.type === 'warning') stats.warnings++;
        else stats.notices++;
    }
    return stats;
}



/**
 * Detect WCAG Level from the issue code.
 * HTMLCS codes usually look like "WCAG2AA.Principle1..."
 * Axe codes don't have level directly in the code, but we might infer or default to Unknown/A.
 * Ideally we'd map axe tags, but pa11y might not expose them fully in the standard output.
 * We'll do best-effort parsing for now.
 */
function detectWcagLevel(code: string): Issue['wcagLevel'] {
    const upperCode = code.toUpperCase();
    if (upperCode.includes('WCAG2AAA')) return 'AAA';
    if (upperCode.includes('WCAG2AA')) return 'AA';
    if (upperCode.includes('WCAG2A')) return 'A';
    // APCA / WCAG 3.0 Experimental
    if (upperCode.includes('APCA') || upperCode.includes('COLOR-CONTRAST-ENHANCED')) return 'APCA';
    // Fallback/Heuristic for Axe or other codes if they contain level indicators
    return 'Unknown';
}

/**
 * Calculate a simple accessibility score (0-100).
 * Heuristic: Start at 100. Deduct points for errors and warnings.
 * - Error: -2 points
 * - Warning: -0.5 points
 * - Notice: -0.1 points (negligible)
 * Clamped to 0.
 */
function calculateScore(counts: ScanStats): number {
    const deductions = (counts.errors * 2) + (counts.warnings * 0.5) + (counts.notices * 0.1);
    return Math.max(0, Math.round(100 - deductions));
}

export async function runScan(options: ScanOptions & { groupId?: string }): Promise<ScanResult> {
    const { url, standard = 'WCAG2AA', runners = ['axe', 'htmlcs'], device = 'desktop', groupId } = options;

    // Dynamic import – pa11y is CommonJS and must stay server-only
    // @ts-ignore
    const pa11y = (await import('pa11y')).default;

    const pa11yRunners: string[] = [];
    if (runners.includes('axe')) pa11yRunners.push('axe');
    if (runners.includes('htmlcs')) pa11yRunners.push('htmlcs');

    const startTime = Date.now();

    // Launch browser manually to enable screenshot and bounding box extraction
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true, // Use new headless mode if supported (default)
    });

    // Create page and set viewport
    const page = await browser.newPage();
    const viewport = VIEWPORTS[device];
    await page.setViewport(viewport);

    // Inject CLS Observer immediately
    await page.evaluateOnNewDocument(function () {
        // @ts-ignore
        window.__cls_score = 0;
        // @ts-ignore
        new PerformanceObserver(function (entryList) {
            for (const entry of entryList.getEntries()) {
                // @ts-ignore
                if (!entry.hadRecentInput) {
                    // @ts-ignore
                    window.__cls_score += entry.value;
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
    });

    // --- Console Error Tracking ---
    const consoleLogs: Array<{ type: 'error' | 'warning', text: string, location?: string }> = [];
    page.on('console', (msg) => {
        const type = msg.type() as string;
        if (type === 'error' || type === 'warning') {
            consoleLogs.push({
                type: type as 'error' | 'warning',
                text: msg.text(),
                location: msg.location()?.url
            });
        }
    });
    page.on('pageerror', (err: any) => {
        consoleLogs.push({
            type: 'error',
            text: err.message || 'Unknown error'
        });
    });



    // --- Performance & Eco Data Collection ---
    let totalBytes = 0;
    let serverIp: string | null = null;
    let mainHeaders: Record<string, string> = {};

    // Enable request interception or just listen to responses for size
    await page.setRequestInterception(false); // We don't need to block, just listen
    page.on('response', async (response) => {
        try {
            const rUrl = response.url();
            // Capture main resource IP and headers
            if (!serverIp && (rUrl === url || rUrl === url + '/' || rUrl.split('?')[0] === url.split('?')[0])) {
                const remoteAddress = response.remoteAddress();
                serverIp = remoteAddress.ip || null;
                mainHeaders = response.headers();
            }

            // Getting buffer might fail for some resources (CORS, etc), heuristic fallback
            const headers = response.headers();
            if (headers['content-length']) {
                totalBytes += parseInt(headers['content-length'], 10);
            }
        } catch (e) {
            // Ignore failed resource size collection
        }
    });

    // Set User Agent based on device (simplified)
    if (device === 'mobile') {
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    } else if (device === 'tablet') {
        await page.setUserAgent('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    }

    try {
        const results = await pa11y(url, {
            browser,
            page,
            viewport,
            standard,
            runners: pa11yRunners,
            timeout: 60_000, // Increase timeout for visual scan
            wait: 1_000,
        } as any);

        // --- Aggressive Scroll for CLS ---
        // Scroll down and up to trigger lazy loads and layout shifts
        await page.evaluate(async function () {
            const distance = 100;
            const delay = 50;
            const totalHeight = document.body.scrollHeight;
            let currentScroll = 0;

            // Scroll Down
            while ((window.innerHeight + currentScroll) < totalHeight) {
                window.scrollBy(0, distance);
                currentScroll += distance;
                await new Promise((resolve) => setTimeout(resolve, delay));
                // Cap to avoid infinite loops
                if (currentScroll > 5000) break;
            }
            // Scroll Up Trigger
            window.scrollTo(0, 0);
        });
        // Allow time for shifts to settle
        await new Promise((r) => setTimeout(r, 1000));

        // --- Extract Performance Metrics ---
        // We use page.evaluate to get window.performance data
        const perfData = await page.evaluate(function () {
            const navHeading = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = performance.getEntriesByName('first-contentful-paint')[0];

            // Basic fallbacks
            const ttfb = navHeading ? (navHeading.responseStart - navHeading.requestStart) : 0;
            const domLoad = navHeading ? (navHeading.domContentLoadedEventEnd - navHeading.fetchStart) : 0;
            const windowLoad = navHeading ? (navHeading.loadEventEnd - navHeading.fetchStart) : 0;
            const fcp = paint ? paint.startTime : 0;

            return {
                ttfb: Math.round(ttfb),
                fcp: Math.round(fcp),
                domLoad: Math.round(domLoad),
                windowLoad: Math.round(windowLoad),
                lcp: 0, // LCP requires PerformanceObserver, keeping it simple for now
            };
        });

        // --- Calculate Eco Score ---
        // Model: Sustainable Web Design
        // 0.81 kWh/GB for data transfer
        // 442g CO2/kWh global average carbon intensity
        const transferGB = totalBytes / (1024 * 1024 * 1024);
        const energyKWh = transferGB * 0.81 * 0.75; // 0.75 for first-time visit (caching factor)
        const co2Grams = energyKWh * 442;

        let ecoGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'F';
        if (co2Grams < 0.095) ecoGrade = 'A+';
        else if (co2Grams < 0.186) ecoGrade = 'A';
        else if (co2Grams < 0.341) ecoGrade = 'B';
        else if (co2Grams < 0.493) ecoGrade = 'C';
        else if (co2Grams < 0.656) ecoGrade = 'D';
        else if (co2Grams < 0.850) ecoGrade = 'E';

        // 1. Capture Full Page Screenshot (Base64)
        const screenshotBuffer = await page.screenshot({
            fullPage: true,
            encoding: 'base64',
            type: 'jpeg', // Use JPEG to reduce size
            quality: 70
        });
        const screenshot = `data:image/jpeg;base64,${screenshotBuffer}`;

        // 2. Extract Bounding Boxes for Issues
        const issuePromises = (results.issues || []).map(async (raw: any) => {
            let boundingBox;

            if (raw.selector) {
                try {
                    // Try to finding the element and get its bounding box
                    // Note: This runs in the browser context
                    const box = await page.evaluate(function (sel) {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        return {
                            x: rect.x + window.scrollX,
                            y: rect.y + window.scrollY,
                            width: rect.width,
                            height: rect.height,
                        };
                    }, raw.selector);
                    if (box) boundingBox = box;
                } catch (e) {
                    // Ignore selector errors
                }
            }

            return {
                code: raw.code || '',
                type: mapSeverity(raw.type as unknown as number | string),
                message: raw.message || '',
                context: raw.context || '',
                selector: raw.selector || '',
                runner: detectRunner(raw.code || ''),
                wcagLevel: detectWcagLevel(raw.code || ''),
                boundingBox,
            };
        });

        const issues: Issue[] = await Promise.all(issuePromises);



        // 3. Capture Passed Audits using axe-core directly
        let passes: any[] = [];
        try {
            console.log("Injecting axe-core...");
            // Resolve path relative to CWD (project root)
            // This is safer in Next.js serverless/webpack context than require.resolve sometimes
            const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

            if (fs.existsSync(axePath)) {
                const axeSource = fs.readFileSync(axePath, 'utf8');
                await page.addScriptTag({ content: axeSource });
                console.log("Axe injected via content. Running axe...");
            } else {
                console.warn("Axe file not found at:", axePath);
                // Fallback to require.resolve - sometimes works local dev
                const fallbackPath = require.resolve('axe-core');
                await page.addScriptTag({ path: fallbackPath });
                console.log("Axe injected via fallback path.");
            }

            // Run axe with APCA enabled
            const axeResults = await page.evaluate(async function () {
                try {
                    // @ts-ignore
                    if (typeof axe === 'undefined') return { error: 'axe is undefined in page context' };

                    // Enable experimental APCA rules
                    // @ts-ignore
                    axe.configure({
                        rules: [{
                            id: 'color-contrast-enhanced',
                            enabled: true
                        }]
                    });

                    // @ts-ignore
                    return await axe.run({
                        runOnly: {
                            type: 'tag',
                            values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'cat.apca']
                        },
                        resultTypes: ['violations', 'passes', 'inapplicable', 'incomplete']
                    });
                } catch (err: any) {
                    return { error: err.toString() };
                }
            });

            console.log("Axe run complete.");
            if (axeResults && axeResults.passes) {
                console.log(`Found ${axeResults.passes.length} passed rules.`);
                passes = axeResults.passes.map((p: any) => ({
                    id: p.id,
                    description: p.description,
                    help: p.help,
                    nodes: p.nodes.map((n: any) => ({
                        html: n.html,
                        target: n.target,
                        failureSummary: n.failureSummary
                    }))
                }));
            } else if (axeResults && axeResults.error) {
                console.error("Axe run returned error:", axeResults.error);
            } else {
                console.warn("Axe results structure unexpected:", Object.keys(axeResults));
            }
        } catch (e) {
            console.error('Failed to capture passed audits:', e);
        }




        // --- UX Audit Collection ---

        // 1. CLS (Cumulative Layout Shift)
        // We'll trust the performance observer if it ran, or default to 0
        const clsScore = await page.evaluate(function () {
            // @ts-ignore
            return window.__cls_score || 0;
        });
        console.log(`[UX] CLS Score for ${url}:`, clsScore); // Debug log

        // 2. Tap Targets (Mobile Only - or general check)
        const tapIssues = await page.evaluate(function () {
            const issues: any[] = [];
            document.querySelectorAll('button, a, input, [role="button"]').forEach(function (el) {
                const rect = el.getBoundingClientRect();
                // Ignore hidden or tiny elements
                if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === 'none') return;

                // 44px standard (iOS)
                if (rect.width < 44 || rect.height < 44) {
                    // Generate a simple selector
                    let selector = el.tagName.toLowerCase();
                    if (el.id) selector += `#${el.id}`;
                    else if (el.className) selector += `.${el.className.split(' ')[0]}`;

                    issues.push({
                        selector,
                        text: (el.textContent || '').slice(0, 50).trim(),
                        size: { width: Math.round(rect.width), height: Math.round(rect.height) }
                    });
                }
            });
            return issues;
        });

        // 3. Readability Analysis
        // Wait for body to be populated (Hydration check)
        try {
            await page.waitForFunction(() => document.body.innerText.length > 50, { timeout: 2000 });
        } catch (e) {
            // Ignore timeout, proceed with what we have
        }

        // Extract text content and calculate Flesch-Kincaid
        const textContent = await page.evaluate(`
            (function() {
                function isVisible(elem) {
                    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
                }
                return document.body.innerText || '';
            })()
        ` as any);

        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        const sentences = cleanText.split(/[.!?]+/).length;
        const words = cleanText.split(/\s+/).length;
        const syllables = cleanText.split(/[aeiouy]+/).length; // Very rough approximation

        // Flesch-Kincaid Grade Level Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        // Clamp values to sane defaults to avoid Infinity
        const s_w = sentences > 0 ? (words / sentences) : 0;
        const syl_w = words > 0 ? (syllables / words) : 0;
        let gradeLevel = 0.39 * s_w + 11.8 * syl_w - 15.59;
        if (isNaN(gradeLevel) || gradeLevel < 0) gradeLevel = 0;

        let readabilityGrade = 'Unknown';
        if (gradeLevel <= 6) readabilityGrade = 'Easy (6th Grade)';
        else if (gradeLevel <= 10) readabilityGrade = 'Standard (High School)';
        else if (gradeLevel <= 14) readabilityGrade = 'Complex (College)';
        else readabilityGrade = 'Very Complex (Academic)';

        // Return structured object matching UxResult interface
        const readabilityResult = {
            grade: readabilityGrade,
            score: Number(gradeLevel.toFixed(1))
        };

        // 4. Viewport Check
        const viewportCheck = await page.evaluate(function () {
            const meta = document.querySelector('meta[name="viewport"]');
            if (!meta) return { isMobileFriendly: false, issues: ['No viewport meta tag found'] };
            const content = meta.getAttribute('content') || '';
            const issues: string[] = [];
            if (content.includes('user-scalable=no') || content.includes('maximum-scale')) {
                issues.push('Zooming is disabled (user-scalable=no)');
            }
            if (!content.includes('width=device-width')) {
                issues.push('Width not set to device-width');
            }
            return { isMobileFriendly: issues.length === 0, issues };
        });

        // 5. Advanced Link Audit (Broken Links + Stats)
        // We capture ALL links now
        const allLinks = await page.evaluate(function () {
            // @ts-ignore
            return Array.from(document.querySelectorAll('a[href]')).map(function (a) {
                return {
                    // @ts-ignore
                    href: (a as HTMLAnchorElement).href,
                    // @ts-ignore
                    text: (a.textContent || '').slice(0, 50).trim()
                };
            });
        });

        const uniqueLinksMap = new Map<string, { href: string; text: string }>();
        allLinks.forEach(l => {
            if (l.href.startsWith('http')) uniqueLinksMap.set(l.href, l);
        });
        const uniqueLinksList = Array.from(uniqueLinksMap.values());

        const internalLinksCount = uniqueLinksList.filter(l => l.href.startsWith(new URL(url).origin)).length;
        const externalLinksCount = uniqueLinksList.length - internalLinksCount;

        // Check status of up to 25 links (prioritizing internal)
        const linksToCheck = uniqueLinksList.sort((a, b) => {
            const aInt = a.href.startsWith(new URL(url).origin);
            const bInt = b.href.startsWith(new URL(url).origin);
            return (aInt === bInt) ? 0 : aInt ? -1 : 1;
        }).slice(0, 25);

        const brokenLinkResults: Array<{ url: string; text: string; statusCode: number; message?: string; internal: boolean }> = [];

        await Promise.all(linksToCheck.map(async (link) => {
            try {
                const res = await fetch(link.href, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
                if (res.status >= 400) {
                    brokenLinkResults.push({
                        url: link.href,
                        text: link.text,
                        statusCode: res.status,
                        message: res.statusText,
                        internal: link.href.startsWith(new URL(url).origin)
                    });
                }
            } catch (e: any) {
                // Treat fetch errors as broken (or timeout)
                brokenLinkResults.push({
                    url: link.href,
                    text: link.text,
                    statusCode: 0,
                    message: e.message || 'Network Error/Timeout',
                    internal: link.href.startsWith(new URL(url).origin)
                });
            }
        }));

        const linkAudit = {
            broken: brokenLinkResults,
            total: uniqueLinksList.length,
            internal: internalLinksCount,
            external: externalLinksCount
        };

        // 5b. SEO Meta Extraction (Enhanced with Languages & Privacy)
        const seoAndMeta = await page.evaluate(function () {
            const getMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || null;
            const getOg = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || null;

            // Language Detection
            const htmlLang = document.documentElement.getAttribute('lang') || null;
            const hreflangs = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(el => ({
                lang: el.getAttribute('hreflang') || '',
                href: el.getAttribute('href') || ''
            }));

            // Privacy Markers
            const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent?.toLowerCase() || '', href: a.getAttribute('href') }));
            const privacyKeywords = ['privacy', 'datenschutz', 'legal', 'impressum', 'terms', 'nutzungsbedingungen'];
            const privacyLink = links.find(l => privacyKeywords.some(kw => l.text.includes(kw)));

            const cookieKeywords = ['cookie', 'consent', 'akzeptieren', 'accept', 'einstellungen'];
            const hasCookieBannerHeuristic = !!document.body.innerText.toLowerCase().includes('cookie') ||
                !!document.querySelector('#cookie-banner, .cookie-banner, #consent-manager, .consent-banner');

            // --- GEO Metrics (Generative Engine Optimization) ---
            const schemaTypes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                .map(el => {
                    try {
                        const json = JSON.parse(el.textContent || '{}');
                        const type = json['@type'];
                        if (Array.isArray(type)) return type;
                        return type || null;
                    } catch (e) { return null; }
                }).flat().filter(Boolean) as string[];

            const tables = document.querySelectorAll('table').length;
            const lists = document.querySelectorAll('ul, ol').length;
            const faqSegments = document.querySelectorAll('[itemprop="mainEntity"][itemtype*="Question"], .faq-question, .faq-item, details summary').length;

            const bodyText = document.body.innerText;
            const citations = (bodyText.match(/\[\d+\]|source:|quelle:|statist\w+|%/gi) || []).length;
            const hasAuthorBio = !!document.querySelector('.author-bio, [itemprop="author"], .byline, .author-info') || bodyText.toLowerCase().includes('about the author');

            return {
                seo: {
                    title: document.title || null,
                    metaDescription: getMeta('description'),
                    h1: document.querySelector('h1')?.textContent?.trim() || null,
                    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
                    ogTitle: getOg('og:title'),
                    ogDescription: getOg('og:description'),
                    ogImage: getOg('og:image'),
                    twitterCard: getMeta('twitter:card')
                },
                geo: {
                    htmlLang,
                    hreflangs
                },
                privacy: {
                    hasPrivacyPolicy: privacyLink?.text.includes('privacy') || privacyLink?.text.includes('datenschutz') || false,
                    privacyPolicyUrl: privacyLink?.href || null,
                    hasCookieBanner: hasCookieBannerHeuristic,
                    hasTermsOfService: privacyLink?.text.includes('terms') || privacyLink?.text.includes('bedingungen') || false,
                },
                generative: {
                    schemaCoverage: [...new Set(schemaTypes)],
                    tableCount: tables,
                    listCount: lists,
                    faqCount: faqSegments,
                    citationCount: citations,
                    hasAuthorBio: hasAuthorBio,
                    listDensity: Number((lists / (document.querySelectorAll('div, section, article').length || 1)).toFixed(2))
                }
            };
        });

        const seoAudit = seoAndMeta.seo;
        const privacyAudit = seoAndMeta.privacy;

        // 5c. Geo Location Lookup & CDN Detection
        let locationData: any = null;
        if (serverIp && !serverIp.startsWith('127.') && !serverIp.startsWith('192.168.')) {
            try {
                // Using ip-api.com (Free for demo/dev)
                const geoRes = await fetch(`http://ip-api.com/json/${serverIp}`);
                const geoJson: any = await geoRes.json();
                if (geoJson.status === 'success') {
                    locationData = {
                        city: geoJson.city,
                        country: geoJson.country,
                        continent: geoJson.timezone?.split('/')[0] || 'Unknown',
                        region: geoJson.regionName
                    };
                }
            } catch (e) {
                console.error('Geo lookup failed:', e);
            }
        }

        // CDN Detection Heuristics
        const h = mainHeaders;
        let cdnProvider: string | null = null;
        if (h['cf-ray'] || h['server'] === 'cloudflare') cdnProvider = 'Cloudflare';
        else if (h['x-amz-cf-id']) cdnProvider = 'Amazon CloudFront';
        else if (h['x-fastly-request-id']) cdnProvider = 'Fastly';
        else if (h['server']?.includes('Akamai')) cdnProvider = 'Akamai';
        else if (h['x-cdn']) cdnProvider = h['x-cdn'];

        const geoAudit = {
            serverIp,
            location: locationData,
            cdn: {
                detected: !!cdnProvider,
                provider: cdnProvider
            },
            languages: seoAndMeta.geo
        };

        // 5d. GEO (Generative Engine Optimization) - Technical Checks
        let hasLlmsTxt = false;
        let hasRobotsAllowingAI = true; // Default to true if fine, or if robots.txt is missing

        try {
            const origin = new URL(url).origin;
            const llmsTxtRes = await fetch(`${origin}/llms.txt`, { method: 'HEAD' });
            hasLlmsTxt = llmsTxtRes.ok;

            const robotsRes = await fetch(`${origin}/robots.txt`);
            if (robotsRes.ok) {
                const robotsTxt = await robotsRes.text();
                // Simple check for AI bots
                const aiBots = ['GPTBot', 'PerplexityBot', 'CCBot', 'GoogleOther', 'Anthropic-AI', 'Claude-Web'];
                const blocked = aiBots.some(bot => robotsTxt.includes(`User-agent: ${bot}`) && robotsTxt.includes('Disallow: /'));
                if (blocked) hasRobotsAllowingAI = false;
            }
        } catch (e) {
            // Ignore fetch errors
        }

        // Calculate GEO Score (0-100)
        let geoScore = 50; // Starting point
        const g = seoAndMeta.generative;

        if (hasLlmsTxt) geoScore += 10;
        if (!hasRobotsAllowingAI) geoScore -= 20;
        if (g.schemaCoverage.length > 0) geoScore += 10;
        if (g.tableCount > 0) geoScore += 5;
        if (g.faqCount > 0) geoScore += 10;
        if (g.citationCount > 5) geoScore += 10;
        if (g.hasAuthorBio) geoScore += 5;

        geoScore = Math.max(0, Math.min(100, geoScore));

        const generativeAudit = {
            score: geoScore,
            technical: {
                hasLlmsTxt,
                hasRobotsAllowingAI,
                schemaCoverage: g.schemaCoverage
            },
            content: {
                faqCount: g.faqCount,
                tableCount: g.tableCount,
                listDensity: g.listDensity,
                citationDensity: g.citationCount
            },
            expertise: {
                hasAuthorBio: g.hasAuthorBio,
                hasExpertCitations: g.citationCount > 3
            }
        };



        // 6. Focus Order Detection
        const focusOrder = await page.evaluate(`
            (function() {
                function isVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
                }

                const selector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
                const elements = Array.from(document.querySelectorAll(selector));

                const focusable = elements.filter(function(el) { return isVisible(el) && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'; });

                const positiveTabIndex = focusable.filter(function(el) { return (parseInt(el.getAttribute('tabindex') || '0', 10) > 0); })
                    .sort(function(a, b) { return parseInt(a.getAttribute('tabindex') || '0', 10) - parseInt(b.getAttribute('tabindex') || '0', 10); });

                const zeroTabIndex = focusable.filter(function(el) {
                    const t = el.getAttribute('tabindex');
                    return !t || parseInt(t, 10) === 0;
                });

                const sorted = positiveTabIndex.concat(zeroTabIndex);

                return sorted.map(function(el, index) {
                    const rect = el.getBoundingClientRect();
                    return {
                        index: index + 1,
                        text: (el.innerText || el.getAttribute('aria-label') || el.tagName).slice(0, 30).trim(),
                        role: el.tagName.toLowerCase(),
                        rect: {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        }
                    };
                }).slice(0, 50);
            })()
        ` as any);

        // 7. Advanced Pro-Level Checks (Structure, Alt, Aria, Form)
        // We use a string function to avoid any transpilation/instrumentation issues (__name is not defined)
        const advancedChecksScript = `
            (function() {
                function getRect(el) {
                    const r = el.getBoundingClientRect();
                    return {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height)
                    };
                }
                
                // --- 7a. Semantic Structure Map ---
                const structureMap = [];
                document.querySelectorAll('h1, h2, h3, h4, h5, h6, nav, main, aside, footer, header').forEach(function(el) {
                    let level = 0; // Landmarks
                    if (el.tagName.startsWith('H')) level = parseInt(el.tagName[1]);
                    
                    const r = el.getBoundingClientRect();
                    structureMap.push({
                        tag: el.tagName.toLowerCase(),
                        text: (el.textContent || '').slice(0, 50).trim(),
                        level: level,
                        rect: {
                            x: Math.round(r.x),
                            y: Math.round(r.y),
                            width: Math.round(r.width),
                            height: Math.round(r.height)
                        }
                    });
                });

                // --- 7b. Touch Target Heatmap (All small elements) ---
                const touchTargets = []; 
                
                document.querySelectorAll('a, button, input, [role="button"]').forEach(function(el) {
                    const r = el.getBoundingClientRect();
                    // Ignore hidden or tiny elements
                    if (r.width === 0 || r.height === 0 || window.getComputedStyle(el).display === 'none') return;

                    if (r.width < 44 || r.height < 44) {
                        // Generate simple selector
                        let selector = el.tagName.toLowerCase();
                        if (el.id) selector += '#' + el.id;
                        else if (el.className && typeof el.className === 'string') selector += '.' + el.className.split(' ')[0];

                        touchTargets.push({
                            selector: selector,
                            element: el.tagName.toLowerCase(),
                            text: (el.textContent || '').slice(0, 50).trim(),
                            rect: {
                                x: Math.round(r.x),
                                y: Math.round(r.y),
                                width: Math.round(r.width),
                                height: Math.round(r.height)
                            },
                            size: { width: Math.round(r.width), height: Math.round(r.height) },
                            message: 'Target size ' + Math.round(r.width) + 'x' + Math.round(r.height) + 'px is too small.'
                        });
                    }
                });

                // --- 7c. Smart Alt-Text Analysis ---
                const altTextIssues = [];
                document.querySelectorAll('img').forEach(function(img) {
                    const alt = (img.getAttribute('alt') || '').trim();
                    const src = (img.getAttribute('src') || '').trim();
                    const r = img.getBoundingClientRect();
                    const rect = {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height)
                    };
                    
                    if (img.getAttribute('alt') === null) {
                        altTextIssues.push({
                            imgHtml: img.outerHTML.slice(0, 50),
                            alt: '[MISSING]',
                            rect: rect,
                            reason: 'Missing alt attribute'
                        });
                    } else if (alt === '') {
                        // Decorative
                    } else {
                        const filename = src.split('/').pop().split('?')[0] || '';
                        if (alt.toLowerCase().endsWith('.jpg') || alt.toLowerCase().endsWith('.png') || alt === filename) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text looks like a filename' });
                        } else if (['image', 'picture', 'spacer', 'white', 'logo'].indexOf(alt.toLowerCase()) !== -1) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text is generic/redundant' });
                        } else if (alt.length < 5) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text is extremely short' });
                        }
                    }
                });

                // --- 7d. ARIA Integrity ---
                const ariaIssues = [];
                document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]').forEach(function(el) {
                    ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(function(attr) {
                        if (el.hasAttribute(attr)) {
                            const ids = (el.getAttribute(attr) || '').split(' ');
                            ids.forEach(function(id) {
                                if (id && !document.getElementById(id)) {
                                    const r = el.getBoundingClientRect();
                                    ariaIssues.push({
                                        element: el.tagName.toLowerCase(),
                                        attribute: attr,
                                        value: id,
                                        rect: {
                                            x: Math.round(r.x),
                                            y: Math.round(r.y),
                                            width: Math.round(r.width),
                                            height: Math.round(r.height)
                                        },
                                        message: 'Referenced ID "' + id + '" does not exist.'
                                    });
                                }
                            });
                        }
                    });
                });

                // --- 7e. Form UX (Orphan Inputs) ---
                const formIssues = [];
                document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(function(el) {
                    const parentLabel = el.closest('label');
                    const hasId = el.id && document.querySelector('label[for="' + el.id + '"]');
                    const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
                    
                    if (!parentLabel && !hasId && !hasAriaLabel) {
                        const r = el.getBoundingClientRect();
                        formIssues.push({
                            element: el.tagName.toLowerCase(),
                            rect: {
                                x: Math.round(r.x),
                                y: Math.round(r.y),
                                width: Math.round(r.width),
                                height: Math.round(r.height)
                            },
                            message: 'Form element has no associated label.'
                        });
                    }
                });

                return { structureMap: structureMap, touchTargets: touchTargets, altTextIssues: altTextIssues, ariaIssues: ariaIssues, formIssues: formIssues };
            })();
        `;

        // Use 'any' cast to satisfy TS because evaluate expects a function usually, but accepts string in vanilla puppeteer
        // Puppeteer source: evaluate(pageFunction, ...args) -> usually function or string
        const advancedChecks = await page.evaluate(advancedChecksScript as any);

        // --- Calculate UX Score (Simple Algorithm) ---
        // 100 Base
        // CLS > 0.1: -10, > 0.25: -25
        // Console Errors: -5 per error (max -20)
        // Broken Links: -10 per link (max -30)

        let uxScore = 100;
        if (clsScore > 0.25) uxScore -= 25;
        else if (clsScore > 0.1) uxScore -= 10;

        uxScore -= Math.min(20, advancedChecks.touchTargets.length * 2);

        if (!viewportCheck.isMobileFriendly) uxScore -= 20;

        uxScore -= Math.min(20, consoleLogs.filter(l => l.type === 'error').length * 5);
        uxScore -= Math.min(30, linkAudit.broken.length * 10);

        uxScore = Math.max(0, Math.round(uxScore));

        const uxResult: ScanResult['ux'] = {
            score: uxScore,
            cls: parseFloat(clsScore.toFixed(3)),
            readability: readabilityResult,
            viewport: {
                isMobileFriendly: viewportCheck.isMobileFriendly,
                issues: viewportCheck.issues
            },
            consoleErrors: consoleLogs,
            brokenLinks: linkAudit.broken,
            focusOrder: focusOrder,
            structureMap: advancedChecks.structureMap,
            altTextIssues: advancedChecks.altTextIssues,
            ariaIssues: advancedChecks.ariaIssues,
            formIssues: advancedChecks.formIssues,
            // Replace legacy tapTargets with detailed ones
            tapTargets: {
                issues: advancedChecks.touchTargets.map((t: any) => `${t.element} (${t.size.width}x${t.size.height}px)`),
                details: advancedChecks.touchTargets
            }
        };

        const internalLinks = uniqueLinksList
            .filter(l => l.href.startsWith(new URL(url).origin)) // Only internal
            .map(l => l.href);

        const durationMs = Date.now() - startTime;
        const stats = computeStats(issues);

        return {
            id: uuidv4(),
            groupId,
            url,
            timestamp: new Date().toISOString(),
            standard,
            device,
            runners,
            issues,
            passes,
            stats,
            durationMs,
            score: calculateScore(stats),
            screenshot,
            allLinks: internalLinks,
            performance: perfData,
            eco: {
                co2: parseFloat(co2Grams.toFixed(3)),
                grade: ecoGrade,
                pageWeight: totalBytes
            },
            ux: uxResult,
            seo: seoAudit,
            links: linkAudit,
            geo: geoAudit,
            privacy: privacyAudit,
            generative: generativeAudit
        };
    } finally {
        await browser.close();
    }
}
