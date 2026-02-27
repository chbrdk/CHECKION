/**
 * Tests for scanpath heuristic. Run: npx tsx lib/scanpath.test.ts
 */
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { intensityToJetPng } from './saliency-fusion';
import { computeScanpath } from './scanpath';
import type { PageIndex } from './types';

const url = 'https://example.com/';

async function run(): Promise<void> {
    const w = 100;
    const h = 80;

    // Heatmap with two hotspots: top-left (15,15) and lower-right (70,50). F-pattern prefers top.
    const intensity = new Float32Array(w * h);
    const hot1 = 15 * w + 15;
    const hot2 = 50 * w + 70;
    intensity[hot1] = 0.9;
    intensity[hot2] = 0.95;
    // Small neighborhood so they are local maxima (5x5 window)
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const i1 = (15 + dy) * w + (15 + dx);
            const i2 = (50 + dy) * w + (70 + dx);
            if (i1 >= 0 && i1 < intensity.length) intensity[i1] = 0.5;
            if (i2 >= 0 && i2 < intensity.length) intensity[i2] = 0.5;
        }
    }
    intensity[hot1] = 0.9;
    intensity[hot2] = 0.95;

    const pngBuffer = await intensityToJetPng(intensity, w, h);
    const heatmapBase64 = pngBuffer.toString('base64');

    const region1Id = uuidv4();
    const region2Id = uuidv4();
    const pageIndex: PageIndex = {
        url,
        viewportHeight: 600,
        regions: [
            {
                id: region1Id,
                tag: 'nav',
                headingText: 'Nav',
                level: 0,
                rect: { x: 10, y: 10, width: 20, height: 20 },
                indexInDocument: 0,
                aboveFold: true,
                findabilityScore: 2,
                semanticType: 'nav',
            },
            {
                id: region2Id,
                tag: 'main',
                headingText: 'Main',
                level: 1,
                rect: { x: 60, y: 40, width: 25, height: 25 },
                indexInDocument: 1,
                aboveFold: false,
                findabilityScore: 1.5,
            },
        ],
    };

    const scanpath = await computeScanpath({
        heatmapPngBase64: heatmapBase64,
        pageIndex,
        width: w,
        height: h,
        maxFixations: 5,
        iorRadius: 15,
    });

    assert.ok(scanpath.length >= 1 && scanpath.length <= 5, 'scanpath has 1–5 fixations');
    assert.strictEqual(scanpath[0].order, 1, 'first fixation has order 1');
    assert.ok(scanpath[0].x >= 0 && scanpath[0].x < w && scanpath[0].y >= 0 && scanpath[0].y < h, 'first fixation in bounds');
    assert.ok(typeof scanpath[0].saliency === 'number' || scanpath[0].saliency === undefined, 'saliency optional');

    // First fixation should be top-left (15,15) due to F-pattern; second lower-right (70,50)
    const first = scanpath[0];
    assert.ok(first.x >= 10 && first.x <= 25 && first.y >= 10 && first.y <= 25, 'first fixation near top-left hotspot');
    if (scanpath.length >= 2) {
        const second = scanpath[1];
        assert.strictEqual(second.order, 2, 'second has order 2');
        assert.ok(second.x >= 60 && second.x <= 85 && second.y >= 40 && second.y <= 65, 'second fixation near lower-right hotspot');
    }

    // IoR: with single hotspot we get one fixation only
    const singleIntensity = new Float32Array(w * h);
    singleIntensity[hot1] = 1;
    const singlePng = await intensityToJetPng(singleIntensity, w, h);
    const singlePath = await computeScanpath({
        heatmapPngBase64: singlePng.toString('base64'),
        pageIndex,
        width: w,
        height: h,
        maxFixations: 5,
        iorRadius: 50,
    });
    assert.ok(singlePath.length >= 1, 'single hotspot yields at least one fixation');

    // Empty heatmap / invalid base64 returns []
    const emptyPath = await computeScanpath({
        heatmapPngBase64: '',
        pageIndex,
        width: w,
        height: h,
    });
    assert.strictEqual(emptyPath.length, 0, 'empty base64 returns no fixations');

    console.log('scanpath tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
