'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxFormField } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProjectsList,
    apiProjectsCreate,
    apiScanProject,
    apiScansDomainProject,
    apiScanJourneyAgentProject,
    apiScanGeoEeatProject,
    pathProject,
} from '@/lib/constants';

export type AddToProjectResourceType = 'single' | 'domain' | 'journey' | 'geo_eeat';

interface AddToProjectProps {
    resourceType: AddToProjectResourceType;
    resourceId: string;
    currentProjectId: string | null;
    currentProjectName?: string | null;
    onAssigned?: () => void;
}

const ASSIGN_ENDPOINTS: Record<AddToProjectResourceType, (id: string) => string> = {
    single: apiScanProject,
    domain: apiScansDomainProject,
    journey: apiScanJourneyAgentProject,
    geo_eeat: apiScanGeoEeatProject,
};

export function AddToProject({ resourceType, resourceId, currentProjectId, currentProjectName, onAssigned }: AddToProjectProps) {
    const { t } = useI18n();
    const [projects, setProjects] = useState<Array<{ id: string; name: string; domain: string | null }>>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDomain, setCreateDomain] = useState('');
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const loadProjects = useCallback(() => {
        setLoading(true);
        fetch(apiProjectsList, { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data) => setProjects(Array.isArray(data?.data) ? data.data : []))
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const assignTo = useCallback(
        async (projectId: string | null) => {
            const url = ASSIGN_ENDPOINTS[resourceType](resourceId);
            setAssigning(true);
            try {
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ projectId }),
                });
                if (res.ok) {
                    setAnchorEl(null);
                    onAssigned?.();
                }
            } finally {
                setAssigning(false);
            }
        },
        [resourceType, resourceId, onAssigned]
    );

    const handleCreateAndAssign = useCallback(async () => {
        const name = createName.trim();
        if (!name) return;
        setCreateSubmitting(true);
        try {
            const res = await fetch(apiProjectsCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ name, domain: createDomain.trim() || null }),
            });
            const data = await res.json();
            if (data?.id) {
                setCreateOpen(false);
                setCreateName('');
                setCreateDomain('');
                await assignTo(data.id);
            }
        } finally {
            setCreateSubmitting(false);
        }
    }, [createName, createDomain, assignTo]);

    const openMenu = (e: React.MouseEvent<HTMLElement>) => {
        loadProjects();
        setAnchorEl(e.currentTarget);
    };

    return (
        <Box sx={{ display: 'inline-flex' }}>
            <MsqdxButton
                variant="outlined"
                size="small"
                onClick={openMenu}
                disabled={loading || assigning}
            >
                {currentProjectId && currentProjectName
                    ? t('projects.assignedTo', { name: currentProjectName })
                    : t('projects.addToProject')}
            </MsqdxButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ sx: { minWidth: 220, borderRadius: 'var(--msqdx-spacing-sm, 4px)' } }}
            >
                <MenuItem
                    onClick={() => {
                        setCreateOpen(true);
                        setAnchorEl(null);
                    }}
                >
                    {t('projects.createNew')}
                </MenuItem>
                {currentProjectId && (
                    <MenuItem onClick={() => assignTo(null)}>
                        {t('projects.removeFromProject')}
                    </MenuItem>
                )}
                {projects.map((p) => (
                    <MenuItem
                        key={p.id}
                        onClick={() => assignTo(p.id)}
                        selected={currentProjectId === p.id}
                    >
                        {p.name}
                    </MenuItem>
                ))}
            </Menu>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{t('projects.createProject')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
                        <MsqdxFormField
                            label={t('projects.name')}
                            placeholder={t('projects.namePlaceholder')}
                            value={createName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateName(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.domain')}
                            placeholder={t('projects.domainPlaceholder')}
                            value={createDomain}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDomain(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <MsqdxButton variant="outlined" onClick={() => setCreateOpen(false)}>
                        {t('projects.cancel')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" brandColor="green" onClick={handleCreateAndAssign} disabled={!createName.trim() || createSubmitting}>
                        {createSubmitting ? t('projects.creating') : t('projects.save')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
