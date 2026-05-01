import { describe, it, expect } from 'vitest';
import { shouldAiFillProjectMetadata } from '@/lib/domain-scan-ai-metadata';
import type { DomainScanResult } from '@/lib/types';

describe('shouldAiFillProjectMetadata', () => {
    it('defaults true when payload or scanOptions missing', () => {
        expect(shouldAiFillProjectMetadata(null)).toBe(true);
        expect(shouldAiFillProjectMetadata(undefined)).toBe(true);
        expect(shouldAiFillProjectMetadata({} as DomainScanResult)).toBe(true);
    });

    it('is false only when explicitly disabled', () => {
        expect(
            shouldAiFillProjectMetadata({
                scanOptions: { aiFillProjectMetadata: false },
            } as DomainScanResult)
        ).toBe(false);
        expect(
            shouldAiFillProjectMetadata({
                scanOptions: { aiFillProjectMetadata: true },
            } as DomainScanResult)
        ).toBe(true);
    });
});
