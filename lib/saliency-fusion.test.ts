/**
 * Tests for saliency-fusion. Run: npx tsx lib/saliency-fusion.test.ts
 */
import assert from 'node:assert';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
    buildStructureAttentionMap,
    buildContrastAttentionMap,
    buildVisionPriorMap,
    decodeJetPngToIntensity,
    fuseSaliencyHeatmap,
    intensityToJetPng,
    renderStructureOnlyHeatmap,
} from './saliency-fusion';
import type { PageIndex } from './types';

const url = 'https://example.com/';

async function run(): Promise<void> {
    const w = 100;
    const h = 80;

    // buildStructureAttentionMap: one region with rect -> elevated values in rect, normalized to [0,1]
    const pageIndex: PageIndex = {
        url,
        viewportHeight: 600,
        regions: [
            {
                id: uuidv4(),
                tag: 'h1',
                headingText: 'Title',
                level: 1,
                rect: { x: 10, y: 10, width: 30, height: 20 },
                indexInDocument: 0,
                aboveFold: true,
                findabilityScore: 2.5,
                semanticType: 'hero',
            },
        ],
    };
    const structureMap = buildStructureAttentionMap(pageIndex, w, h);
    assert.strictEqual(structureMap.length, w * h);
    let maxVal = 0;
    let sumVal = 0;
    for (let i = 0; i < structureMap.length; i++) {
        if (structureMap[i] > maxVal) maxVal = structureMap[i];
        sumVal += structureMap[i];
    }
    assert.ok(maxVal <= 1 + 1e-6, 'structure map normalized to [0,1]');
    assert.ok(sumVal > 0, 'structure map has some mass');
    const centerY = 10 + 20 / 2;
    const centerX = 10 + 30 / 2;
    const centerIdx = Math.floor(centerY) * w + Math.floor(centerX);
    assert.ok(structureMap[centerIdx] > 0.1, 'center of rect has elevated value');
    const leftEdgeIdx = 15 * w + 12;
    const rightEdgeIdx = 25 * w + 38;
    assert.ok(structureMap[leftEdgeIdx] > 0.1, 'left edge of rect filled');
    assert.ok(structureMap[rightEdgeIdx] > 0.1, 'right edge of rect filled (full rect)');
    assert.strictEqual(structureMap[0], 0, 'pixel outside rect is zero');

    // buildVisionPriorMap: one region -> blob, normalized
    const visionRegions = [
        { top_pct: 10, left_pct: 20, width_pct: 30, height_pct: 15, importance: 8 },
    ];
    const visionMap = buildVisionPriorMap(visionRegions, w, h);
    assert.strictEqual(visionMap.length, w * h);
    maxVal = 0;
    for (let i = 0; i < visionMap.length; i++) if (visionMap[i] > maxVal) maxVal = visionMap[i];
    assert.ok(maxVal <= 1 + 1e-6, 'vision map normalized');

    // decodeJetPngToIntensity / intensityToJetPng roundtrip: create tiny PNG, decode, re-encode
    const redRgb = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
        redRgb[i * 3] = 255;
        redRgb[i * 3 + 1] = 0;
        redRgb[i * 3 + 2] = 0;
    }
    const pngBuffer = await sharp(redRgb, { raw: { width: w, height: h, channels: 3 } })
        .png()
        .toBuffer();
    const { intensity, width: decW, height: decH } = await decodeJetPngToIntensity(pngBuffer);
    assert.strictEqual(decW, w);
    assert.strictEqual(decH, h);
    assert.ok(intensity[0] > 0.9, 'R channel decoded as high intensity');
    const reencoded = await intensityToJetPng(intensity, decW, decH);
    assert.ok(Buffer.isBuffer(reencoded) && reencoded.length > 0, 'roundtrip yields PNG buffer');

    // fuseSaliencyHeatmap: SUM PNG + no pageIndex + no vision -> returns base64
    const sumB64 = pngBuffer.toString('base64');
    const fusedB64 = await fuseSaliencyHeatmap({
        sumHeatmapPngBase64: sumB64,
        width: w,
        height: h,
    });
    assert.strictEqual(typeof fusedB64, 'string');
    assert.ok(fusedB64.length > 0);
    assert.ok(/^[A-Za-z0-9+/=]+$/.test(fusedB64), 'valid base64');

    // fuseSaliencyHeatmap: with pageIndex (structure) -> still valid base64
    const fusedWithStructure = await fuseSaliencyHeatmap({
        sumHeatmapPngBase64: sumB64,
        pageIndex,
        structureWeight: 0.25,
        width: w,
        height: h,
    });
    assert.ok(fusedWithStructure.length > 0 && /^[A-Za-z0-9+/=]+$/.test(fusedWithStructure));

    // buildContrastAttentionMap: small image + one region -> map same size, normalized
    const smallW = 20;
    const smallH = 20;
    const smallRgb = Buffer.alloc(smallW * smallH * 3);
    for (let i = 0; i < smallW * smallH; i++) {
        smallRgb[i * 3] = 100;
        smallRgb[i * 3 + 1] = 100;
        smallRgb[i * 3 + 2] = 100;
    }
    const smallPng = await sharp(smallRgb, { raw: { width: smallW, height: smallH, channels: 3 } })
        .png()
        .toBuffer();
    const pageIndexSmall: PageIndex = {
        url,
        viewportHeight: 400,
        regions: [
            {
                id: uuidv4(),
                tag: 'h1',
                headingText: 'Test',
                level: 1,
                rect: { x: 2, y: 2, width: 8, height: 8 },
                indexInDocument: 0,
                aboveFold: true,
                findabilityScore: 1,
            },
        ],
    };
    const contrastMap = await buildContrastAttentionMap(smallPng, pageIndexSmall, smallW, smallH);
    assert.strictEqual(contrastMap.length, smallW * smallH);
    let contrastMax = 0;
    for (let i = 0; i < contrastMap.length; i++) if (contrastMap[i] > contrastMax) contrastMax = contrastMap[i];
    assert.ok(contrastMax <= 1 + 1e-6, 'contrast map normalized');

    // renderStructureOnlyHeatmap: no SUM, structure only -> full-page base64 PNG
    const structureOnlyB64 = await renderStructureOnlyHeatmap({
        pageIndex,
        width: w,
        height: h,
        structureWeight: 1,
    });
    assert.strictEqual(typeof structureOnlyB64, 'string');
    assert.ok(structureOnlyB64.length > 0);
    assert.ok(/^[A-Za-z0-9+/=]+$/.test(structureOnlyB64), 'structure-only yields valid base64');
    const decoded = await decodeJetPngToIntensity(Buffer.from(structureOnlyB64, 'base64'));
    assert.strictEqual(decoded.width, w);
    assert.strictEqual(decoded.height, h);

    console.log('saliency-fusion tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
