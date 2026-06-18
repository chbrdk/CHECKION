/**
 * Smoke: skip-link detection on a live URL.
 * Usage: npx tsx scripts/smoke-skip-link.ts [url]
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
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissVisualInterruptions(page);

  const result = await detectSkipLinkOnPage(page);
  console.log(JSON.stringify({ url, ...result }, null, 2));
  await browser.close();

  if (!result.hasSkipLink) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
