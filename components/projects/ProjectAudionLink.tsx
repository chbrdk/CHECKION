'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    MenuItem,
    TextField,
} from '@mui/material';
import { MsqdxButton, MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProjectAudionLink } from '@/lib/constants';

interface AudionLinkStatus {
    configured: boolean;
    linked: boolean;
    reason: string | null;
    reportWarning?: string | null;
    audionReachable?: boolean;
    configMissing?: Array<'AUDION_API_BASE_URL' | 'AUDION_SERVICE_TOKEN'>;
    wrongTokenOnCheckion?: boolean;
    resolvedVia: string | null;
    platformProjectId: string | null;
    audionProjectId: string | null;
    audionProjectName: string | null;
    personaCount: number;
}

interface AudionProjectOption {
    id: string;
    name: string;
    checkionProjectId: string | null;
}

export function ProjectAudionLink({ projectId }: { projectId: string }) {
    const { t } = useI18n();
    const [status, setStatus] = useState<AudionLinkStatus | null>(null);
    const [options, setOptions] = useState<AudionProjectOption[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = useCallback(async (withList: boolean) => {
        setLoading(true);
        setError(null);
        try {
            const url = withList
                ? `${apiProjectAudionLink(projectId)}?list=1`
                : apiProjectAudionLink(projectId);
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) {
                setError(json.error ?? 'Failed to load AUDION status');
                return;
            }
            const data = json.data as AudionLinkStatus & { audionProjects?: AudionProjectOption[] };
            setStatus(data);
            if (data.audionProjects) {
                setOptions(data.audionProjects);
            }
            if (data.audionProjectId) {
                setSelectedId(data.audionProjectId);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load AUDION status');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadStatus(true);
    }, [loadStatus]);

    const handleSave = async () => {
        if (!selectedId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(apiProjectAudionLink(projectId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audionProjectId: selectedId }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error ?? 'Link failed');
                return;
            }
            await loadStatus(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Link failed');
        } finally {
            setSaving(false);
        }
    };

    const reasonLabel = (reason: string | null) => {
        if (!reason) return null;
        const key = `projectAudionLink.reason.${reason}` as const;
        const translated = t(key);
        return translated !== key ? translated : reason;
    };

    return (
        <MsqdxMoleculeCard sx={{ p: 2, mb: 2 }}>
            <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1 }}>
                {t('projectAudionLink.title')}
            </MsqdxTypography>
            <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('projectAudionLink.description')}
            </MsqdxTypography>

            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} />
                    <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
                </Box>
            ) : null}

            {!loading && status && !status.configured ? (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    {status.configMissing?.length
                        ? t('projectAudionLink.notConfiguredDetail', {
                              missing: status.configMissing.join(', '),
                          })
                        : t('projectAudionLink.notConfigured')}
                    {status.wrongTokenOnCheckion ? (
                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                            {t('projectAudionLink.wrongTokenHint')}
                        </Box>
                    ) : null}
                    <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                        {t('projectAudionLink.redeployHint')}
                    </Box>
                </Alert>
            ) : null}

            {!loading && status?.configured ? (
                <>
                    {status.linked ? (
                        <Alert severity="success" sx={{ mb: 1 }}>
                            {t('projectAudionLink.linked', {
                                name: status.audionProjectName ?? status.audionProjectId ?? '—',
                                count: String(status.personaCount),
                            })}
                            {status.resolvedVia === 'platform_project_id'
                                ? ` (${t('projectAudionLink.viaPlatform')})`
                                : ''}
                        </Alert>
                    ) : (
                        <Alert severity="info" sx={{ mb: 1 }}>
                            {t('projectAudionLink.notLinked')}
                            {status.reason ? ` — ${reasonLabel(status.reason)}` : ''}
                        </Alert>
                    )}

                    {status.reportWarning ? (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                            {t('projectAudionLink.reportWarning', {
                                detail: reasonLabel(status.reportWarning) ?? status.reportWarning,
                            })}
                        </Alert>
                    ) : null}

                    {status.audionReachable && options.length > 0 ? (
                        <MsqdxTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {t('projectAudionLink.connected', { count: String(options.length) })}
                        </MsqdxTypography>
                    ) : null}

                    {status.platformProjectId ? (
                        <MsqdxTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {t('projectAudionLink.platformId')}: {status.platformProjectId}
                        </MsqdxTypography>
                    ) : null}

                    <TextField
                        select
                        fullWidth
                        size="small"
                        label={t('projectAudionLink.selectProject')}
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        disabled={saving || options.length === 0}
                        sx={{ mb: 1 }}
                    >
                        <MenuItem value="">
                            <em>{t('projectAudionLink.selectPlaceholder')}</em>
                        </MenuItem>
                        {options.map((opt) => (
                            <MenuItem key={opt.id} value={opt.id}>
                                {opt.name}
                                {opt.checkionProjectId && opt.checkionProjectId !== projectId
                                    ? ` (${t('projectAudionLink.linkedElsewhere')})`
                                    : ''}
                            </MenuItem>
                        ))}
                    </TextField>

                    <MsqdxButton
                        variant="outlined"
                        size="small"
                        onClick={() => void handleSave()}
                        disabled={saving || !selectedId}
                    >
                        {saving ? t('projectAudionLink.saving') : t('projectAudionLink.save')}
                    </MsqdxButton>
                </>
            ) : null}

            {error ? (
                <MsqdxTypography variant="body2" color="error" sx={{ mt: 1 }}>
                    {error}
                </MsqdxTypography>
            ) : null}
        </MsqdxMoleculeCard>
    );
}
