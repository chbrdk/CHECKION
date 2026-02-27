'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard, MsqdxFormField } from '@msqdx/react';
import { Share2, Copy, Trash2, Lock, LockOpen } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { ShareResourceType } from '@/lib/db/shares';

interface ShareInfo {
    token: string;
    url: string;
    hasPassword: boolean;
    createdAt: string;
}

interface SharePanelProps {
    resourceType: ShareResourceType;
    resourceId: string;
    /** Label namespace for Share/Copy (e.g. 'results' or 'domainResult') for share/create/copied */
    labelNamespace?: 'results' | 'domainResult';
}

export function SharePanel({ resourceType, resourceId, labelNamespace = 'results' }: SharePanelProps) {
    const { t } = useI18n();
    const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [revokeLoading, setRevokeLoading] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createPassword, setCreatePassword] = useState('');
    const [patchLoading, setPatchLoading] = useState(false);

    const fetchShare = useCallback(() => {
        if (!resourceId) return;
        setLoading(true);
        fetch(`/api/share/by-resource?type=${encodeURIComponent(resourceType)}&id=${encodeURIComponent(resourceId)}`)
            .then((res) => {
                if (res.ok) return res.json();
                if (res.status === 404) return null;
                throw new Error('Failed to load');
            })
            .then((data) => {
                setShareInfo(data?.token && data?.url ? data : null);
            })
            .catch(() => setShareInfo(null))
            .finally(() => setLoading(false));
    }, [resourceType, resourceId]);

    useEffect(() => {
        fetchShare();
    }, [fetchShare]);

    const handleCopy = useCallback(() => {
        if (!shareInfo?.url) return;
        navigator.clipboard.writeText(shareInfo.url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    }, [shareInfo?.url]);

    const handleCreate = useCallback(() => {
        setCreateLoading(true);
        fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: resourceType,
                id: resourceId,
                password: createPassword.trim() || undefined,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.url) {
                    setShareInfo({
                        token: data.token,
                        url: data.url,
                        hasPassword: data.hasPassword ?? false,
                        createdAt: new Date().toISOString(),
                    });
                    setCreateDialogOpen(false);
                    setCreatePassword('');
                    navigator.clipboard.writeText(data.url);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                }
            })
            .finally(() => setCreateLoading(false));
    }, [resourceType, resourceId, createPassword]);

    const handleRevoke = useCallback(() => {
        if (!shareInfo?.token || !window.confirm(t('share.revokeConfirm'))) return;
        setRevokeLoading(true);
        fetch(`/api/share/${encodeURIComponent(shareInfo.token)}`, { method: 'DELETE' })
            .then((res) => {
                if (res.ok) setShareInfo(null);
            })
            .finally(() => setRevokeLoading(false));
    }, [shareInfo?.token, t]);

    const handlePatchPassword = useCallback(() => {
        if (!shareInfo?.token) return;
        setPatchLoading(true);
        fetch(`/api/share/${encodeURIComponent(shareInfo.token)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordValue.trim() || null }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.ok) {
                    setShareInfo((s) => (s ? { ...s, hasPassword: data.hasPassword } : null));
                    setPasswordDialogOpen(false);
                    setPasswordValue('');
                }
            })
            .finally(() => setPatchLoading(false));
    }, [shareInfo?.token, passwordValue]);

    if (loading) {
        return (
            <MsqdxButton variant="outlined" size="small" startIcon={<Share2 size={14} />} disabled>
                {t(`${labelNamespace}.shareCreating`)}
            </MsqdxButton>
        );
    }

    if (shareInfo) {
        const shortUrl = shareInfo.url.length > 48 ? shareInfo.url.slice(0, 24) + '…' + shareInfo.url.slice(-20) : shareInfo.url;
        return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('share.alreadyShared')}
                    {shareInfo.hasPassword && ` · ${t('share.protected')}`}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={shareInfo.url}>
                    {shortUrl}
                </MsqdxTypography>
                <MsqdxButton variant="outlined" size="small" startIcon={<Copy size={14} />} onClick={handleCopy}>
                    {copySuccess ? t('share.copied') : t('share.copyLink')}
                </MsqdxButton>
                <MsqdxButton
                    variant="outlined"
                    size="small"
                    startIcon={shareInfo.hasPassword ? <LockOpen size={14} /> : <Lock size={14} />}
                    onClick={() => {
                        setPasswordValue('');
                        setPasswordDialogOpen(true);
                    }}
                >
                    {shareInfo.hasPassword ? t('share.removePassword') : t('share.setPassword')}
                </MsqdxButton>
                <MsqdxButton variant="outlined" size="small" color="error" startIcon={<Trash2 size={14} />} onClick={handleRevoke} disabled={revokeLoading}>
                    {t('share.revoke')}
                </MsqdxButton>

                {passwordDialogOpen && (
                    <Box
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(0,0,0,0.4)',
                            p: 2,
                        }}
                        onClick={() => setPasswordDialogOpen(false)}
                        role="presentation"
                    >
                        <Box onClick={(e) => e.stopPropagation()} sx={{ width: '100%', maxWidth: 400 }}>
                            <MsqdxMoleculeCard
                                variant="flat"
                                borderRadius="lg"
                                sx={{
                                    width: '100%',
                                    p: 'var(--msqdx-spacing-lg)',
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    bgcolor: 'var(--color-card-bg)',
                                }}
                                title={shareInfo.hasPassword ? t('share.removePassword') : t('share.setPassword')}
                            >
                            <Stack sx={{ gap: 'var(--msqdx-spacing-md)', mt: 1 }}>
                                <MsqdxFormField
                                    label={t('share.passwordLabel')}
                                    type="password"
                                    value={passwordValue}
                                    onChange={(e) => setPasswordValue((e.target as HTMLInputElement).value)}
                                    placeholder={t('share.passwordPlaceholder')}
                                    fullWidth
                                    autoComplete="new-password"
                                />
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <MsqdxButton variant="outlined" onClick={() => setPasswordDialogOpen(false)}>
                                        {t('common.cancel')}
                                    </MsqdxButton>
                                    <MsqdxButton variant="contained" onClick={handlePatchPassword} disabled={patchLoading}>
                                        {patchLoading ? t('common.saving') : t('common.save')}
                                    </MsqdxButton>
                                </Box>
                            </Stack>
                            </MsqdxMoleculeCard>
                        </Box>
                    </Box>
                )}
            </Box>
        );
    }

    return (
        <>
            <MsqdxButton
                variant="outlined"
                size="small"
                startIcon={<Share2 size={14} />}
                onClick={() => setCreateDialogOpen(true)}
            >
                {t(`${labelNamespace}.share`)}
            </MsqdxButton>
            {createDialogOpen && (
                <Box
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.4)',
                        p: 2,
                    }}
                    onClick={() => setCreateDialogOpen(false)}
                    role="presentation"
                >
                    <Box onClick={(e) => e.stopPropagation()} sx={{ width: '100%', maxWidth: 400 }}>
                        <MsqdxMoleculeCard
                            variant="flat"
                            borderRadius="lg"
                            sx={{
                                width: '100%',
                                p: 'var(--msqdx-spacing-lg)',
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                bgcolor: 'var(--color-card-bg)',
                            }}
                            title={t('share.createShare')}
                        >
                            <Stack sx={{ gap: 'var(--msqdx-spacing-md)', mt: 1 }}>
                                <MsqdxFormField
                                    label={t('share.passwordLabel')}
                                    type="password"
                                    value={createPassword}
                                    onChange={(e) => setCreatePassword((e.target as HTMLInputElement).value)}
                                    placeholder={t('share.passwordPlaceholder')}
                                    fullWidth
                                    autoComplete="new-password"
                                />
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <MsqdxButton variant="outlined" onClick={() => setCreateDialogOpen(false)}>
                                        {t('common.cancel')}
                                    </MsqdxButton>
                                    <MsqdxButton variant="contained" onClick={handleCreate} disabled={createLoading}>
                                        {createLoading ? t('share.creating') : t('share.createShare')}
                                    </MsqdxButton>
                                </Box>
                            </Stack>
                        </MsqdxMoleculeCard>
                    </Box>
                </Box>
            )}
        </>
    );
}
