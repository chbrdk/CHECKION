import { describe, it, expect } from 'vitest';
import {
  meetsMinTargetSize,
  parseTargetSizeFromMessage,
  WCAG_MIN_TARGET_SIZE_PX,
} from '@/lib/wcag-target-size';

describe('wcag-target-size', () => {
  it('parses axe target-size message', () => {
    const parsed = parseTargetSizeFromMessage(
      'Target has insufficient size (20px by 22px, should be at least 24px by 24px)'
    );
    expect(parsed.width).toBe(20);
    expect(parsed.height).toBe(22);
    expect(parsed.minSize).toBe(24);
    expect(parsed.partiallyObscured).toBe(false);
  });

  it('detects partially obscured message', () => {
    const parsed = parseTargetSizeFromMessage(
      'Target has insufficient size because it is partially obscured (smallest space is 18px by 18px, should be at least 24px by 24px)'
    );
    expect(parsed.partiallyObscured).toBe(true);
  });

  it('meetsMinTargetSize uses WCAG default', () => {
    expect(meetsMinTargetSize(24, 24)).toBe(true);
    expect(meetsMinTargetSize(23, 24)).toBe(false);
    expect(WCAG_MIN_TARGET_SIZE_PX).toBe(24);
  });
});
