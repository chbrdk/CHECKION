'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Box, Tabs, Tab } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProject, pathProject, pathProjectRankings, pathProjectGeo, pathProjectResearch } from '@/lib/constants';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            {/* Project bar: back button + sub-nav (visually continues header) */}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    px: 2,
                    py: 1,
                    backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
                    color: 'var(--color-theme-accent-contrast, #ffffff)',
                    borderBottom: `1px solid ${THEME_ACCENT_WITH_FALLBACK.borderColor}`,
                }}
            >
                <Link href={id ? pathProject(id) : '/projects'} style={{ textDecoration: 'none' }}>
                    <MsqdxButton
                        variant="outlined"
                        size="small"
                        sx={{
                            color: 'var(--color-theme-accent-contrast, #fff)',
                            borderColor: 'rgba(255,255,255,0.5)',
                            '&:hover': {
                                borderColor: 'var(--color-theme-accent-contrast, #fff)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                            },
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
                        '& .MuiTabs-flexContainer': { gap: 0 },
                        '& .MuiTab-root': { minHeight: 40, py: 0, color: 'rgba(255,255,255,0.8)', textTransform: 'none' },
                        '& .Mui-selected': { color: '#fff', fontWeight: 600 },
                        '& .MuiTabs-indicator': { backgroundColor: '#fff' },
                    }}
                >
                    <Tab
                        label={t('projects.navOverview')}
                        value="overview"
                        href={id ? pathProject(id) : '#'}
                        component={Link}
                    />
                    <Tab
                        label={t('projects.navRankings')}
                        value="rankings"
                        href={id ? pathProjectRankings(id) : '#'}
                        component={Link}
                    />
                    <Tab
                        label={t('projects.navGeo')}
                        value="geo"
                        href={id ? pathProjectGeo(id) : '#'}
                        component={Link}
                    />
                    <Tab
                        label={t('projects.navResearch')}
                        value="research"
                        href={id ? pathProjectResearch(id) : '#'}
                        component={Link}
                    />
                    <Tab label={`${t('projects.navPerformance')} (${t('projects.navComingSoon')})`} value="performance" disabled />
                    <Tab label={`${t('projects.navWcag')} (${t('projects.navComingSoon')})`} value="wcag" disabled />
                </Tabs>
            </Box>
            <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {children}
            </Box>
        </Box>
    );
}
