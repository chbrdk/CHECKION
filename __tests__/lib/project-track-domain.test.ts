import { describe, it, expect } from 'vitest';
import { projectTrackDomain } from '@/lib/project-track-domain';

describe('projectTrackDomain', () => {
    it('strips protocol and path', () => {
        expect(projectTrackDomain('https://www.example.com/path')).toBe('example.com');
    });

    it('returns null when empty', () => {
        expect(projectTrackDomain(null)).toBeNull();
    });
});
