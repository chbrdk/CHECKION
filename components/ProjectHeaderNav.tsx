'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Box, Tabs, Tab, useMediaQuery, useTheme } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
import { apiProject, pathProject, pathProjectRankings, pathProjectGeo, pathProjectGeoAnalysis, pathProjectResearch, pathProjectWcag, pathProjectSeo } from '@/lib/constants';
import { MSQDX_TABS_THEME_ACCENT_SX } from '@/lib/theme-accent';

/** Renders back button + project sub-nav for use in the app header (headerEnd) when on a project route. */
export function ProjectHeaderNav() {
    const theme = useTheme();
    const isMobileNav = useMediaQuery(theme.breakpoints.down('lg'));
    const params = useParams();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    /** On `/projects/[id]` the route param is the project; on `/domain/[scanId]?projectId=` use the query (path id is the scan, not the project). */
    const id = useMemo(() => {
        if (!pathname) return null;
        if (pathname.startsWith('/projects/')) {
            return typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
        }
        return searchParams.get('projectId');
    }, [pathname, params.id, searchParams]);
    const [projectName, setProjectName] = useState<string | null>(null);
    const fetchedForIdRef = useFetchOnceForId();

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        fetch(apiProject(id), { credentials: 'same-origin', signal })
            .then((r) => r.json())
            .then((data: { data?: { name?: string } }) => {
                if (!signal.aborted) setProjectName(data?.data?.name ?? null);
            })
            .catch(() => { if (!signal.aborted) setProjectName(null); });
        return () => ac.abort();
    }, [id, fetchedForIdRef]);

    const basePath = id ? `/projects/${encodeURIComponent(id)}` : '';
    const isOverview = pathname === basePath || pathname === basePath + '/';
    const isRankings = pathname === basePath + '/rankings';
    const isGeo = pathname === basePath + '/geo';
    const isResearch = pathname === basePath + '/research';
    const isWcag = pathname === basePath + '/wcag';
    const isSeo = pathname === basePath + '/seo';
    const activeTab =
        isRankings ? 'rankings'
        : isGeo ? 'geo'
        : isResearch ? 'research'
        : isSeo ? 'seo'
        : isWcag ? 'wcag'
        : 'overview';

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                gap: { xs: 1, lg: 2 },
                flexWrap: 'nowrap',
                marginLeft: { xs: 0, lg: 'auto' },
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
            }}
        >
            <Link
                href={id ? pathProject(id) : '/projects'}
                style={{ textDecoration: 'none', flexShrink: 0, width: 'auto', display: 'inline-flex' }}
            >
                <MsqdxButton
                    variant="outlined"
                    size="small"
                    sx={{
                        color: '#000',
                        borderColor: 'currentColor',
                        width: 'auto',
                        flexShrink: 0,
                        '&:hover': { borderColor: 'currentColor', backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                >
                    ← {projectName ?? (id ? t('common.loading') : '…')}
                </MsqdxButton>
            </Link>
            <Tabs
                value={activeTab}
                variant="scrollable"
                scrollButtons={isMobileNav ? true : 'auto'}
                allowScrollButtonsMobile
                sx={{
                    minHeight: 44,
                    minWidth: 0,
                    flex: { xs: '1 1 0%', lg: '0 1 auto' },
                    color: '#000',
                    '& .MuiTabs-flexContainer': { gap: 0 },
                    '& .MuiTab-root': {
                        minHeight: 44,
                        py: 0,
                        px: { xs: 1.25, lg: 1 },
                        fontSize: { xs: '0.9rem', lg: undefined },
                        color: '#000',
                        opacity: 0.85,
                        textTransform: 'none',
                    },
                    '& .MuiTabs-scrollButtons': {
                        width: { xs: 40, lg: 28 },
                    },
                    ...MSQDX_TABS_THEME_ACCENT_SX,
                }}
            >
                <Tab label={t('projects.navOverview')} value="overview" href={id ? pathProject(id) : '#'} component={Link} />
                <Tab label={t('projects.navRankings')} value="rankings" href={id ? pathProjectRankings(id) : '#'} component={Link} />
                <Tab label={t('projects.navGeo')} value="geo" href={id ? pathProjectGeo(id) : '#'} component={Link} />
                <Tab label={t('projects.navGeoAnalysis')} value="geoAnalysis" href={id ? pathProjectGeoAnalysis(id) : '#'} component={Link} />
                <Tab label={t('projects.navResearch')} value="research" href={id ? pathProjectResearch(id) : '#'} component={Link} />
                <Tab label={t('projects.navSeo')} value="seo" href={id ? pathProjectSeo(id) : '#'} component={Link} />
                <Tab label={`${t('projects.navPerformance')} (${t('projects.navComingSoon')})`} value="performance" disabled sx={{ opacity: 0.6 }} />
                <Tab label={t('projects.navWcag')} value="wcag" href={id ? pathProjectWcag(id) : '#'} component={Link} />
            </Tabs>
        </Box>
    );
}
