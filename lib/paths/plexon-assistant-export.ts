/** Query params for Plexon assistant report PPTX export (CHECKION integration). */
export const PLEXON_ASSISTANT_PPTX_DEBUG_PARAM = 'debug';
export const PLEXON_ASSISTANT_PPTX_DEBUG_QUERY_PLAN = 'plan';

export function isPlexonAssistantPptxDebugPlanRequest(url: string | URL): boolean {
    const parsed = typeof url === 'string' ? new URL(url, 'http://localhost') : url;
    return parsed.searchParams.get(PLEXON_ASSISTANT_PPTX_DEBUG_PARAM) === PLEXON_ASSISTANT_PPTX_DEBUG_QUERY_PLAN;
}

export function withPlexonAssistantPptxDebugPlan(url: string): string {
    const parsed = new URL(url, 'http://localhost');
    parsed.searchParams.set(PLEXON_ASSISTANT_PPTX_DEBUG_PARAM, PLEXON_ASSISTANT_PPTX_DEBUG_QUERY_PLAN);
    return `${parsed.pathname}${parsed.search}`;
}
