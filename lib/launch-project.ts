export function resolveLaunchProjectId(
  projectIds: string[],
  options: {
    currentProjectId?: string | null;
    launchProjectId?: string | null;
  }
): string | null {
  if (options.currentProjectId) return options.currentProjectId;
  if (options.launchProjectId && projectIds.includes(options.launchProjectId)) {
    return options.launchProjectId;
  }
  return null;
}
