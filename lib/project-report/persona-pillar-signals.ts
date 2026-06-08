/**
 * Keyword signals per CHECKION report pillar — used to weight site metrics per persona.
 */

import type { AudiencePillarFit } from '@/lib/project-report/types';

export type PersonaPillarKey = AudiencePillarFit['pillar'];

/** Minimum salience (0–1) before a site pillar applies to a persona. */
export const PERSONA_PILLAR_SALIENCE_THRESHOLD = 0.08;

export const PERSONA_PILLAR_SIGNALS: Record<Exclude<PersonaPillarKey, 'topics'>, readonly string[]> = {
    wcag: [
        'barrierefrei',
        'accessibility',
        'wcag',
        'screenreader',
        'kontrast',
        'lesbar',
        'lesbarkeit',
        'behinderung',
        'inklusion',
        'tastatur',
        'aria',
        'blind',
        'sehbehindert',
    ],
    seo: [
        'seo',
        'google',
        'sichtbarkeit',
        'organisch',
        'suchmaschine',
        'suchbegriff',
        'keyword',
        'indexierung',
        'meta',
        'snippet',
        'traffic',
    ],
    geo: [
        'chatgpt',
        'ki-suche',
        'llm',
        'generative',
        'ai search',
        'perplexity',
        'gemini',
        'sichtbarkeit ki',
        'llm-sichtbarkeit',
    ],
    rankings: [
        'ranking',
        'platzierung',
        'position',
        'serp',
        'top',
        'suchergebnis',
        'keyword-ranking',
        'sichtbarkeitsindex',
    ],
    performance: [
        'schnell',
        'ladezeit',
        'performance',
        'mobile',
        'core web vitals',
        'lcp',
        'pagespeed',
        'langsam',
        'responsive',
    ],
};

export const PERSONA_TOKEN_WEIGHTS = {
    painPoint: 3,
    goal: 2,
    interest: 1.5,
    headline: 2,
    segment: 1,
} as const;
