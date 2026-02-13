
import puppeteer from 'puppeteer';

async function runDebug() {
    const url = 'https://www.msqdx.com/en/insights';
    console.log(`Debugging UX Metrics for ${url}...`);

    const browser = await puppeteer.launch({
        headless: true, // New headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Inject CLS Observer
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
                    // @ts-ignore
                    console.log('CLS Entry:', entry.value, window.__cls_score);
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
    });

    console.log('Navigating...');
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Scroll to trigger CLS
    console.log('Scrolling...');
    await page.evaluate(async () => {
        const distance = 100;
        const totalHeight = document.body.scrollHeight;
        let currentScroll = 0;
        while ((window.innerHeight + currentScroll) < totalHeight) {
            window.scrollBy(0, distance);
            currentScroll += distance;
            await new Promise((resolve) => setTimeout(resolve, 50));
            if (currentScroll > 5000) break;
        }
        window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 1000));

    // 1. Check CLS
    const clsScore = await page.evaluate(() => {
        // @ts-ignore
        return window.__cls_score || 0;
    });
    console.log('CLS Score:', clsScore);

    // 2. Check Readability (Inner Text)
    const textContent = await page.evaluate(() => document.body.innerText || '');
    console.log('Text Content Length:', textContent.length);
    console.log('Text Snippet:', textContent.slice(0, 200).replace(/\s+/g, ' '));

    // Calculate grade
    const cleanText = textContent.replace(/\s+/g, ' ').trim();
    const sentences = cleanText.split(/[.!?]+/).length;
    const words = cleanText.split(/\s+/).length;
    const syllables = cleanText.split(/[aeiouy]+/).length;
    console.log('Stats:', { sentences, words, syllables });

    await browser.close();
}

runDebug().catch(console.error);
