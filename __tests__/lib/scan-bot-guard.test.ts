import { describe, expect, it } from 'vitest';
import { detectBotChallengeFromDocument, parseRetryAfterMs } from '@/lib/scan-bot-guard';

describe('scan-bot-guard', () => {
    it('detects Cloudflare challenge page', () => {
        const state = detectBotChallengeFromDocument({
            title: 'Just a moment...',
            bodyText: 'Checking your browser before accessing schreiner-group.com',
            hasSelector: () => false,
        });
        expect(state.isChallenge).toBe(true);
        expect(state.kind).toBe('waf');
    });

    it('detects challenge form selector', () => {
        const state = detectBotChallengeFromDocument({
            title: 'Site',
            bodyText: '',
            hasSelector: (sel) => sel === '#challenge-form',
        });
        expect(state.isChallenge).toBe(true);
        expect(state.kind).toBe('cloudflare');
    });

    it('parses Retry-After seconds', () => {
        expect(parseRetryAfterMs({ 'retry-after': '12' })).toBe(12_000);
    });
});
