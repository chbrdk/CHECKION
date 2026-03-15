import { describe, it, expect } from 'vitest';
import { computeGeoEeatPageScore } from '@/lib/geo-eeat-page-score';

describe('computeGeoEeatPageScore', () => {
  it('returns 0 when no signals are present', () => {
    const result = computeGeoEeatPageScore({
      hasLlmsTxt: false,
      hasRobotsAllowingAI: false,
      schemaCoverage: [],
      tableCount: 0,
      faqCount: 0,
      citationCount: 0,
      hasAuthorBio: false,
    });
    expect(result.score).toBe(0);
    expect(result.scoreBreakdown.every((b) => b.points === 0)).toBe(true);
  });

  it('returns 10 when only Robots allow AI and no other signals', () => {
    const result = computeGeoEeatPageScore({
      hasLlmsTxt: false,
      hasRobotsAllowingAI: true,
      schemaCoverage: [],
      tableCount: 0,
      faqCount: 0,
      citationCount: 0,
      hasAuthorBio: false,
    });
    const robots = result.scoreBreakdown.find((b) => b.factor === 'Robots erlauben AI');
    expect(robots?.points).toBe(10);
    expect(result.score).toBe(10);
  });

  it('returns 0 for Robots factor when AI is blocked', () => {
    const result = computeGeoEeatPageScore({
      hasLlmsTxt: true,
      hasRobotsAllowingAI: false,
      schemaCoverage: ['Article'],
      tableCount: 1,
      faqCount: 2,
      citationCount: 10,
      hasAuthorBio: true,
      eeat: { hasImpressum: true, hasContact: true, hasAboutLink: true },
    });
    const robots = result.scoreBreakdown.find((b) => b.factor === 'Robots erlauben AI');
    expect(robots?.points).toBe(0);
    // All other 9 factors present = 90
    expect(result.score).toBe(90);
  });

  it('returns 100 when all factors are present', () => {
    const result = computeGeoEeatPageScore({
      hasLlmsTxt: true,
      hasRobotsAllowingAI: true,
      schemaCoverage: ['Article', 'Organization'],
      tableCount: 2,
      faqCount: 3,
      citationCount: 8,
      hasAuthorBio: true,
      eeat: {
        hasImpressum: true,
        hasContact: true,
        hasAboutLink: true,
        hasTeamLink: true,
        hasCaseStudyMention: true,
      },
    });
    expect(result.score).toBe(100);
    expect(result.scoreBreakdown.length).toBe(10);
    expect(result.scoreBreakdown.every((b) => b.points === 10)).toBe(true);
  });

  it('includes EEAT factors in breakdown', () => {
    const result = computeGeoEeatPageScore({
      hasLlmsTxt: false,
      hasRobotsAllowingAI: true,
      schemaCoverage: [],
      tableCount: 0,
      faqCount: 0,
      citationCount: 0,
      hasAuthorBio: false,
      eeat: { hasImpressum: true, hasContact: false, hasAboutLink: true },
    });
    const impressum = result.scoreBreakdown.find((b) => b.factor.includes('Impressum'));
    const contact = result.scoreBreakdown.find((b) => b.factor.includes('Kontakt'));
    const about = result.scoreBreakdown.find((b) => b.factor.includes('Über uns'));
    expect(impressum?.points).toBe(10);
    expect(contact?.points).toBe(0);
    expect(about?.points).toBe(10);
    expect(result.score).toBe(30); // Robots 10 + Impressum 10 + Über uns 10
  });

  it('scores citations > 5 as present', () => {
    const base = {
      hasLlmsTxt: false,
      hasRobotsAllowingAI: true,
      schemaCoverage: [] as string[],
      tableCount: 0,
      faqCount: 0,
      hasAuthorBio: false,
    };
    const below = computeGeoEeatPageScore({ ...base, citationCount: 4 });
    const above = computeGeoEeatPageScore({ ...base, citationCount: 6 });
    const belowZitate = below.scoreBreakdown.find((b) => b.factor.includes('Zitate'));
    const aboveZitate = above.scoreBreakdown.find((b) => b.factor.includes('Zitate'));
    expect(belowZitate?.points).toBe(0);
    expect(aboveZitate?.points).toBe(10);
  });
});
