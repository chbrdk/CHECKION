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
    await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        window.__cls_score = 0;
        // @ts-ignore
        new PerformanceObserver((entryList) => {
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
    // Enable request interception or just listen to responses for size
    await page.setRequestInterception(false); // We don't need to block, just listen
    page.on('response', async (response) => {
        try {
            // Getting buffer might fail for some resources (CORS, etc), heuristic fallback
            const headers = response.headers();
            if (headers['content-length']) {
                totalBytes += parseInt(headers['content-length'], 10);
            } else {
                // Fallback: This is expensive and might fail, skip for now to save time/stability
                // const buf = await response.buffer();
                // totalBytes += buf.length;
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
        await page.evaluate(async () => {
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
        const perfData = await page.evaluate(() => {
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
                    const box = await page.evaluate((sel) => {
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
            const axeResults = await page.evaluate(async () => {
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
        const clsScore = await page.evaluate(() => {
            // @ts-ignore
            return window.__cls_score || 0;
        });
        console.log(`[UX] CLS Score for ${url}:`, clsScore); // Debug log

        // 2. Tap Targets (Mobile Only - or general check)
        const tapIssues = await page.evaluate(() => {
            const issues: any[] = [];
            document.querySelectorAll('button, a, input, [role="button"]').forEach((el) => {
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
        const textContent = await page.evaluate(() => {
            // Helper to get visible text only
            const isVisible = (elem: HTMLElement) => !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
            return document.body.innerText || '';
        });

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
        const viewportCheck = await page.evaluate(() => {
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

        // 5. Broken Link Checker (Node-side Fetch)
        const brokenLinks: Array<{ href: string; status: number; text: string }> = [];
        let uniqueLinks: Array<{ href: string; text: string }> = [];
        try {
            const links = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a[href]')).map(a => ({
                    href: (a as HTMLAnchorElement).href,
                    text: (a.textContent || '').slice(0, 30).trim()
                }));
            });

            // Filter unique, http/https only, take top 15
            uniqueLinks = Array.from(new Map(links.map(item => [item.href, item])).values())
                .filter(l => l.href.startsWith('http'))
                .slice(0, 15);

            await Promise.all(uniqueLinks.map(async (link) => {
                try {
                    const res = await fetch(link.href, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                    if (res.status >= 400) {
                        brokenLinks.push({ href: link.href, status: res.status, text: link.text });
                    }
                } catch (e) {
                    // Treat fetch errors as broken (or timeout)
                    brokenLinks.push({ href: link.href, status: 0, text: link.text });
                }
            }));
        } catch (e) {
            console.error('Link check failed:', e);
        }

        // --- Calculate UX Score (Simple Algorithm) ---
        // 100 Base
        // CLS > 0.1: -10, > 0.25: -25
        // Tap Issues: -2 per issue (max -20)
        // Zoom disabled: -20
        // Console Errors: -5 per error (max -20)
        // Broken Links: -10 per link (max -30)

        let uxScore = 100;
        if (clsScore > 0.25) uxScore -= 25;
        else if (clsScore > 0.1) uxScore -= 10;

        uxScore -= Math.min(20, tapIssues.length * 2);

        if (!viewportCheck.isMobileFriendly) uxScore -= 20;

        uxScore -= Math.min(20, consoleLogs.filter(l => l.type === 'error').length * 5);
        uxScore -= Math.min(30, brokenLinks.length * 10);

        uxScore = Math.max(0, Math.round(uxScore));

        const uxResult: ScanResult['ux'] = {
            score: uxScore,
            cls: parseFloat(clsScore.toFixed(3)),
            readability: readabilityResult,
            tapTargets: { issues: tapIssues },
            viewport: viewportCheck,
            consoleErrors: consoleLogs,
            brokenLinks: brokenLinks
        };

        const internalLinks = uniqueLinks
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
            links: internalLinks,
            performance: perfData,
            eco: {
                co2: parseFloat(co2Grams.toFixed(3)),
                grade: ecoGrade,
                pageWeight: totalBytes
            },
            ux: uxResult
        };
    } finally {
        await browser.close();
    }
}
