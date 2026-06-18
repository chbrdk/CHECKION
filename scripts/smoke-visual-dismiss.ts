/**
 * Smoke test: visual dismiss before/after on a live URL.
 * Usage: npx tsx scripts/smoke-visual-dismiss.ts [url]
 * Writes screenshots to tmp/visual-dismiss-smoke/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import {
  createScanPage,
  dismissVisualInterruptions,
  wireVisualDismissForBrowser,
} from '@/lib/scan-visual-dismiss';

const OUT_DIR = join(process.cwd(), 'tmp', 'visual-dismiss-smoke');

async function countBlockingOverlays(page: import('puppeteer').Page) {
  return page.evaluate(() => {
    const blockers: Array<{ role: string | null; id: string; className: string }> = [];
    const nodes = document.querySelectorAll('[role="dialog"],[role="alertdialog"],dialog,[aria-modal="true"]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i] as HTMLElement;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
      if (el.offsetParent === null && s.position !== 'fixed') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 40) continue;
      const z = parseInt(s.zIndex, 10);
      if (!((s.position === 'fixed' || s.position === 'sticky' || z >= 100) && rect.top < window.innerHeight * 0.85)) continue;
      blockers.push({
        role: el.getAttribute('role'),
        id: el.id,
        className: String(el.className).slice(0, 60),
      });
    }

    const uc = document.querySelector('#usercentrics-root');
    let usercentricsVisible = false;
    if (uc) {
      const us = getComputedStyle(uc);
      usercentricsVisible = us.display !== 'none' && us.visibility !== 'hidden' && Number(us.opacity) > 0;
    }

    const chatSels = ['#intercom-container', '#drift-widget', '#hubspot-messages-iframe-container', '.crisp-client'];
    const chats = chatSels.map((sel) => ({ sel, present: Boolean(document.querySelector(sel)) }));

    return { usercentricsVisible, blockers, chats };
  });
}

async function main() {
  const url = process.argv[2] ?? 'https://www.pronovabkk.de/';
  mkdirSync(OUT_DIR, { recursive: true });
  const slug = new URL(url).hostname.replace(/\./g, '-');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  wireVisualDismissForBrowser(browser);
  const page = await createScanPage(browser);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 1500));

  const before = await countBlockingOverlays(page);
  const beforeShot = (await page.screenshot({ fullPage: false, type: 'jpeg', quality: 80 })) as Buffer;
  writeFileSync(join(OUT_DIR, `${slug}-before.jpg`), beforeShot);

  await dismissVisualInterruptions(page);

  const after = await countBlockingOverlays(page);
  const afterShot = (await page.screenshot({ fullPage: false, type: 'jpeg', quality: 80 })) as Buffer;
  writeFileSync(join(OUT_DIR, `${slug}-after.jpg`), afterShot);

  const report = { url, before, after, screenshots: OUT_DIR };
  writeFileSync(join(OUT_DIR, `${slug}-report.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();

  const failed = after.usercentricsVisible;
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
