/**
 * Debug skip-link detection on a live URL.
 * Usage: npx tsx scripts/debug-skip-link.ts [url]
 */
import puppeteer from 'puppeteer';
import { detectSkipLinkOnPage } from '@/lib/skip-link-detect';
import {
  createScanPage,
  dismissVisualInterruptions,
  wireVisualDismissForBrowser,
} from '@/lib/scan-visual-dismiss';

async function main() {
  const url = process.argv[2] ?? 'https://www.pronovabkk.de/';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  wireVisualDismissForBrowser(browser);
  const page = await createScanPage(browser);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
  await dismissVisualInterruptions(page);

  const detected = await detectSkipLinkOnPage(page);
  const result = await page.evaluate(() => {
    const skipKeywords = [
      'skip',
      'springen',
      'content',
      'main',
      'zum inhalt',
      'inhaltsverzeichnis',
      'navigation überspringen',
    ];
    const hashLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
    const allLinks = Array.from(document.querySelectorAll('a'));
    const keywordMatches = allLinks
      .filter((a) => {
        const text = (a.textContent || '').toLowerCase().trim();
        const ariaLabel = (a.getAttribute('aria-label') || '').toLowerCase();
        const combined = `${text} ${ariaLabel}`;
        return skipKeywords.some((kw) => combined.includes(kw));
      })
      .map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent || '').trim().slice(0, 100),
        ariaLabel: a.getAttribute('aria-label'),
        className: a.className,
        id: a.id,
      }));

    const currentLogic = hashLinks
      .map((a) => {
        const href = (a.getAttribute('href') || '').trim();
        const text = (a.textContent || '').toLowerCase().trim();
        const ariaLabel = (a.getAttribute('aria-label') || '').toLowerCase();
        const combined = `${text} ${ariaLabel}`;
        const looksLikeSkip = skipKeywords.some((kw) => combined.includes(kw));
        return { href, text: text.slice(0, 80), ariaLabel, looksLikeSkip, hrefLen: href.length };
      })
      .filter((x) => x.looksLikeSkip || x.href.toLowerCase().includes('main') || x.href.toLowerCase().includes('content'));

    const srOnly = Array.from(
      document.querySelectorAll(
        '[class*="sr-only" i], [class*="visually-hidden" i], [class*="screen-reader" i], .skip-link, [class*="skip" i]'
      )
    );
    const mainTargets = document.querySelectorAll('main, [role="main"], #main, #maincontent, #content, #inhalt');
    const skipLikeElements = Array.from(document.querySelectorAll('a, button, [role="link"]')).filter((el) => {
      const href = el.getAttribute('href') || '';
      const text = (el.textContent || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      const combined = `${text} ${aria} ${title} ${cls} ${href}`;
      return /skip|springen|hauptinhalt|inhalt|main|content|navigation/.test(combined);
    }).map((el) => ({
      tag: el.tagName,
      href: el.getAttribute('href'),
      text: (el.textContent || '').trim().slice(0, 100),
      ariaLabel: el.getAttribute('aria-label'),
      className: el.className,
      id: el.id,
    }));

    return {
      hashLinkCount: hashLinks.length,
      keywordMatchCount: keywordMatches.length,
      keywordMatches,
      skipLikeElements,
      srOnlyCount: srOnly.length,
      srOnlySample: srOnly.slice(0, 10).map((el) => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 80),
        className: el.className,
        href: el.getAttribute?.('href'),
      })),
      mainTargetIds: Array.from(mainTargets).map((el) => ({ tag: el.tagName, id: el.id, role: el.getAttribute('role') })),
      currentLogicMatches: currentLogic.filter((x) => x.looksLikeSkip && x.hrefLen > 1),
      hashLinksEarly: hashLinks.slice(0, 20).map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent || '').trim().slice(0, 60),
        aria: a.getAttribute('aria-label'),
      })),
    };
  });

  console.log(JSON.stringify({ detected, ...result }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
