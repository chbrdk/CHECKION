'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxFormField,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiProjectsList, apiProjectsCreate, apiProject, pathProject } from '@/lib/constants';

interface ProjectRow {
    id: string;
    name: string;
    domain: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function ProjectsPage() {
    const router = useRouter();
    const { t } = useI18n();
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDomain, setFormDomain] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadProjects = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiProjectsList, { credentials: 'same-origin' });
            const data = await res.json();
            setProjects(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const openCreate = () => {
        setEditId(null);
        setFormName('');
        setFormDomain('');
        setDialogOpen(true);
    };

    const openEdit = (p: ProjectRow) => {
        setEditId(p.id);
        setFormName(p.name);
        setFormDomain(p.domain ?? '');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        const name = formName.trim();
        if (!name) return;
        setSubmitLoading(true);
        try {
            if (editId) {
                const res = await fetch(apiProject(editId), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ name, domain: formDomain.trim() || null }),
                });
                if (res.ok) {
                    setDialogOpen(false);
                    loadProjects();
                }
            } else {
                const res = await fetch(apiProjectsCreate, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ name, domain: formDomain.trim() || null }),
                });
                const data = await res.json();
                if (data?.id) {
                    setDialogOpen(false);
                    router.push(pathProject(data.id));
                }
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('projects.deleteConfirm'))) return;
        try {
            const res = await fetch(apiProject(id), { method: 'DELETE', credentials: 'same-origin' });
            if (res.ok) {
                setDeleteConfirmId(null);
                loadProjects();
            }
        } catch {
            // ignore
        }
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <Box>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                        {t('projects.title')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('projects.subtitle')}
                    </MsqdxTypography>
                </Box>
                <MsqdxButton
                    variant="contained"
                    brandColor="green"
                    size="medium"
                    startIcon="add"
                    onClick={openCreate}
                >
                    {t('projects.new')}
                </MsqdxButton>
            </Box>

            <MsqdxMoleculeCard
                title=""
                variant="flat"
                borderRadius="lg"
                footerDivider={false}
                sx={{ bgcolor: 'var(--color-card-bg)' }}
            >
                {loading ? (
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('common.loading')}
                    </MsqdxTypography>
                ) : projects.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                            {t('projects.noProjects')}
                        </MsqdxTypography>
                        <MsqdxButton variant="contained" brandColor="green" size="medium" onClick={openCreate}>
                            {t('projects.noProjectsCta')}
                        </MsqdxButton>
                    </Box>
                ) : (
                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {projects.map((p) => (
                            <Box
                                key={p.id}
                                component="li"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    py: 1.5,
                                    px: 1.5,
                                    borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                    '&:last-child': { borderBottom: 'none' },
                                }}
                            >
                                <Box
                                    sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                    onClick={() => router.push(pathProject(p.id))}
                                >
                                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {p.name}
                                    </MsqdxTypography>
                                    {p.domain && (
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                            {p.domain}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <MsqdxButton variant="outlined" size="small" onClick={() => openEdit(p)}>
                                        {t('projects.editProject')}
                                    </MsqdxButton>
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        onClick={() => setDeleteConfirmId(p.id)}
                                    >
                                        {t('projects.deleteProject')}
                                    </MsqdxButton>
                                    <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => router.push(pathProject(p.id))}>
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </MsqdxMoleculeCard>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{editId ? t('projects.editProject') : t('projects.newProject')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 0.5 }}>
                        <MsqdxFormField
                            label={t('projects.name')}
                            placeholder={t('projects.namePlaceholder')}
                            value={formName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.domain')}
                            placeholder={t('projects.domainPlaceholder')}
                            value={formDomain}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDomain(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <MsqdxButton variant="outlined" onClick={() => setDialogOpen(false)}>
                        {t('projects.cancel')}
                    </MsqdxButton>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        onClick={handleSubmit}
                        disabled={!formName.trim() || submitLoading}
                    >
                        {submitLoading ? t('projects.creating') : t('projects.save')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>

            <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{t('projects.deleteProject')}</DialogTitle>
                <DialogContent>
                    <MsqdxTypography variant="body2">{t('projects.deleteConfirm')}</MsqdxTypography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <MsqdxButton variant="outlined" onClick={() => setDeleteConfirmId(null)}>
                        {t('projects.cancel')}
                    </MsqdxButton>
                    <MsqdxButton
                        variant="contained"
                        color="error"
                        onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                    >
                        {t('projects.deleteProject')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
