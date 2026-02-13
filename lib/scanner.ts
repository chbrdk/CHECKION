/* ------------------------------------------------------------------ */
/*  CHECKION – Pa11y + axe-core scanner wrapper                       */
/* ------------------------------------------------------------------ */

import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { Issue, Runner, ScanResult, ScanStats, WcagStandard, Device } from './types';

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

            // Run axe
            const axeResults = await page.evaluate(async () => {
                try {
                    // @ts-ignore
                    if (typeof axe === 'undefined') return { error: 'axe is undefined in page context' };
                    // @ts-ignore
                    return await axe.run({
                        runOnly: {
                            type: 'tag',
                            values: ['wcag2a', 'wcag2aa', 'wcag2aaa']
                        }
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
        };
    } finally {
        await browser.close();
    }
}
