'use client';

import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip } from '@msqdx/react';
import type { ProjectResearchResult } from '@/lib/research/schema';

const researchTextareaStyle = {
    width: '100%' as const,
    padding: '8px 12px',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 4,
    fontSize: 14,
    resize: 'vertical' as const,
};

const researchInputSx = {
    minWidth: 180,
    flex: '1 1 180px',
    px: 1.5,
    py: 1,
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 1,
    fontSize: 14,
};

export interface ProjectResearchResultFormProps {
    researchResult: ProjectResearchResult;
    addTargetGroup: string;
    addKeyword: string;
    addGeoQuery: string;
    addCompetitor: string;
    selectedKeywords: Set<string>;
    onAddTargetGroupChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onValuePropositionChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAddKeywordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddGeoQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddCompetitorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddTargetGroupClick: () => void;
    onAddKeywordClick: () => void;
    onAddGeoQueryClick: () => void;
    onAddCompetitorClick: () => void;
    onRemoveTargetGroup: (item: string) => void;
    onRemoveGeoQuery: (q: string) => void;
    onRemoveCompetitor: (c: string) => void;
    onToggleKeyword: (kw: string) => void;
    onApplyKeywords: () => void;
    onApplyGeoQueries: () => void;
    onApplyCompetitors: () => void;
    t: (key: string) => string;
}

export function ProjectResearchResultForm({
    researchResult,
    addTargetGroup,
    addKeyword,
    addGeoQuery,
    addCompetitor,
    selectedKeywords,
    onAddTargetGroupChange,
    onValuePropositionChange,
    onAddKeywordChange,
    onAddGeoQueryChange,
    onAddCompetitorChange,
    onAddTargetGroupClick,
    onAddKeywordClick,
    onAddGeoQueryClick,
    onAddCompetitorClick,
    onRemoveTargetGroup,
    onRemoveGeoQuery,
    onRemoveCompetitor,
    onToggleKeyword,
    onApplyKeywords,
    onApplyGeoQueries,
    onApplyCompetitors,
    t,
}: ProjectResearchResultFormProps) {
    const valueProp = researchResult.valueProposition ?? '';
    return (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('projects.researchTargetGroups')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {(researchResult.targetGroups ?? []).map((item) => (
                        <MsqdxChip
                            key={item}
                            label={item}
                            onDelete={() => onRemoveTargetGroup(item)}
                            size="small"
                        />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box
                        component="input"
                        placeholder={t('projects.researchAdd')}
                        value={addTargetGroup}
                        onChange={onAddTargetGroupChange}
                        sx={researchInputSx}
                    />
                    <MsqdxButton variant="outlined" size="small" onClick={onAddTargetGroupClick} disabled={!addTargetGroup.trim()}>
                        {t('projects.researchAdd')}
                    </MsqdxButton>
                </Box>
            </Box>
            <Box>
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('projects.researchValueProposition')}
                </MsqdxTypography>
                <textarea value={valueProp} onChange={onValuePropositionChange} rows={2} style={researchTextareaStyle} />
            </Box>
            <Box>
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('projects.researchSeoKeywords')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {(researchResult.seoKeywords ?? []).map((kw) => (
                        <MsqdxChip
                            key={kw}
                            label={kw}
                            onClick={() => onToggleKeyword(kw)}
                            color={selectedKeywords.has(kw) ? 'primary' : 'default'}
                            variant={selectedKeywords.has(kw) ? 'filled' : 'outlined'}
                            size="small"
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box
                        component="input"
                        placeholder={t('projects.researchAdd')}
                        value={addKeyword}
                        onChange={onAddKeywordChange}
                        sx={researchInputSx}
                    />
                    <MsqdxButton variant="outlined" size="small" onClick={onAddKeywordClick} disabled={!addKeyword.trim()}>
                        {t('projects.researchAdd')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" size="small" onClick={onApplyKeywords} disabled={selectedKeywords.size === 0}>
                        {t('projects.researchApplyKeywords')} ({selectedKeywords.size})
                    </MsqdxButton>
                </Box>
            </Box>
            <Box>
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('projects.researchGeoQueries')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {(researchResult.geoQueries ?? []).map((q) => (
                        <MsqdxChip key={q} label={q} onDelete={() => onRemoveGeoQuery(q)} size="small" />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box
                        component="input"
                        placeholder={t('projects.researchAdd')}
                        value={addGeoQuery}
                        onChange={onAddGeoQueryChange}
                        sx={researchInputSx}
                    />
                    <MsqdxButton variant="outlined" size="small" onClick={onAddGeoQueryClick} disabled={!addGeoQuery.trim()}>
                        {t('projects.researchAdd')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" size="small" onClick={onApplyGeoQueries}>
                        {t('projects.researchApplyGeoQueries')}
                    </MsqdxButton>
                </Box>
            </Box>
            <Box>
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('projects.researchCompetitors')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {(researchResult.competitors ?? []).map((c) => (
                        <MsqdxChip key={c} label={c} onDelete={() => onRemoveCompetitor(c)} size="small" />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box
                        component="input"
                        placeholder={t('projects.researchAdd')}
                        value={addCompetitor}
                        onChange={onAddCompetitorChange}
                        sx={researchInputSx}
                    />
                    <MsqdxButton variant="outlined" size="small" onClick={onAddCompetitorClick} disabled={!addCompetitor.trim()}>
                        {t('projects.researchAdd')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" size="small" onClick={onApplyCompetitors}>
                        {t('projects.researchApplyCompetitors')}
                    </MsqdxButton>
                </Box>
            </Box>
        </Box>
    );
}
