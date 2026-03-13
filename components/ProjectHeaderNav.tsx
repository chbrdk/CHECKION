'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Box, Tabs, Tab } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProject, pathProject, pathProjectRankings, pathProjectGeo, pathProjectResearch } from '@/lib/constants';

/** Renders back button + project sub-nav for use in the app header (headerEnd) when on a project route. */
export function ProjectHeaderNav() {
    const params = useParams();
    const pathname = usePathname();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [projectName, setProjectName] = useState<string | null>(null);

    const loadProject = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            setProjectName(data?.data?.name ?? null);
        } catch {
            setProjectName(null);
        }
    }, [id]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    const basePath = id ? `/projects/${encodeURIComponent(id)}` : '';
    const isOverview = pathname === basePath || pathname === basePath + '/';
    const isRankings = pathname === basePath + '/rankings';
    const isGeo = pathname === basePath + '/geo';
    const isResearch = pathname === basePath + '/research';
    const activeTab =
        isRankings ? 'rankings'
        : isGeo ? 'geo'
        : isResearch ? 'research'
        : 'overview';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 2,
                flexWrap: 'nowrap',
                marginLeft: 'auto',
                marginLeft: 'auto',
                minWidth: 0,
            }}
        >
            <Link href={id ? pathProject(id) : '/projects'} style={{ textDecoration: 'none' }}>
                <MsqdxButton
                    variant="outlined"
                    size="small"
                    sx={{
                        color: '#000',
                        borderColor: 'currentColor',
                        '&:hover': { borderColor: 'currentColor', backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                >
                    ← {projectName ?? (id ? t('common.loading') : '…')}
                </MsqdxButton>
            </Link>
            <Tabs
                value={activeTab}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                    minHeight: 40,
                    color: '#000',
                    '& .MuiTabs-flexContainer': { gap: 0 },
                    '& .MuiTab-root': { minHeight: 40, py: 0, color: '#000', opacity: 0.85, textTransform: 'none' },
                    '& .Mui-selected': { opacity: 1, fontWeight: 600 },
                    '& .MuiTabs-indicator': { backgroundColor: '#000' },
                }}
            >
                <Tab label={t('projects.navOverview')} value="overview" href={id ? pathProject(id) : '#'} component={Link} />
                <Tab label={t('projects.navRankings')} value="rankings" href={id ? pathProjectRankings(id) : '#'} component={Link} />
                <Tab label={t('projects.navGeo')} value="geo" href={id ? pathProjectGeo(id) : '#'} component={Link} />
                <Tab label={t('projects.navResearch')} value="research" href={id ? pathProjectResearch(id) : '#'} component={Link} />
                <Tab label={`${t('projects.navPerformance')} (${t('projects.navComingSoon')})`} value="performance" disabled sx={{ opacity: 0.6 }} />
                <Tab label={`${t('projects.navWcag')} (${t('projects.navComingSoon')})`} value="wcag" disabled sx={{ opacity: 0.6 }} />
            </Tabs>
        </Box>
    );
}
