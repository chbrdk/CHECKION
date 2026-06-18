import { describe, expect, it } from 'vitest';
import {
  evaluateSkipLinkCandidate,
  getSkipLinkDetectScript,
  isSkipLinkHref,
  matchesSkipLinkLabel,
  SKIP_LINK_TEXT_KEYWORDS,
} from '@/lib/skip-link-detect';

describe('skip-link-detect', () => {
  it('matches German skip labels including Hauptinhalt springen', () => {
    expect(matchesSkipLinkLabel('Zum Hauptinhalt springen')).toBe(true);
    expect(matchesSkipLinkLabel('Direkt zum Inhalt')).toBe(true);
    expect(SKIP_LINK_TEXT_KEYWORDS).toContain('hauptinhalt');
  });

  it('detects fragment href skip anchors', () => {
    expect(isSkipLinkHref('#main-content')).toBe(true);
    expect(isSkipLinkHref('#')).toBe(false);
    expect(isSkipLinkHref('/page#main-content')).toBe(true);

    const result = evaluateSkipLinkCandidate({
      tagName: 'A',
      href: '#main-content',
      text: 'Skip to content',
      ariaLabel: '',
      title: '',
      className: 'skip-link',
      role: null,
      mainTargetId: 'main-content',
    });
    expect(result).toEqual({ hasSkipLink: true, skipLinkHref: '#main-content' });
  });

  it('detects Pronova-style button skip link targeting main landmark', () => {
    const result = evaluateSkipLinkCandidate({
      tagName: 'BUTTON',
      href: null,
      text: 'Zum Hauptinhalt springen',
      ariaLabel: '',
      title: 'Zum Hauptinhalt springen',
      className: 'primary visually-hidden-focusable',
      role: 'link',
      mainTargetId: 'main-content',
    });
    expect(result).toEqual({ hasSkipLink: true, skipLinkHref: '#main-content' });
  });

  it('ignores navigation back links without skip intent', () => {
    const result = evaluateSkipLinkCandidate({
      tagName: 'A',
      href: '#',
      text: 'Zurück',
      ariaLabel: '',
      title: '',
      className: 'back-link',
      role: null,
      mainTargetId: 'main-content',
    });
    expect(result).toBeNull();
  });

  it('ignores skip-labeled anchors that only use href="#"', () => {
    const result = evaluateSkipLinkCandidate({
      tagName: 'A',
      href: '#',
      text: 'Zum Inhalt springen',
      ariaLabel: '',
      title: '',
      className: '',
      role: null,
      mainTargetId: 'main-content',
    });
    expect(result).toBeNull();
  });

  it('browser script includes Hauptinhalt keyword and main-content fragment', () => {
    const script = getSkipLinkDetectScript();
    expect(script).toContain('hauptinhalt');
    expect(script).toContain('main-content');
    expect(script).toContain('visually-hidden-focusable');
  });
});
