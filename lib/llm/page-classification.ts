/**
 * Page classification: LLM-based tags and content tier (1–5) from page content.
 * Tier is content-based only (not URL/structure).
 */

import { z } from 'zod';
import OpenAI from 'openai';
import type { ScanResult, PageClassification } from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';

const BODY_EXCERPT_MAX = 2000;

export function buildClassificationPayload(result: ScanResult): Record<string, unknown> {
    const body = (result.bodyTextExcerpt ?? '').slice(0, BODY_EXCERPT_MAX);
    return {
        url: result.url,
        title: result.seo?.title ?? undefined,
        h1: result.seo?.h1 ?? undefined,
        metaDescription: result.seo?.metaDescription?.slice(0, 200) ?? undefined,
        bodyExcerpt: body || undefined,
    };
}

export const CLASSIFICATION_SYSTEM_PROMPT = `Du bist ein Experte für die inhaltliche Einordnung von Webseiten.

Deine Aufgabe: Beurteile ausschließlich anhand des **Seiteninhalts** (nicht anhand der URL oder der Struktur der Website), worum es auf der Seite geht, und wie zentral bzw. intensiv dieses Thema auf der Seite behandelt wird.

**Ausgabe (nur gültiges JSON, kein Text davor oder danach):**
- tags: Array von deutschen Stichwörtern/Themen (z. B. ["Pumpen", "Technische Daten", "Produktübersicht"]). Maximal 8 Tags.
- tier: Zahl 1 bis 5 – inhaltliche Zentralität/Intensität des Hauptthemas auf dieser Seite:
  - 5: Seite ist klar und stark einem Kernthema gewidmet, Inhalt dicht und fokussiert.
  - 4: Eindeutig ein Thema, etwas weniger dicht oder mit mehr Kontext.
  - 3: Mehrere Themen oder Mischung, kein klares Hauptthema.
  - 2: Nur am Rande thematisch, wenig inhaltliche Tiefe.
  - 1: Kaum inhaltliche Substanz (z. B. Boilerplate, Navigation, Footer).
- shortSummary (optional): Ein Satz auf Deutsch: "Worum geht es auf dieser Seite am ehesten?"

Wichtig: Das Tier leitest du nur aus dem Inhalt ab, nicht aus der URL oder der Position in der Site-Struktur.`;

export function buildClassificationUserPrompt(payload: Record<string, unknown>): string {
    return `Klassifiziere diese Webseite anhand des Inhalts. Antworte nur mit einem JSON-Objekt: { "tags": string[], "tier": 1|2|3|4|5, "shortSummary"?: string }

Seitendaten:
${JSON.stringify(payload, null, 0)}`;
}

const PageClassificationSchema = z.object({
    tags: z.array(z.string()).default([]),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(3),
    shortSummary: z.string().optional(),
});

export function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    return trimmed;
}

const DEFAULT_FALLBACK: PageClassification = { tags: [], tier: 3 };

const MIN_BODY_LENGTH = 50;

/**
 * Run LLM classification for a single scan result. Used by scanner (single scan / deep scan).
 * Returns null if bodyTextExcerpt too short, OpenAI not configured, or on error (never throws).
 */
export async function classifyPageWithLlm(result: ScanResult): Promise<PageClassification | null> {
    const excerpt = (result.bodyTextExcerpt ?? '').trim();
    if (excerpt.length < MIN_BODY_LENGTH) return null;
    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return null;
    }
    try {
        const payload = buildClassificationPayload(result);
        const userPrompt = buildClassificationUserPrompt(payload);
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        });
        const rawContent = completion.choices[0]?.message?.content ?? '';
        return parseClassificationResponse(rawContent);
    } catch {
        return null;
    }
}

/**
 * Parse LLM response into PageClassification. Returns fallback (tier 3, empty tags) on parse/validation error.
 */
export function parseClassificationResponse(rawContent: string): PageClassification {
    if (!rawContent?.trim()) return DEFAULT_FALLBACK;
    try {
        const jsonStr = extractJsonFromResponse(rawContent);
        const parsed = JSON.parse(jsonStr) as unknown;
        const result = PageClassificationSchema.safeParse(parsed);
        if (result.success) {
            const d = result.data;
            const tier = (typeof d.tier === 'number' && d.tier >= 1 && d.tier <= 5)
                ? (d.tier as 1 | 2 | 3 | 4 | 5)
                : 3;
            return {
                tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string').slice(0, 8) : [],
                tier,
                shortSummary: typeof d.shortSummary === 'string' ? d.shortSummary : undefined,
            };
        }
    } catch {
        // ignore
    }
    return DEFAULT_FALLBACK;
}
