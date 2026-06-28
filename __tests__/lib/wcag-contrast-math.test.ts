import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  hexToRgb,
  parseContrastFromAxeMessage,
  requiredAaContrastRatio,
} from '@/lib/wcag-contrast-math';

describe('wcag-contrast-math', () => {
  it('black on white exceeds AA', () => {
    const fg = hexToRgb('#000000')!;
    const bg = hexToRgb('#ffffff')!;
    expect(contrastRatio(fg, bg)).toBeGreaterThan(requiredAaContrastRatio(false));
  });

  it('black on brand yellow (ARAG-style) exceeds AA', () => {
    const fg = hexToRgb('#000000')!;
    const bg = hexToRgb('#ffcc00')!;
    expect(contrastRatio(fg, bg)).toBeGreaterThan(requiredAaContrastRatio(false));
  });

  it('parses axe contrast message and recomputes passing ratio', () => {
    const message =
      'Elements must have sufficient color contrast: Element has insufficient color contrast of 2.12 (foreground color: #000000, background color: #ffcc00, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1';
    const parsed = parseContrastFromAxeMessage(message);
    expect(parsed).not.toBeNull();
    expect(parsed!.foreground).toEqual({ r: 0, g: 0, b: 0 });
    expect(parsed!.background).toEqual({ r: 255, g: 204, b: 0 });
    const ratio = contrastRatio(parsed!.foreground!, parsed!.background!);
    expect(ratio).toBeGreaterThan(4.5);
    expect(parsed!.ratio).toBe(2.12);
  });
});
