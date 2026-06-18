/**
 * Smoke test: cookie banner dismiss on a live URL.
 * Usage: npx tsx scripts/smoke-cookie-banner-dismiss.ts [url]
 */
import puppeteer from 'puppeteer';
import { dismissCookieBanner, registerCookieBannerHideOnNewDocument } from '@/lib/cookie-banner-dismiss';

async function main() {
    const url = process.argv[2] ?? 'https://www.pronovabkk.de/';
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await registerCookieBannerHideOnNewDocument(page);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    await dismissCookieBanner(page);
    const result = await page.evaluate(() => {
        const host = document.querySelector('#usercentrics-root');
        if (!host) return { url: location.href, usercentricsHost: false, hostHidden: true };
        const style = getComputedStyle(host);
        const hostHidden =
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity) === 0 ||
            style.maxHeight === '0px';
        return { url: location.href, usercentricsHost: true, hostHidden };
    });
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
    if (result.usercentricsHost && !result.hostHidden) {
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
