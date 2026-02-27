/**
 * Unit tests for lib/api-error-handler
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiError, handleApiError, internalError, API_STATUS } from './api-error-handler';

describe('api-error-handler', () => {
  describe('apiError', () => {
    it('returns 500 by default', async () => {
      const res = apiError('Something went wrong');
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: 'Something went wrong' });
    });

    it('returns specified status', async () => {
      const res = apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('includes extras in body', async () => {
      const res = apiError('Rate limited', API_STATUS.TOO_MANY_REQUESTS, { retryAfter: 60 });
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json).toEqual({ error: 'Rate limited', retryAfter: 60 });
      expect(res.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('handleApiError', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    beforeEach(() => consoleSpy.mockClear());
    afterEach(() => consoleSpy.mockRestore());

    it('returns 500 with generic message by default', async () => {
      const res = handleApiError(new Error('internal'));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('An unexpected error occurred.');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('uses publicMessage when provided', async () => {
      const res = handleApiError(new Error('db down'), { publicMessage: 'Registration failed.' });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Registration failed.');
    });
  });

  describe('internalError', () => {
    it('returns 500 with default message', async () => {
      const res = internalError();
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('An unexpected error occurred.');
    });

    it('returns 500 with custom message', async () => {
      const res = internalError('Service unavailable.');
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Service unavailable.');
    });
  });
});
