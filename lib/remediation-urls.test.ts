/**
 * Tests for remediation URL builder
 */
import { describe, it, expect } from 'vitest';
import { getRemediationUrl, REMEDIATION_AXE_BASE, REMEDIATION_WCAG_QUICKREF } from './remediation-urls';

describe('remediation-urls', () => {
  it('returns Deque URL for axe rules', () => {
    expect(getRemediationUrl('color-contrast', 'axe')).toBe(`${REMEDIATION_AXE_BASE}/color-contrast`);
    expect(getRemediationUrl('image-alt', 'axe')).toBe(`${REMEDIATION_AXE_BASE}/image-alt`);
  });

  it('returns WCAG quickref for htmlcs rules', () => {
    expect(getRemediationUrl('WCAG2AA.Principle1.Guideline1_1.1_1_1.H37', 'htmlcs')).toBe(REMEDIATION_WCAG_QUICKREF);
  });

  it('returns null for empty code', () => {
    expect(getRemediationUrl('', 'axe')).toBe(null);
    expect(getRemediationUrl('   ', 'axe')).toBe(null);
  });
});
