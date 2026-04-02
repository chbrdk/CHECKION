/**
 * Unit tests: URL safety SSRF guardrails
 */
import { describe, it, expect } from 'vitest';
import { isSafeUrlForServerFetch } from '@/lib/url-safety';

describe('isSafeUrlForServerFetch', () => {
  it('allows normal https URL', () => {
    expect(isSafeUrlForServerFetch('https://example.com')).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isSafeUrlForServerFetch('http://localhost:3000')).toBe(false);
    expect(isSafeUrlForServerFetch('http://foo.localhost')).toBe(false);
  });

  it('blocks private IPv4 ranges', () => {
    expect(isSafeUrlForServerFetch('http://127.0.0.1')).toBe(false);
    expect(isSafeUrlForServerFetch('http://10.0.0.1')).toBe(false);
    expect(isSafeUrlForServerFetch('http://192.168.1.10')).toBe(false);
    expect(isSafeUrlForServerFetch('http://172.16.0.1')).toBe(false);
    expect(isSafeUrlForServerFetch('http://172.31.255.255')).toBe(false);
  });

  it('allows public IPv4', () => {
    expect(isSafeUrlForServerFetch('http://8.8.8.8')).toBe(true);
  });

  it('blocks non-http(s) protocols', () => {
    expect(isSafeUrlForServerFetch('file:///etc/passwd')).toBe(false);
  });
});

