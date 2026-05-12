import { describe, expect, it } from 'vitest';

import { resolveLaunchProjectId } from '@/lib/launch-project';

describe('CHECKION launch project selection', () => {
  it('prefers an already selected project', () => {
    expect(
      resolveLaunchProjectId(['project-1', 'project-2'], {
        currentProjectId: 'project-2',
        launchProjectId: 'project-1',
      })
    ).toBe('project-2');
  });

  it('accepts a launch project only when it exists locally', () => {
    expect(
      resolveLaunchProjectId(['project-1', 'project-2'], {
        currentProjectId: null,
        launchProjectId: 'project-1',
      })
    ).toBe('project-1');

    expect(
      resolveLaunchProjectId(['project-1', 'project-2'], {
        currentProjectId: null,
        launchProjectId: 'missing-project',
      })
    ).toBeNull();
  });
});
