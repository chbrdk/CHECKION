/**
 * AI-based saliency heatmap: use OpenAI Vision to detect attention regions,
 * then render a heatmap image (headlines, CTAs, images as hotspots).
 */

import OpenAI from 'openai';
import sharp from 'sharp';
import { getOpenAIKey } from '@/lib/llm/config';

const SALIENCY_VISION_MODEL = process.env.OPENAI_SALIENCY_MODEL ?? 'gpt-5-mini';

export interface AttentionRegion {
    top_pct: number;
    left_pct: number;
    width_pct: number;
    height_pct: number;
    importance: number;
}

const SALIENCY_SYSTEM_PROMPT = `You are an expert in UX and visual attention. Given a screenshot of a webpage, identify 8–20 distinct UI elements that attract user attention (headlines, hero images, CTAs, buttons, key images, nav, logos). Return ONLY a JSON array of objects, no other text. Each object must have:
- top_pct: 0–100 (distance from top of image to top of element)
- left_pct: 0–100 (distance from left to left of element)
- width_pct: 0–100 (element width as % of image width)
- height_pct: 0–100 (element height as % of image height)
- importance: 1–10 (10 = most attention-grabbing, e.g. main headline or CTA)

Example: [{"top_pct":5,"left_pct":10,"width_pct":80,"height_pct":8,"importance":9},{"top_pct":20,"left_pct":5,"width_pct":40,"height_pct":25,"importance":8}]
Return only the JSON array.`;

function parseRegionsFromContent(content: string): AttentionRegion[] {
    const trimmed = content.trim();
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    try {
        const arr = JSON.parse(jsonMatch[0]) as unknown;
        if (!Array.isArray(arr)) return [];
        return arr
            .filter(
                (r): r is AttentionRegion =>
                    typeof r === 'object' &&
                    r !== null &&
                    typeof (r as AttentionRegion).top_pct === 'number' &&
                    typeof (r as AttentionRegion).left_pct === 'number' &&
                    typeof (r as AttentionRegion).width_pct === 'number' &&
                    typeof (r as AttentionRegion).height_pct === 'number' &&
                    typeof (r as AttentionRegion).importance === 'number'
            )
            .map((r) => ({
                top_pct: Math.max(0, Math.min(100, r.top_pct)),
                left_pct: Math.max(0, Math.min(100, r.left_pct)),
                width_pct: Math.max(0.5, Math.min(100, r.width_pct)),
                height_pct: Math.max(0.5, Math.min(100, r.height_pct)),
                importance: Math.max(1, Math.min(10, r.importance)),
            }));
    } catch {
        return [];
    }
}

export async function getAttentionRegionsFromVision(
    imageBase64: string,
    imageWidth: number,
    imageHeight: number
): Promise<AttentionRegion[]> {
    const openai = new OpenAI({ apiKey: getOpenAIKey() });
    const url = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`;

    const res = await openai.chat.completions.create({
        model: SALIENCY_VISION_MODEL,
        max_tokens: 2048,
        messages: [
            { role: 'system', content: SALIENCY_SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `This screenshot is ${imageWidth}x${imageHeight} pixels. List the main attention regions as JSON array only.`,
                    },
                    {
                        type: 'image_url',
                        image_url: { url },
                    },
                ],
            },
        ],
    });

    const content = res.choices[0]?.message?.content ?? '';
    return parseRegionsFromContent(content);
}

/** Jet-like colormap: 0 = blue, 0.5 = green, 1 = red (same idea as Python heatmap). */
function jetRgb(t: number): [number, number, number] {
    const x = Math.max(0, Math.min(1, t));
    const r = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.75))));
    const g = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.5))));
    const b = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.25))));
    return [r, g, b];
}

/**
 * Render a heatmap PNG from attention regions: Gaussian blobs at each region,
 * intensity = importance, then jet colormap. Returns base64 PNG string.
 */
export async function renderHeatmapFromRegions(
    regions: AttentionRegion[],
    width: number,
    height: number
): Promise<string> {
    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;
    const heat = new Float32Array(size);
    const gamma = 0.4;

    for (const r of regions) {
        const cx = ((r.left_pct + r.width_pct / 2) / 100) * w;
        const cy = ((r.top_pct + r.height_pct / 2) / 100) * h;
        const sigma = (Math.min(r.width_pct, r.height_pct) / 100) * Math.min(w, h) * 0.35;
        const sigma2 = 2 * sigma * sigma;
        const amp = r.importance / 10;

        const x0 = Math.max(0, Math.floor(cx - sigma * 3));
        const x1 = Math.min(w, Math.ceil(cx + sigma * 3));
        const y0 = Math.max(0, Math.floor(cy - sigma * 3));
        const y1 = Math.min(h, Math.ceil(cy + sigma * 3));

        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const g = amp * Math.exp(-(dx * dx + dy * dy) / sigma2);
                heat[y * w + x] += g;
            }
        }
    }

    let maxVal = 0;
    for (let i = 0; i < size; i++) if (heat[i] > maxVal) maxVal = heat[i];
    if (maxVal <= 0) maxVal = 1;

    const rgb = Buffer.alloc(size * 3);
    for (let i = 0; i < size; i++) {
        let v = heat[i] / maxVal;
        v = Math.pow(v, gamma);
        const [r, g, b] = jetRgb(v);
        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = b;
    }

    const png = await sharp(rgb, {
        raw: { width: w, height: h, channels: 3 },
    })
        .png()
        .toBuffer();

    return png.toString('base64');
}
