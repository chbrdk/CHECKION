'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxTabs,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiScansDomainList,
    apiScanJourneyAgentHistory,
    apiScanGeoEeatHistory,
    apiScanList,
    pathDomain,
    pathJourneyAgent,
    pathGeoEeat,
    pathResults,
    PATH_SCAN,
    PATH_SCAN_DOMAIN,
} from '@/lib/constants';

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    counts: { domainScans: number; journeyRuns: number; geoEeatRuns: number; singleScans: number };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [domainScans, setDomainScans] = useState<Array<{ id: string; domain: string; timestamp: string; status: string }>>([]);
    const [journeyRuns, setJourneyRuns] = useState<Array<{ id: string; url: string; task: string; status: string; createdAt: string }>>([]);
    const [geoRuns, setGeoRuns] = useState<Array<{ id: string; url: string; status: string; createdAt: string }>>([]);
    const [singleScans, setSingleScans] = useState<Array<{ id: string; url: string; timestamp: string }>>([]);
    const [listsLoading, setListsLoading] = useState(false);

    const loadProject = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (data?.data) setProject(data.data);
            else setProject(null);
        } catch {
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        setListsLoading(true);
        Promise.all([
            fetch(apiScansDomainList({ limit: 100, page: 1, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanJourneyAgentHistory({ limit: 100, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanGeoEeatHistory({ limit: 100, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanList({ limit: 100, page: 1, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
        ])
            .then(([domainRes, journeyRes, geoRes, scanRes]) => {
                setDomainScans(Array.isArray(domainRes?.data) ? domainRes.data : []);
                setJourneyRuns(Array.isArray(journeyRes?.runs) ? journeyRes.runs : Array.isArray(journeyRes?.data) ? journeyRes.data : []);
                setGeoRuns(Array.isArray(geoRes?.runs) ? geoRes.runs : Array.isArray(geoRes?.data) ? geoRes.data : []);
                setSingleScans(Array.isArray(scanRes?.data) ? scanRes.data : []);
            })
            .catch(() => {
                setDomainScans([]);
                setJourneyRuns([]);
                setGeoRuns([]);
                setSingleScans([]);
            })
            .finally(() => setListsLoading(false));
    }, [id]);

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (loading || !project) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{loading ? t('common.loading') : t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    const tabs = [
        { label: `${t('projects.domainScans')} (${project.counts.domainScans})`, value: 0 },
        { label: `${t('projects.journeyRuns')} (${project.counts.journeyRuns})`, value: 1 },
        { label: `${t('projects.geoEeatRuns')} (${project.counts.geoEeatRuns})`, value: 2 },
        { label: `${t('projects.singleScans')} (${project.counts.singleScans})`, value: 3 },
    ];

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {project.name}
                </MsqdxTypography>
                {project.domain && (
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {project.domain}
                    </MsqdxTypography>
                )}
            </Box>

            <MsqdxTabs
                value={tab}
                onChange={(v) => setTab(typeof v === 'number' ? v : 0)}
                tabs={tabs}
                sx={{ mb: 2 }}
            />

            <MsqdxMoleculeCard variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)' }}>
                {listsLoading ? (
                    <MsqdxTypography variant="body2" sx={{ py: 2 }}>{t('common.loading')}</MsqdxTypography>
                ) : tab === 0 ? (
                    domainScans.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('projects.emptyDomainScans')}
                            </MsqdxTypography>
                            <MsqdxButton variant="contained" brandColor="green" onClick={() => router.push(PATH_SCAN_DOMAIN)}>
                                {t('projects.startDeepScan')}
                            </MsqdxButton>
                        </Box>
                    ) : (
                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                            {domainScans.map((ds) => (
                                <Box
                                    key={ds.id}
                                    component="li"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        py: 1,
                                        px: 1.5,
                                        borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                    }}
                                >
                                    <MsqdxTypography variant="body2">{ds.domain}</MsqdxTypography>
                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathDomain(ds.id))}>
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Box>
                            ))}
                        </Box>
                    )
                ) : tab === 1 ? (
                    journeyRuns.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('projects.emptyJourneyRuns')}
                            </MsqdxTypography>
                            <MsqdxButton variant="contained" brandColor="green" onClick={() => router.push(PATH_SCAN)}>
                                {t('projects.startJourney')}
                            </MsqdxButton>
                        </Box>
                    ) : (
                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                            {journeyRuns.map((j) => (
                                <Box
                                    key={j.id}
                                    component="li"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        py: 1,
                                        px: 1.5,
                                        borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                    }}
                                >
                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                        {j.task || j.url}
                                    </MsqdxTypography>
                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathJourneyAgent(j.id))}>
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Box>
                            ))}
                        </Box>
                    )
                ) : tab === 2 ? (
                    geoRuns.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('projects.emptyGeoEeatRuns')}
                            </MsqdxTypography>
                            <MsqdxButton variant="contained" brandColor="green" onClick={() => router.push(PATH_SCAN)}>
                                {t('projects.startGeoEeat')}
                            </MsqdxButton>
                        </Box>
                    ) : (
                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                            {geoRuns.map((g) => (
                                <Box
                                    key={g.id}
                                    component="li"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        py: 1,
                                        px: 1.5,
                                        borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                    }}
                                >
                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                        {g.url}
                                    </MsqdxTypography>
                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathGeoEeat(g.id))}>
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Box>
                            ))}
                        </Box>
                    )
                ) : (
                    singleScans.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('projects.emptySingleScans')}
                            </MsqdxTypography>
                            <MsqdxButton variant="contained" brandColor="green" onClick={() => router.push(PATH_SCAN)}>
                                {t('projects.startScan')}
                            </MsqdxButton>
                        </Box>
                    ) : (
                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                            {singleScans.map((s) => (
                                <Box
                                    key={s.id}
                                    component="li"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        py: 1,
                                        px: 1.5,
                                        borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                    }}
                                >
                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                        {s.url}
                                    </MsqdxTypography>
                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathResults(s.id))}>
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Box>
                            ))}
                        </Box>
                    )
                )}
            </MsqdxMoleculeCard>
        </Box>
    );
}
