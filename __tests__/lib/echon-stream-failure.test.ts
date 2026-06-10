import { describe, it, expect } from 'vitest';
import {
    isFatalEchonStreamFailure,
    isRecoverableEchonStreamFailure,
} from '@/lib/integrations/echon-stream-failure';

describe('echon stream failure classification', () => {
    it('treats proxy timeouts as recoverable (keep polling thread)', () => {
        expect(isRecoverableEchonStreamFailure('echon_fetch_timeout')).toBe(true);
        expect(isRecoverableEchonStreamFailure('echon_stream_incomplete')).toBe(true);
    });

    it('treats agent LLM errors as fatal', () => {
        expect(isFatalEchonStreamFailure('echon_stream_error')).toBe(true);
        expect(isRecoverableEchonStreamFailure('echon_stream_error')).toBe(false);
    });
});
