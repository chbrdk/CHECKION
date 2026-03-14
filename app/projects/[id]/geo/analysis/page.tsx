'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
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
  apiProjectGeoLatestResult,
  pathProjectGeo,
  pathGeoEeat,
} from '@/lib/constants';
import { GeoAnalysisPagesTable } from '@/components/GeoAnalysisPagesTable';
import type { GeoEeatIntensiveResult, GeoEeatPageResult, GeoEeatRecommendation } from '@/lib/types';

type ScoreLabel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

function scoreToLabel(score: number): ScoreLabel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'critical';
}

interface GeoSummaryData {
  score: number | null;
  competitorScores: Record<string, number>;
}

interface GeoLatestResultData {
  runId: string;
  runUrl: string;
  createdAt: string;
  payload: GeoEeatIntensiveResult;
}

export default function ProjectGeoAnalysisPage() {
  const params = useParams();
  const { t } = useI18n();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;

  const [project, setProject] = useState<{ id: string; domain: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<GeoSummaryData | null>(null);
  const [latestResult, setLatestResult] = useState<GeoLatestResultData | null>(null);
  const fetchedForIdRef = useFetchOnceForId();

  useEffect(() => {
    if (!id) return;
    if (fetchedForIdRef.current === id) return;
    fetchedForIdRef.current = id;
    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      setLoading(true);
      setSummary(null);
      setLatestResult(null);
      try {
        const [projectRes, summaryRes, latestRes] = await Promise.all([
          fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ data?: { id: string; domain: string | null } }>,
          fetch(apiProjectGeoSummary(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ success?: boolean; data?: { score?: number | null; competitorScores?: Record<string, number> } }>,
          fetch(apiProjectGeoLatestResult(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
          ) as Promise<{ success?: boolean; data?: GeoLatestResultData | null }>,
        ]);
        if (signal.aborted) return;
        setProject(projectRes?.data ?? null);
        if (summaryRes?.success && summaryRes?.data) {
          setSummary({
            score: summaryRes.data.score ?? null,
            competitorScores: summaryRes.data.competitorScores ?? {},
          });
        }
        if (latestRes?.success && latestRes?.data) {
          setLatestResult(latestRes.data);
        }
      } catch {
        if (!signal.aborted) {
          setProject(null);
          setSummary(null);
          setLatestResult(null);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id, fetchedForIdRef]);

  const payload = latestResult?.payload;
  const pages = payload?.pages ?? [];
  const recommendations = payload?.recommendations ?? [];

  const overviewStats = useMemo(() => {
    if (pages.length === 0)
      return {
        withImpressum: 0,
        totalPages: 0,
        withPrivacy: 0,
        avgEeat: 0,
        avgGeoFitness: 0,
        recommendationCount: 0,
      };
    let withImpressum = 0;
    let withPrivacy = 0;
    let eeatSum = 0;
    let eeatCount = 0;
    let geoSum = 0;
    let geoCount = 0;
    for (const p of pages as GeoEeatPageResult[]) {
      if (p.technical?.hasImpressum === true || p.technical?.eeatSignals?.hasImpressum === true) withImpressum++;
      if (p.technical?.hasPrivacy === true) withPrivacy++;
      const t = p.eeatScores?.trust?.score ?? 0;
      const e = p.eeatScores?.experience?.score ?? 0;
      const ex = p.eeatScores?.expertise?.score ?? 0;
      const a = p.eeatScores?.authoritativeness?.score ?? 0;
      if (t + e + ex + a > 0) {
        eeatSum += (t + e + ex + a) / 4;
        eeatCount++;
      }
      if (typeof p.geoFitnessScore === 'number') {
        geoSum += p.geoFitnessScore;
        geoCount++;
      }
    }
    return {
      withImpressum,
      totalPages: pages.length,
      withPrivacy,
      avgEeat: eeatCount > 0 ? Math.round((eeatSum / eeatCount) * 10) / 10 : 0,
      avgGeoFitness: geoCount > 0 ? Math.round((geoSum / geoCount) * 10) / 10 : 0,
      recommendationCount: recommendations.length,
    };
  }, [pages, recommendations.length]);

  const hasRun = latestResult != null && payload != null;
  const score = summary?.score ?? null;
  const competitorScores = summary?.competitorScores ?? {};
  const scoreLabel = score != null ? scoreToLabel(score) : 'critical';

  const loadingState = loading && !summary && !latestResult;

  return (
    <Box sx={{ py: 'var(--msqdx-spacing-md)', px: 1.5, width: '100%', maxWidth: '100%' }}>
      <Stack sx={{ gap: 2 }}>
        {/* Header card */}
        <MsqdxMoleculeCard
          title={t('projects.geoAnalysis.title')}
          titleVariant="h4"
          variant="flat"
          borderRadius="lg"
          footerDivider
          sx={{ bgcolor: 'var(--color-card-bg)' }}
          actions={
            hasRun ? (
              <Link href={pathGeoEeat(latestResult!.runId)} style={{ textDecoration: 'none' }}>
                <MsqdxButton variant="outlined" size="small">
                  {t('projects.geoAnalysis.openRun')}
                </MsqdxButton>
              </Link>
            ) : null
          }
        >
          {loadingState ? (
            <MsqdxTypography variant="body2" sx={{ py: 1 }}>
              {t('common.loading')}
            </MsqdxTypography>
          ) : !hasRun ? (
            <>
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                {t('projects.geoAnalysis.noRun')}
              </MsqdxTypography>
              <Link href={id ? pathProjectGeo(id) : '#'} style={{ textDecoration: 'none' }}>
                <MsqdxButton variant="outlined" size="small">
                  {t('projects.navGeo')}
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
                {t('projects.geoAnalysis.fromRun')}{' '}
                {latestResult ? new Date(latestResult.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                {hasRun && (
                  <>
                    {' · '}
                    <Link href={pathGeoEeat(latestResult!.runId)} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {t('projects.geoAnalysis.openRun')}
                    </Link>
                  </>
                )}
              </MsqdxTypography>
            </Box>
          )}
        </MsqdxMoleculeCard>

        {hasRun && (
          <>
            {/* Overview – aggregated on-page signals */}
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
                    {t('projects.geoAnalysis.avgEeat')}
                  </MsqdxTypography>
                  <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {overviewStats.avgEeat}
                  </MsqdxTypography>
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                    {t('projects.geoAnalysis.avgGeoFitness')}
                  </MsqdxTypography>
                  <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {overviewStats.avgGeoFitness}
                  </MsqdxTypography>
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

            {/* Pages table */}
            <MsqdxMoleculeCard
              title={t('projects.geoAnalysis.pagesTableTitle')}
              titleVariant="h6"
              variant="flat"
              borderRadius="lg"
              sx={{ bgcolor: 'var(--color-card-bg)', border: '1px solid var(--color-secondary-dx-green)' }}
            >
              <GeoAnalysisPagesTable pages={pages as GeoEeatPageResult[]} />
            </MsqdxMoleculeCard>

            {/* Recommendations */}
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
                  {(recommendations as GeoEeatRecommendation[])
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
