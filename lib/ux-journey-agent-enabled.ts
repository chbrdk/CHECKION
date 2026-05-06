import { ENV_CHECKION_ENABLE_UX_JOURNEY_AGENT } from '@/lib/constants';

export function uxJourneyAgentEnabled(): boolean {
    const v = process.env[ENV_CHECKION_ENABLE_UX_JOURNEY_AGENT]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

