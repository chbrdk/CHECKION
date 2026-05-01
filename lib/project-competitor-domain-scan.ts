/**
 * Start a new domain deep scan for a project competitor and link it via `project_domain_scan_references`.
 * Shared by POST domain-scan-all and POST domain-scan-competitor.
 */
import { upsertProjectDomainScanReference } from '@/lib/db/project-domain-references';
import { startDomainScan } from '@/lib/domain-scan-start';

export async function startProjectCompetitorDomainScan(
  userId: string,
  projectId: string,
  normalizedDomain: string,
  options?: { skipUnchangedPages?: boolean; classifyPageTopics?: boolean; aiFillProjectMetadata?: boolean }
): Promise<{ scanId: string }> {
  const d = normalizedDomain.trim();
  const url = d.startsWith('http') ? d : `https://${d}`;
  const { id } = await startDomainScan(userId, url, {
    projectId: null,
    useSitemap: true,
    domainOverride: d,
    ...(options?.skipUnchangedPages ? { skipUnchangedPages: true } : {}),
    ...(options?.classifyPageTopics ? { classifyPageTopics: true } : {}),
    ...(options?.aiFillProjectMetadata === false ? { aiFillProjectMetadata: false } : {}),
  });
  await upsertProjectDomainScanReference(projectId, d, id);
  return { scanId: id };
}
