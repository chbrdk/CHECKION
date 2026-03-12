'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxTabs,
    MsqdxFormField,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiScansDomainList,
    apiScanJourneyAgentHistory,
    apiScanGeoEeatHistory,
    apiScanList,
    API_RANK_TRACKING_KEYWORDS,
    apiRankTrackingKeywords,
    apiRankTrackingKeyword,
    apiRankTrackingRefresh,
    pathDomain,
    pathJourneyAgent,
    pathGeoEeat,
    pathResults,
    PATH_SCAN,
    PATH_SCAN_DOMAIN,
} from '@/lib/constants';

interface RankKeywordItem {
    id: string;
    domain: string;
    keyword: string;
    country?: string;
    device?: string;
    lastPosition?: number;
    lastRecordedAt?: string;
}

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    counts: { domainScans: number; journeyRuns: number; geoEeatRuns: number; singleScans: number; rankTrackingKeywords: number };
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
    const [rankKeywords, setRankKeywords] = useState<RankKeywordItem[]>([]);
    const [listsLoading, setListsLoading] = useState(false);
    const [addKeywordOpen, setAddKeywordOpen] = useState(false);
    const [addKeywordDomain, setAddKeywordDomain] = useState('');
    const [addKeywordKeyword, setAddKeywordKeyword] = useState('');
    const [addKeywordCountry, setAddKeywordCountry] = useState('');
    const [addKeywordDevice, setAddKeywordDevice] = useState('');
    const [addKeywordSubmitting, setAddKeywordSubmitting] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);

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
            fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' }).then((r) => r.json()),
        ])
            .then(([domainRes, journeyRes, geoRes, scanRes, rankRes]) => {
                setDomainScans(Array.isArray(domainRes?.data) ? domainRes.data : []);
                setJourneyRuns(Array.isArray(journeyRes?.runs) ? journeyRes.runs : Array.isArray(journeyRes?.data) ? journeyRes.data : []);
                setGeoRuns(Array.isArray(geoRes?.runs) ? geoRes.runs : Array.isArray(geoRes?.data) ? geoRes.data : []);
                setSingleScans(Array.isArray(scanRes?.data) ? scanRes.data : []);
                setRankKeywords(Array.isArray(rankRes?.data) ? rankRes.data : []);
            })
            .catch(() => {
                setDomainScans([]);
                setJourneyRuns([]);
                setGeoRuns([]);
                setSingleScans([]);
                setRankKeywords([]);
            })
            .finally(() => setListsLoading(false));
    }, [id]);

    const handleAddKeyword = useCallback(async () => {
        if (!id || !addKeywordDomain.trim() || !addKeywordKeyword.trim()) return;
        setAddKeywordSubmitting(true);
        try {
            const res = await fetch(API_RANK_TRACKING_KEYWORDS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    projectId: id,
                    domain: addKeywordDomain.trim(),
                    keyword: addKeywordKeyword.trim(),
                    country: addKeywordCountry.trim() || undefined,
                    device: addKeywordDevice.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data?.success) {
                setAddKeywordOpen(false);
                setAddKeywordDomain('');
                setAddKeywordKeyword('');
                setAddKeywordCountry('');
                setAddKeywordDevice('');
                loadProject();
                const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
                const listData = await listRes.json();
                setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
            }
        } finally {
            setAddKeywordSubmitting(false);
        }
    }, [id, addKeywordDomain, addKeywordKeyword, addKeywordCountry, addKeywordDevice, loadProject]);

    const handleRefreshRankings = useCallback(async () => {
        if (!id) return;
        setRefreshError(null);
        setRefreshLoading(true);
        try {
            const res = await fetch(apiRankTrackingRefresh(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ projectId: id }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success) {
                loadProject();
                const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
                const listData = await listRes.json();
                setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
            } else if (!res.ok && typeof data?.error === 'string') {
                setRefreshError(data.error);
            } else if (!res.ok) {
                setRefreshError(res.status === 502 ? t('projects.rankingsRefresh502') : t('common.error'));
            }
        } catch {
            setRefreshError(t('common.error'));
        } finally {
            setRefreshLoading(false);
        }
    }, [id, loadProject, t]);

    const handleDeleteKeyword = useCallback(async (keywordId: string) => {
        if (!id) return;
        try {
            const res = await fetch(apiRankTrackingKeyword(keywordId), { method: 'DELETE', credentials: 'same-origin' });
            if (res.ok) {
                loadProject();
                setRankKeywords((prev) => prev.filter((k) => k.id !== keywordId));
            }
        } catch {
            // ignore
        }
    }, [id, loadProject]);

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

    const rankCount = 'rankTrackingKeywords' in project.counts ? project.counts.rankTrackingKeywords : 0;
    const tabs = [
        { label: `${t('projects.domainScans')} (${project.counts.domainScans})`, value: 0 },
        { label: `${t('projects.journeyRuns')} (${project.counts.journeyRuns})`, value: 1 },
        { label: `${t('projects.geoEeatRuns')} (${project.counts.geoEeatRuns})`, value: 2 },
        { label: `${t('projects.singleScans')} (${project.counts.singleScans})`, value: 3 },
        { label: `${t('projects.rankings')} (${rankCount})`, value: 4 },
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

            <Box sx={{ mb: 2 }}>
                <MsqdxTabs
                    value={tab}
                    onChange={(v) => setTab(typeof v === 'number' ? v : 0)}
                    tabs={tabs}
                />
            </Box>

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
                ) : tab === 3 ? (
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
                ) : (
                    rankKeywords.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                {t('projects.emptyRankings')}
                            </MsqdxTypography>
                            <MsqdxButton variant="contained" brandColor="green" onClick={() => setAddKeywordOpen(true)}>
                                {t('projects.addKeyword')}
                            </MsqdxButton>
                        </Box>
                    ) : (
                        <Box sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => setAddKeywordOpen(true)}>
                                    {t('projects.addKeyword')}
                                </MsqdxButton>
                                <MsqdxButton variant="outlined" size="small" onClick={handleRefreshRankings} disabled={refreshLoading}>
                                    {refreshLoading ? t('common.loading') : t('projects.refreshRankings')}
                                </MsqdxButton>
                            </Box>
                            {refreshError && (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error, #b71c1c)', mb: 2 }}>
                                    {refreshError}
                                </MsqdxTypography>
                            )}
                            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                {rankKeywords.map((k) => (
                                    <Box
                                        key={k.id}
                                        component="li"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                            py: 1,
                                            px: 1.5,
                                            borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
                                            <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {k.domain} — {k.keyword}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                {t('projects.lastPosition')}: {k.lastPosition != null ? k.lastPosition : '—'} · {t('projects.lastUpdate')}: {k.lastRecordedAt ? new Date(k.lastRecordedAt).toLocaleDateString() : '—'}
                                            </MsqdxTypography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <MsqdxButton variant="outlined" size="small" color="error" onClick={() => handleDeleteKeyword(k.id)}>
                                                {t('projects.deleteKeyword')}
                                            </MsqdxButton>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )
                )}
            </MsqdxMoleculeCard>

            <Dialog open={addKeywordOpen} onClose={() => setAddKeywordOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{t('projects.addKeyword')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 0.5 }}>
                        <MsqdxFormField
                            label={t('projects.domain')}
                            placeholder={t('projects.domainPlaceholder')}
                            value={addKeywordDomain}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordDomain(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.keyword')}
                            placeholder={t('projects.keywordPlaceholder')}
                            value={addKeywordKeyword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordKeyword(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.country')}
                            placeholder={t('projects.countryPlaceholder')}
                            value={addKeywordCountry}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordCountry(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.device')}
                            placeholder={t('projects.devicePlaceholder')}
                            value={addKeywordDevice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordDevice(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <MsqdxButton variant="outlined" onClick={() => setAddKeywordOpen(false)}>
                        {t('projects.cancel')}
                    </MsqdxButton>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        onClick={handleAddKeyword}
                        disabled={!addKeywordDomain.trim() || !addKeywordKeyword.trim() || addKeywordSubmitting}
                    >
                        {addKeywordSubmitting ? t('projects.creating') : t('projects.save')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
