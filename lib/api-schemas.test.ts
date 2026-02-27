/**
 * Unit tests for lib/api-schemas
 * Run: npm run test
 */
import { describe, it, expect } from 'vitest';
import {
  scanBodySchema,
  registerBodySchema,
  urlSchema,
  parseApiBody,
} from './api-schemas';

describe('api-schemas', () => {
  describe('urlSchema', () => {
    it('accepts valid https URL', () => {
      const result = urlSchema.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('accepts valid http URL', () => {
      const result = urlSchema.safeParse('http://test.org/path');
      expect(result.success).toBe(true);
    });

    it('rejects empty string', () => {
      const result = urlSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects invalid URL', () => {
      const result = urlSchema.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('scanBodySchema', () => {
    it('accepts minimal valid body', () => {
      const result = scanBodySchema.safeParse({ url: 'https://example.com' });
      expect(result.success).toBe(true);
    });

    it('accepts full body', () => {
      const result = scanBodySchema.safeParse({
        url: 'https://example.com',
        standard: 'WCAG2AA',
        runners: ['axe', 'htmlcs'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing url', () => {
      const result = scanBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid url', () => {
      const result = scanBodySchema.safeParse({ url: 'x' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerBodySchema', () => {
    it('accepts valid body with complex password', () => {
      const result = registerBodySchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = registerBodySchema.safeParse({
        email: 'test@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = registerBodySchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without lowercase', () => {
      const result = registerBodySchema.safeParse({
        email: 'test@example.com',
        password: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without digit', () => {
      const result = registerBodySchema.safeParse({
        email: 'test@example.com',
        password: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerBodySchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('parseApiBody', () => {
    it('returns apiError for invalid JSON', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseApiBody(req, scanBodySchema);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(400);
    });

    it('returns apiError for validation failure', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseApiBody(req, scanBodySchema);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(400);
    });

    it('returns parsed data for valid input', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseApiBody(req, scanBodySchema);
      expect(result).not.toBeInstanceOf(Response);
      expect(result).toEqual({ url: 'https://example.com' });
    });
  });
});
