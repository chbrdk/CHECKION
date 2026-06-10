/**
 * Technical appendix issue groups — skip rows already covered as systemic issues.
 */
import type { IssueGroupFact } from '@/lib/project-report/types';

export const PDF_ISSUE_GROUP_APPENDIX_LIMIT = 12;

function normalizeIssueTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function filterIssueGroupsForPdfAppendix(
    issueGroups: IssueGroupFact[],
    systemicIssueTitles: string[],
    limit = PDF_ISSUE_GROUP_APPENDIX_LIMIT
): IssueGroupFact[] {
    const systemicKeys = new Set(systemicIssueTitles.map(normalizeIssueTitle));
    return issueGroups
        .filter((group) => !systemicKeys.has(normalizeIssueTitle(group.title)))
        .slice(0, limit);
}
