import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-api-token';
import { reportUsage } from '@/lib/usage-report';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');
    const selector = searchParams.get('selector') || 'body'; // Default to body
    const type = searchParams.get('type') || 'text'; // 'text' or 'html'

    if (!url) {
        return apiError('URL is required', API_STATUS.BAD_REQUEST);
    }

    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Block resources for speed
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Wait for selector if specific one requested
        if (selector !== 'body') {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
            } catch (e) {
                // Ignore timeout, try to scrape anyway
            }
        }

        const data = await page.evaluate(
            (sel: string, t: string) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                return t === 'html' ? (el as HTMLElement).outerHTML : (el as HTMLElement).innerText;
            },
            selector,
            type
        );

        await browser.close();

        if (!data) {
            return apiError('Selector not found', API_STATUS.NOT_FOUND, { selector });
        }

        const user = await getRequestUser(req);
        if (user) {
            reportUsage({
                userId: user.id,
                eventType: 'tool_extract',
                rawUnits: { requests: 1 },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                url,
                selector,
                type,
                content: data
            }
        });

    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
