'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxButton,
  MsqdxMoleculeCard,
  MsqdxChip,
  MsqdxAccordion,
  MsqdxAccordionItem,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
import {
  apiProject,
  apiProjectGeoSummary,
  apiProjectDomainSummary,
  apiScanDomainSummary,
  apiProjectGeoLatestResult,
  pathProjectGeo,
  pathGeoEeat,
  pathDomain,
  pathScanDomain,
} from '@/lib/constants';
import { GeoAnalysisPagesTable } from '@/components/GeoAnalysisPagesTable';
import type { GeoEeatPageResult, GeoEeatRecommendation } from '@/lib/types';
import type { SlimPage } from '@/lib/types';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { AggregatedEeatOnPage } from '@/lib/domain-aggregation';

type ScoreLabel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

function scoreToLabel(score: number): ScoreLabel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'critical';
}

/** Map SlimPage from deep scan to shape compatible with GeoAnalysisPagesTable (GeoEeatPageResult). */
function slimToGeoPage(s: SlimPage): GeoEeatPageResult {
  return {
    url: s.url,
    technical: {
      eeatSignals: s.eeatSignals,
      hasImpressum: s.eeatSignals?.hasImpressum ?? false,
      hasPrivacy: s.hasPrivacy ?? false,
    },
  };
}

interface GeoSummaryData {
  score: number | null;
  competitorScores: Record<string, number>;
}

