import { describe, expect, it } from 'vitest';
import { isBrowserExtensionMessageChannelError } from '@/lib/http/fetch-json';

describe('fetch-json helpers', () => {
    it('flags Chrome extension message channel errors', () => {
        expect(
            isBrowserExtensionMessageChannelError(
                new Error(
                    'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'
                )
            )
        ).toBe(true);
    });

    it('ignores normal application errors', () => {
        expect(isBrowserExtensionMessageChannelError(new Error('Project not found'))).toBe(false);
        expect(isBrowserExtensionMessageChannelError('network')).toBe(false);
    });
});
