/**
 * Canonical project industry taxonomy: stable IDs in DB/API, labels via i18n `industryPool.<id>`.
 * Single source for pool — do not duplicate IDs elsewhere.
 */
import { z } from 'zod';
import { MAX_INDUSTRY_LEN } from '@/lib/tag-utils';

/** id = stored value in `projects.industry`; llmHint = English gloss for the classifier. */
export const INDUSTRY_POOL = [
    { id: 'software_saas', llmHint: 'Software products, SaaS, cloud platforms, dev tools' },
    { id: 'it_services_consulting', llmHint: 'IT consulting, managed IT, systems integration, digital agencies (tech)' },
    { id: 'ecommerce_retail', llmHint: 'Online shops, retail chains, marketplaces' },
    { id: 'manufacturing_industrial', llmHint: 'Manufacturing, machinery, industrial goods, B2B components' },
    { id: 'healthcare_medical', llmHint: 'Hospitals, clinics, medtech, pharma, health services' },
    { id: 'finance_insurance', llmHint: 'Banks, fintech, insurance, asset management' },
    { id: 'real_estate_construction', llmHint: 'Real estate, property, construction, architecture' },
    { id: 'hospitality_travel', llmHint: 'Hotels, restaurants, travel, tourism' },
    { id: 'media_marketing_agency', llmHint: 'Media, publishing, advertising, marketing agencies' },
    { id: 'education_research', llmHint: 'Schools, universities, e-learning, research institutes' },
    { id: 'nonprofit_public_sector', llmHint: 'NGOs, charities, public administration, government' },
    { id: 'energy_utilities', llmHint: 'Energy, power, water, utilities' },
    { id: 'logistics_transport', llmHint: 'Logistics, freight, shipping, mobility services' },
    { id: 'agriculture_food', llmHint: 'Farming, food production, agritech' },
    { id: 'professional_services', llmHint: 'Legal, accounting, HR, management consulting (non-IT)' },
    { id: 'telecommunications', llmHint: 'Telcos, network operators, connectivity' },
    { id: 'automotive_mobility', llmHint: 'Automotive OEM/suppliers, vehicles, mobility platforms' },
    { id: 'consumer_goods', llmHint: 'FMCG, consumer brands, household products' },
    { id: 'aerospace_defense', llmHint: 'Aerospace, defense, aviation suppliers' },
    { id: 'chemicals_materials', llmHint: 'Chemicals, materials, process industries' },
    { id: 'other', llmHint: 'Use only when none of the categories fit better' },
] as const;

export type IndustryPoolId = (typeof INDUSTRY_POOL)[number]['id'];

export const INDUSTRY_POOL_IDS: IndustryPoolId[] = INDUSTRY_POOL.map((p) => p.id);

const ID_SET = new Set<string>(INDUSTRY_POOL_IDS);

export function isIndustryPoolId(s: string): s is IndustryPoolId {
    return ID_SET.has(s);
}

/** Zod: single pool id (for API bodies). */
const POOL_IDS_TUPLE = INDUSTRY_POOL_IDS as [string, ...string[]];
export const industryPoolIdZod = z.enum(POOL_IDS_TUPLE);

/** API: optional/nullable industry; empty string should be coerced to null before validate. */
export const projectIndustryApiZod = z.union([industryPoolIdZod, z.null()]).optional();

/**
 * Persisted value: valid pool id, or legacy free text (trimmed, capped) until user migrates.
 */
export function normalizeStoredProjectIndustry(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (isIndustryPoolId(s)) return s;
    return s.slice(0, MAX_INDUSTRY_LEN);
}

/** UI / list: translated label for pool id; legacy strings pass through. */
export function industryDisplayLabel(
    stored: string | null | undefined,
    t: (key: string) => string
): string {
    if (stored == null || !String(stored).trim()) return '';
    const s = String(stored).trim();
    if (isIndustryPoolId(s)) return t(`industryPool.${s}`);
    return s;
}

/** JSON snippet for LLM: ids + hints (compact). */
export function industryPoolForLlmPrompt(): Array<{ id: IndustryPoolId; hint: string }> {
    return INDUSTRY_POOL.map((p) => ({ id: p.id, hint: p.llmHint }));
}
