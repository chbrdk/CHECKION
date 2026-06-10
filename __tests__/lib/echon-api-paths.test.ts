import { describe, it, expect } from 'vitest';
import {
    ECHON_API_BASE_URL,
    ECHON_DASHBOARD_URL,
    ECHON_REPORT_RESEARCH_DEPTH,
    ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS,
    ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS,
    ECHON_REPORT_RESEARCH_TIMEOUT_MS,
    echonIntegrationUrl,
    echonResearchStreamPath,
    echonResearchThreadMessagesPath,
    echonResearchThreadsPath,
    echonResearchThreadUrl,
    getEchonApiBaseUrl,
    getEchonIntegrationEnvSnapshot,
    isEchonIntegrationConfigured,
} from '@/lib/paths/echon-api';

describe('echon-api paths', () => {
    it('uses hardcoded production base URL (not env)', () => {
        expect(getEchonApiBaseUrl()).toBe('https://echon.projects-a.plygrnd.tech/echon');
        expect(ECHON_API_BASE_URL).toBe('https://echon.projects-a.plygrnd.tech/echon');
        expect(isEchonIntegrationConfigured()).toBe(true);
    });

    it('builds integration URLs', () => {
        expect(echonIntegrationUrl('/api/v2/research/chat')).toBe(
            'https://echon.projects-a.plygrnd.tech/echon/api/v2/research/chat'
        );
        expect(echonResearchThreadsPath()).toBe('/api/v2/research/threads');
        expect(echonResearchStreamPath()).toBe('/api/v2/research/stream');
        expect(echonResearchThreadMessagesPath('a1b2c3d4-e5f6-4789-a012-3456789abcde')).toBe(
            '/api/v2/research/threads/a1b2c3d4-e5f6-4789-a012-3456789abcde/messages'
        );
        expect(echonResearchThreadUrl('a1b2c3d4-e5f6-4789-a012-3456789abcde')).toContain(
            '/api/v2/research/threads/a1b2c3d4-e5f6-4789-a012-3456789abcde'
        );
    });

    it('allows up to 30 min research with 10s poll interval', () => {
        expect(ECHON_REPORT_RESEARCH_TIMEOUT_MS).toBe(1_800_000);
        expect(ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS).toBe(10_000);
        expect(ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS).toBe(45_000);
    });

    it('health snapshot reports configured with code URL', () => {
        const snap = getEchonIntegrationEnvSnapshot();
        expect(snap.configured).toBe(true);
        expect(snap.apiBaseUrlSet).toBe(true);
        expect(snap.apiBaseUrl).toBe(ECHON_API_BASE_URL);
        expect(snap.researchDepth).toBe(ECHON_REPORT_RESEARCH_DEPTH);
        expect(snap.researchTimeoutMs).toBe(ECHON_REPORT_RESEARCH_TIMEOUT_MS);
        expect(snap.researchPollIntervalMs).toBe(ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS);
    });

    it('exposes dashboard URL for docs', () => {
        expect(ECHON_DASHBOARD_URL).toContain('/echon/dashboard');
    });
});
