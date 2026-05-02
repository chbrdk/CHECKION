import { describe, expect, it } from 'vitest';
import { effectiveWpm, estimateDwellTime } from '@/lib/estimate-dwell-time';

describe('estimateDwellTime', () => {
    it('returns null when there is no content and no engagement signals', () => {
        expect(
            estimateDwellTime({
                bodyWordCount: 0,
                readabilityGradeLevel: 8,
                brokenLinkCount: 0,
                internalLinkCount: 0,
                formFieldCount: 0,
                videoCount: 0,
                audioCount: 0,
                scrollHeightOverVh: 1,
                skinnyContent: true,
            })
        ).toBeNull();
    });

    it('scales reading time with word count and lowers WPM for harder text', () => {
        const easy = estimateDwellTime({
            bodyWordCount: 600,
            readabilityGradeLevel: 5,
            brokenLinkCount: 0,
            internalLinkCount: 5,
            formFieldCount: 0,
            videoCount: 0,
            audioCount: 0,
            scrollHeightOverVh: 4,
            skinnyContent: false,
        });
        const hard = estimateDwellTime({
            bodyWordCount: 600,
            readabilityGradeLevel: 16,
            brokenLinkCount: 0,
            internalLinkCount: 5,
            formFieldCount: 0,
            videoCount: 0,
            audioCount: 0,
            scrollHeightOverVh: 4,
            skinnyContent: false,
        });
        expect(easy).not.toBeNull();
        expect(hard).not.toBeNull();
        expect(easy!.secondsMedian).toBeGreaterThan(0);
        expect(hard!.secondsMedian).toBeGreaterThan(easy!.secondsMedian);
        expect(effectiveWpm(5)).toBeGreaterThan(effectiveWpm(16));
    });

    it('adds interaction bonus for forms and videos', () => {
        const base = estimateDwellTime({
            bodyWordCount: 200,
            readabilityGradeLevel: 8,
            brokenLinkCount: 0,
            internalLinkCount: 2,
            formFieldCount: 0,
            videoCount: 0,
            audioCount: 0,
            scrollHeightOverVh: 3,
            skinnyContent: false,
        });
        const rich = estimateDwellTime({
            bodyWordCount: 200,
            readabilityGradeLevel: 8,
            brokenLinkCount: 0,
            internalLinkCount: 2,
            formFieldCount: 8,
            videoCount: 2,
            audioCount: 0,
            scrollHeightOverVh: 3,
            skinnyContent: false,
        });
        expect(rich!.secondsMedian).toBeGreaterThan(base!.secondsMedian);
        expect(rich!.factors.interactionBonusSeconds).toBeGreaterThan(base!.factors.interactionBonusSeconds);
    });

    it('applies friction from broken links', () => {
        const clean = estimateDwellTime({
            bodyWordCount: 400,
            readabilityGradeLevel: 9,
            brokenLinkCount: 0,
            internalLinkCount: 4,
            formFieldCount: 0,
            videoCount: 0,
            audioCount: 0,
            scrollHeightOverVh: 5,
            skinnyContent: false,
        });
        const broken = estimateDwellTime({
            bodyWordCount: 400,
            readabilityGradeLevel: 9,
            brokenLinkCount: 5,
            internalLinkCount: 4,
            formFieldCount: 0,
            videoCount: 0,
            audioCount: 0,
            scrollHeightOverVh: 5,
            skinnyContent: false,
        });
        expect(broken!.factors.frictionPenaltySeconds).toBeGreaterThan(clean!.factors.frictionPenaltySeconds);
        expect(clean!.secondsMedian).toBeGreaterThan(broken!.secondsMedian);
    });
});
