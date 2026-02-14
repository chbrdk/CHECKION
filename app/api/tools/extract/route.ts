import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');
    const selector = searchParams.get('selector') || 'body'; // Default to body
    const type = searchParams.get('type') || 'text'; // 'text' or 'html'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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

        const data = await page.evaluate((sel, t) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            // @ts-ignore
            return t === 'html' ? el.outerHTML : el.innerText;
        }, selector, type);

        await browser.close();

        if (!data) {
            return NextResponse.json({ error: 'Selector not found', selector }, { status: 404 });
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
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