export default function ProjectGeoAnalysisPage() {
  const params = useParams();
  const { t } = useI18n();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;

  const [project, setProject] = useState<{ id: string; domain: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoSummary, setGeoSummary] = useState<GeoSummaryData | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [fullSummary, setFullSummary] = useState<DomainSummaryResponse | null>(null);
  const [recommendations, setRecommendations] = useState<GeoEeatRecommendation[]>([]);
  const fetchedForIdRef = useFetchOnceForId();

  useEffect(() => {
    if (!id) return;
    if (fetchedForIdRef.current === id) return;
    fetchedForIdRef.current = id;
    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      setLoading(true);
      setGeoSummary(null);
      setScanId(null);
      setFullSummary(null);
      setRecommendations([]);
      try {
        const [projectRes, geoSummaryRes, domainSummaryRes] = await Promise.all([
          fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ data?: { id: string; domain: string | null } }>,
          fetch(apiProjectGeoSummary(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ success?: boolean; data?: { score?: number | null; competitorScores?: Record<string, number> } }>,
          fetch(apiProjectDomainSummary(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ success?: boolean; data?: { scanId?: string } | null }>,
        ]);
        if (signal.aborted) return;
        setProject(projectRes?.data ?? null);
        if (geoSummaryRes?.success && geoSummaryRes?.data) {
          setGeoSummary({
            score: geoSummaryRes.data.score ?? null,
            competitorScores: geoSummaryRes.data.competitorScores ?? {},
          });
        }
        const sid = domainSummaryRes?.success && domainSummaryRes?.data?.scanId ? domainSummaryRes.data.scanId : null;
        if (sid) setScanId(sid);

        if (sid) {
          const scanSummaryRes = await fetch(apiScanDomainSummary(sid), { credentials: 'same-origin', signal });
          if (!signal.aborted && scanSummaryRes.ok) {
            const payload = (await scanSummaryRes.json()) as DomainSummaryResponse & { projectId?: string };
            setFullSummary(payload);
          }
        }

        const latestRes = (await fetch(apiProjectGeoLatestResult(id), { credentials: 'same-origin', signal }).then((r) =>
          r.json()
        )) as { success?: boolean; data?: { payload?: { recommendations?: GeoEeatRecommendation[] } } | null };
        if (!signal.aborted && latestRes?.success && latestRes?.data?.payload?.recommendations) {
          setRecommendations(latestRes.data.payload.recommendations);
        }
      } catch {
        if (!signal.aborted) {
          setProject(null);
          setGeoSummary(null);
          setScanId(null);
          setFullSummary(null);
          setRecommendations([]);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id, fetchedForIdRef]);

  const pages: GeoEeatPageResult[] = useMemo(() => {
    const p = fullSummary?.pages;
    if (!p || !Array.isArray(p)) return [];
    return (p as SlimPage[]).map(slimToGeoPage);
  }, [fullSummary?.pages]);

  const eeatOnPage = fullSummary?.aggregated?.eeatOnPage as AggregatedEeatOnPage | undefined;

  const overviewStats = useMemo(() => {
    if (eeatOnPage) {
      return {
        withImpressum: eeatOnPage.withImpressum,
        totalPages: eeatOnPage.totalPages,
        withPrivacy: eeatOnPage.withPrivacy,
        withContact: eeatOnPage.withContact,
        withAboutLink: eeatOnPage.withAboutLink,
        withTeamLink: eeatOnPage.withTeamLink,
        withCaseStudyMention: eeatOnPage.withCaseStudyMention,
        recommendationCount: recommendations.length,
      };
    }
    if (pages.length === 0)
      return {
        withImpressum: 0,
        totalPages: 0,
        withPrivacy: 0,
        withContact: 0,
        withAboutLink: 0,
        withTeamLink: 0,
        withCaseStudyMention: 0,
        recommendationCount: recommendations.length,
      };
    let withImpressum = 0, withPrivacy = 0, withContact = 0, withAboutLink = 0, withTeamLink = 0, withCaseStudyMention = 0;
    for (const p of pages) {
      if (p.technical?.hasImpressum === true || p.technical?.eeatSignals?.hasImpressum === true) withImpressum++;
      if (p.technical?.hasPrivacy === true) withPrivacy++;
      if (p.technical?.eeatSignals?.hasContact === true) withContact++;
      if (p.technical?.eeatSignals?.hasAboutLink === true) withAboutLink++;
      if (p.technical?.eeatSignals?.hasTeamLink === true) withTeamLink++;
      if (p.technical?.eeatSignals?.hasCaseStudyMention === true) withCaseStudyMention++;
    }
    return {
      withImpressum,
      totalPages: pages.length,
      withPrivacy,
      withContact,
      withAboutLink,
      withTeamLink,
      withCaseStudyMention,
      recommendationCount: recommendations.length,
    };
  }, [eeatOnPage, pages, recommendations.length]);

  const hasDeepScan = fullSummary != null && (fullSummary.pages?.length ?? 0) > 0;
  const score = geoSummary?.score ?? null;
  const competitorScores = geoSummary?.competitorScores ?? {};
  const scoreLabel = score != null ? scoreToLabel(score) : 'critical';
  const loadingState = loading && !fullSummary && !scanId;

  const timestamp = fullSummary?.timestamp ? new Date(fullSummary.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <Box sx={{ py: 'var(--msqdx-spacing-md)', px: 1.5, width: '100%', maxWidth: '100%' }}>
      <Stack sx={{ gap: 2 }}>
        <MsqdxMoleculeCard
          title={t('projects.geoAnalysis.title')}
          titleVariant="h4"
          variant="flat"
          borderRadius="lg"
          footerDivider
          sx={{ bgcolor: 'var(--color-card-bg)' }}
          actions={
            hasDeepScan && scanId ? (
              <Link href={pathDomain(scanId)} style={{ textDecoration: 'none' }}>
                <MsqdxButton variant="outlined" size="small">
                  {t('projects.geoAnalysis.openDeepScan')}
                </MsqdxButton>
              </Link>
            ) : null
          }
        >
          {loadingState ? (
            <MsqdxTypography variant="body2" sx={{ py: 1 }}>
              {t('common.loading')}
            </MsqdxTypography>
          ) : !hasDeepScan ? (
            <>
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                {t('projects.geoAnalysis.noDeepScan')}
              </MsqdxTypography>
              <Link
                href={project?.domain ? pathScanDomain({ url: project.domain }) : (id ? pathProjectGeo(id) : '#')}
                style={{ textDecoration: 'none' }}
              >
                <MsqdxButton variant="outlined" size="small">
                  {project?.domain ? t('projects.wcag.startScan') : t('projects.navGeo')}
                </MsqdxButton>
              </Link>
            </>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 1, width: '100%' }}>
                <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                    GEO-Score
                  </MsqdxTypography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <MsqdxTypography variant="h2" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '2rem' }}>
                      {score ?? 0}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body1" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500, fontSize: '1.25rem' }}>
                      /100
                    </MsqdxTypography>
                  </Box>
                  <MsqdxChip
                    label={t(`projects.geoAnalysis.scoreLabel_${scoreLabel}`)}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                {Object.entries(competitorScores).map(([domain, s]) => (
                  <Box
                    key={domain}
                    sx={{
                      flex: '1 1 0',
                      minWidth: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                      alignItems: 'flex-start',
                    }}
                  >
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', fontSize: '0.7rem' }}>
                      {domain}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {s}/100
                    </MsqdxTypography>
                    <MsqdxChip
                      label={t(`projects.geoAnalysis.scoreLabel_${scoreToLabel(s)}`)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  </Box>
                ))}
              </Box>
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('projects.geoAnalysis.fromDeepScan')} {timestamp}
                {scanId && (
                  <>
                    {' · '}
                    <Link href={pathDomain(scanId)} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {t('projects.geoAnalysis.openDeepScan')}
                    </Link>
                  </>
                )}
              </MsqdxTypography>
            </Box>
          )}
        </MsqdxMoleculeCard>

        {hasDeepScan && (
          <>
            <MsqdxMoleculeCard
              title={t('projects.geoAnalysis.overview')}
              titleVariant="h6"
              variant="flat"
              borderRadius="lg"
              sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-secondary-dx-green)' }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', alignItems: 'flex-end' }}>
                <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                    {t('projects.geoAnalysis.withImpressum')}
                  </MsqdxTypography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {overviewStats.withImpressum}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                      / {overviewStats.totalPages}
                    </MsqdxTypography>
                  </Box>
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                    {t('projects.geoAnalysis.withPrivacy')}
                  </MsqdxTypography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {overviewStats.withPrivacy}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                      / {overviewStats.totalPages}
                    </MsqdxTypography>
                  </Box>
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                    {t('projects.geoAnalysis.recommendationCount')}
                  </MsqdxTypography>
                  <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {overviewStats.recommendationCount}
                  </MsqdxTypography>
                </Box>
              </Box>
            </MsqdxMoleculeCard>

            <MsqdxMoleculeCard
              title={t('projects.geoAnalysis.pagesTableTitle')}
              titleVariant="h6"
              variant="flat"
              borderRadius="lg"
              sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-secondary-dx-green)' }}
            >
              <GeoAnalysisPagesTable pages={pages} />
            </MsqdxMoleculeCard>

            <MsqdxMoleculeCard
              title={t('projects.geoAnalysis.recommendationsTitle')}
              titleVariant="h6"
              variant="flat"
              borderRadius="lg"
              sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-secondary-dx-green)' }}
            >
              {recommendations.length === 0 ? (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                  {t('projects.geoAnalysis.noRecommendations')}
                </MsqdxTypography>
              ) : (
                <MsqdxAccordion>
                  {recommendations
                    .slice()
                    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                    .map((rec, idx) => (
                      <MsqdxAccordionItem
                        key={`${rec.title}-${idx}`}
                        id={`geo-rec-${idx}`}
                        summary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <MsqdxTypography variant="subtitle2">
                              {rec.priority != null ? `#${rec.priority} ` : ''}
                              {rec.title}
                            </MsqdxTypography>
                            {rec.dimension && (
                              <MsqdxChip
                                label={t(`projects.geoAnalysis.dimension${rec.dimension.charAt(0).toUpperCase()}${rec.dimension.slice(1)}`)}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                        }
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <MsqdxTypography variant="body2">{rec.description}</MsqdxTypography>
                          {rec.affectedUrls && rec.affectedUrls.length > 0 && (
                            <Box>
                              <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                {t('projects.geoAnalysis.affectedUrls')}:
                              </MsqdxTypography>
                              <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem' }}>
                                {rec.affectedUrls.map((u) => (
                                  <li key={u}>{u}</li>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </MsqdxAccordionItem>
                    ))}
                </MsqdxAccordion>
              )}
            </MsqdxMoleculeCard>
          </>
        )}
      </Stack>
    </Box>
  );
}
