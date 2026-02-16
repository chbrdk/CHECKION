/**
 * Simple tests for page-index. Run: npx tsx lib/page-index.test.ts
 */
import assert from 'node:assert';
import { buildPageIndex, enrichPageIndexWithSaliency } from './page-index';
import type { StructureNode } from './types';

const viewportHeight = 800;
const url = 'https://example.com/';

async function run(): Promise<void> {
    // Empty structureMap -> empty regions
    const empty = buildPageIndex([], viewportHeight, url);
    assert.strictEqual(empty.url, url);
    assert.strictEqual(empty.viewportHeight, viewportHeight);
    assert.strictEqual(empty.regions.length, 0);

    // One heading above the fold
    const above: StructureNode[] = [
        { tag: 'h1', text: 'Welcome', level: 1, rect: { x: 0, y: 100, width: 800, height: 80 } },
    ];
    const indexAbove = buildPageIndex(above, viewportHeight, url);
    assert.strictEqual(indexAbove.regions.length, 1);
    assert.strictEqual(indexAbove.regions[0].aboveFold, true);
    assert.strictEqual(indexAbove.regions[0].headingText, 'Welcome');
    assert.ok(indexAbove.regions[0].findabilityScore > 0);

    // Semantic type from heading text
    const pricing: StructureNode[] = [
        { tag: 'h2', text: 'Preisübersicht', level: 2, rect: { x: 0, y: 500, width: 800, height: 40 } },
    ];
    const indexPricing = buildPageIndex(pricing, viewportHeight, url);
    assert.strictEqual(indexPricing.regions[0].semanticType, 'pricing');

    // Landmark -> semantic type
    const nav: StructureNode[] = [
        { tag: 'nav', text: 'Navigation', level: 0, rect: { x: 0, y: 0, width: 800, height: 60 } },
    ];
    const indexNav = buildPageIndex(nav, viewportHeight, url);
    assert.strictEqual(indexNav.regions[0].semanticType, 'nav');

    // Below the fold
    const below: StructureNode[] = [
        { tag: 'h2', text: 'FAQ', level: 2, rect: { x: 0, y: 900, width: 800, height: 40 } },
    ];
    const indexBelow = buildPageIndex(below, viewportHeight, url);
    assert.strictEqual(indexBelow.regions[0].aboveFold, false);
    assert.strictEqual(indexBelow.regions[0].semanticType, 'faq');

    // enrichPageIndexWithSaliency: empty input returns same pageIndex
    const emptyEnriched = await enrichPageIndexWithSaliency(indexAbove, '');
    assert.strictEqual(emptyEnriched.regions.length, indexAbove.regions.length);
    assert.strictEqual(emptyEnriched.regions[0].saliencyProminence, undefined);

    // Button (level 7) and paragraph (level 8) get lower findability than headings
    const buttonAndP: StructureNode[] = [
        { tag: 'button', text: 'Jetzt kaufen', level: 7, rect: { x: 0, y: 200, width: 120, height: 40 } },
        { tag: 'p', text: 'Das Produkt ist nur hier erwähnt.', level: 8, rect: { x: 0, y: 300, width: 400, height: 24 } },
    ];
    const indexButtonP = buildPageIndex(buttonAndP, viewportHeight, url);
    assert.strictEqual(indexButtonP.regions.length, 2);
    assert.strictEqual(indexButtonP.regions[0].tag, 'button');
    assert.strictEqual(indexButtonP.regions[1].tag, 'p');
    assert.ok(indexButtonP.regions[0].findabilityScore > indexButtonP.regions[1].findabilityScore, 'button findability > paragraph');

    console.log('page-index tests passed');
}

run().catch((err) => { console.error(err); process.exit(1); });
