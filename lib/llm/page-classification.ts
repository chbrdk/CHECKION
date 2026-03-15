/**
 * Page classification: LLM-based themes/tags weighted by tier (1–5) from page content.
 * Each tag gets a tier; at least 5 tags per tier (25+ total).
 */

import { z } from 'zod';
import OpenAI from 'openai';
import type { ScanResult, PageClassification, TagTier } from '@/lib/types';
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

Deine Aufgabe: Erfasse **alle Themen und Aspekte** der Seite anhand des **Seiteninhalts** (nicht URL oder Struktur) und ordne jedes Thema einem **Tier (1–5)** zu – wie zentral bzw. intensiv dieses Thema auf der Seite behandelt wird.

**Tier-Bedeutung:**
- 5: Kernthema der Seite, sehr zentral und intensiv behandelt.
- 4: Wichtiges Thema, klar präsent.
- 3: Thema kommt vor, mittlere Relevanz.
- 2: Nur am Rande erwähnt oder angedeutet.
- 1: Kaum Substanz (z. B. Navigation, Footer, Boilerplate).

**Ausgabe (nur gültiges JSON, kein Text davor oder danach):**
- tagTiers: Array von Objekten { "tag": string, "tier": 1|2|3|4|5 }. Pro Tier (1, 2, 3, 4, 5) **mindestens 5 Einträge**. Also insgesamt mindestens 25 Themen/Tags. Jedes "tag" ist ein deutsches Stichwort/Thema (z. B. "Pumpen", "Technische Daten", "Kontakt", "Impressum").
- shortSummary (optional): Ein Satz auf Deutsch: "Worum geht es auf dieser Seite am ehesten?"

Wichtig: Jedes Thema nur einmal vergeben. Verschiedene Aspekte (Produktname, Kategorie, Nutzen, Zielgruppe, …) pro Tier nutzen, um auf mindestens 5 pro Tier zu kommen.`;

export function buildClassificationUserPrompt(payload: Record<string, unknown>): string {
    return `Klassifiziere diese Webseite: Alle Themen/Tags in tierTiers einordnen, mindestens 5 pro Tier (1–5). Antworte nur mit JSON: { "tagTiers": [ { "tag": string, "tier": 1|2|3|4|5 }, ... ], "shortSummary"?: string }

Seitendaten:
${JSON.stringify(payload, null, 0)}`;
}

const TagTierSchema = z.object({
    tag: z.string(),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

const PageClassificationSchema = z.object({
    tagTiers: z.array(TagTierSchema).default([]),
    shortSummary: z.string().optional(),
});

/** Legacy format (single tier + flat tags) for backward compatibility when reading from DB. */
const LegacyPageClassificationSchema = z.object({
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

const DEFAULT_FALLBACK: PageClassification = { tagTiers: [] };

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
 * Parse LLM response into PageClassification. Supports new (tagTiers) and legacy (tags + tier) format.
 */
export function parseClassificationResponse(rawContent: string): PageClassification {
    if (!rawContent?.trim()) return DEFAULT_FALLBACK;
    try {
        const jsonStr = extractJsonFromResponse(rawContent);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

        const hasLegacy = Array.isArray(parsed.tags) && typeof parsed.tier === 'number';
        const hasNew = Array.isArray(parsed.tagTiers);

        if (hasLegacy && !hasNew) {
            const legacy = LegacyPageClassificationSchema.safeParse(parsed);
            if (legacy.success) {
                const L = legacy.data;
                const tier = (typeof L.tier === 'number' && L.tier >= 1 && L.tier <= 5) ? (L.tier as 1 | 2 | 3 | 4 | 5) : 3;
                const tagTiers: TagTier[] = (Array.isArray(L.tags) ? L.tags.filter((t): t is string => typeof t === 'string').slice(0, 20) : [])
                    .map((tag) => ({ tag: tag.trim(), tier }));
                return { tagTiers, shortSummary: typeof L.shortSummary === 'string' ? L.shortSummary : undefined };
            }
        }

        if (hasNew) {
            const result = PageClassificationSchema.safeParse(parsed);
            if (result.success) {
                const d = result.data;
                const tagTiers: TagTier[] = (d.tagTiers ?? [])
                    .map((x) => ({ tag: String(x.tag).trim(), tier: x.tier }))
                    .filter((x) => x.tag.length > 0);
                return {
                    tagTiers,
                    shortSummary: typeof d.shortSummary === 'string' ? d.shortSummary : undefined,
                };
            }
        }
    } catch {
        // ignore
    }
    return DEFAULT_FALLBACK;
}
