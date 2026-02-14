import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { GenerativeEngineAudit } from '@/lib/types';
import { Brain, FileText, Database, Quote, UserCheck, Bot, CheckCircle2, XCircle } from 'lucide-react';

export function GenerativeOptimizerCard({ data }: { data: GenerativeEngineAudit }) {
    if (!data) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return MSQDX_BRAND_PRIMARY.green;
        if (score >= 50) return MSQDX_STATUS.warning.base;
        return MSQDX_STATUS.error.base;
    };

    return (
        <MsqdxMoleculeCard
            title="Generative Engine Optimization (GEO)"
            subtitle="Optimierung der Sichtbarkeit in KI-Suchmaschinen (ChatGPT, Perplexity, Gemini)."
            variant="flat"
            borderRadius="lg"
            sx={{ height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: MSQDX_SPACING.scale.md }}>
                {/* Global Score */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: alpha(getScoreColor(data.score), 0.05), borderRadius: 2, border: `1px solid ${alpha(getScoreColor(data.score), 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Brain size={32} color={getScoreColor(data.score)} />
                        <Box>
                            <MsqdxTypography variant="h5" sx={{ fontWeight: 800, color: getScoreColor(data.score) }}>
                                {data.score}/100
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, fontWeight: 600, textTransform: 'uppercase' }}>
                                AI Digestibility Score
                            </MsqdxTypography>
                        </Box>
                    </Box>
                    <MsqdxChip
                        label={data.score >= 70 ? 'AI Ready' : 'Optimization Needed'}
                        size="small"
                        sx={{ bgcolor: alpha(getScoreColor(data.score), 0.1), color: getScoreColor(data.score), fontWeight: 700 }}
                    />
                </Box>

                {/* Technical Section */}
                <Box>
                    <SectionHeader icon={<Bot size={18} />} title="Technical AI Readiness" color={MSQDX_STATUS.info.base} />
                    <Box sx={{ display: 'grid', gap: 1 }}>
                        <StatusRow label="llms.txt support" status={data.technical.hasLlmsTxt} />
                        <StatusRow label="AI Bot Access (Robots.txt)" status={data.technical.hasRobotsAllowingAI} />
                        <Box sx={{ mt: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.secondary, mb: 1, display: 'block' }}>Schema.org Coverage</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {data.technical.schemaCoverage.length > 0 ? (
                                    data.technical.schemaCoverage.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    ))
                                ) : (
                                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base }}>No LLM-relevant Schema found</MsqdxTypography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Content Structure */}
                <Box>
                    <SectionHeader icon={<Database size={18} />} title="Content Structure" color={MSQDX_BRAND_PRIMARY.purple} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <MetricItem label="Tables" value={data.content.tableCount} status={data.content.tableCount > 0} />
                        <MetricItem label="FAQ Segments" value={data.content.faqCount} status={data.content.faqCount > 0} />
                        <MetricItem label="Citations" value={data.content.citationDensity} status={data.content.citationDensity > 2} />
                        <MetricItem label="List Density" value={data.content.listDensity} status={data.content.listDensity > 0.5} />
                    </Box>
                </Box>

                {/* E-E-A-T Section */}
                <Box>
                    <SectionHeader icon={<UserCheck size={18} />} title="Authority & Expertise" color={MSQDX_BRAND_PRIMARY.green} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <MsqdxChip
                            icon={data.expertise.hasAuthorBio ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            label="Author Bio detected"
                            size="small"
                            sx={{ bgcolor: data.expertise.hasAuthorBio ? alpha(MSQDX_BRAND_PRIMARY.green, 0.1) : alpha(MSQDX_STATUS.error.base, 0.1), color: data.expertise.hasAuthorBio ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base }}
                        />
                        <MsqdxChip
                            icon={data.expertise.hasExpertCitations ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            label="Expert Citations"
                            size="small"
                            sx={{ bgcolor: data.expertise.hasExpertCitations ? alpha(MSQDX_BRAND_PRIMARY.green, 0.1) : alpha(MSQDX_STATUS.error.base, 0.1), color: data.expertise.hasExpertCitations ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base }}
                        />
                    </Box>
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
}

function SectionHeader({ icon, title, color }: { icon: React.ReactNode, title: string, color: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color }}>
            {icon}
            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</MsqdxTypography>
        </Box>
    );
}

function StatusRow({ label, status }: { label: string, status: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <MsqdxTypography variant="body2" sx={{ color: MSQDX_THEME.dark.text.secondary }}>{label}</MsqdxTypography>
            {status ? <CheckCircle2 size={16} color={MSQDX_BRAND_PRIMARY.green} /> : <XCircle size={16} color={MSQDX_STATUS.error.base} />}
        </Box>
    );
}

function MetricItem({ label, value, status }: { label: string, value: number, status: boolean }) {
    return (
        <Box sx={{ p: 1, borderRadius: 1, border: `1px solid ${MSQDX_THEME.dark.border.subtle}`, bgcolor: alpha(MSQDX_NEUTRAL[900], 0.3) }}>
            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, display: 'block' }}>{label}</MsqdxTypography>
            <MsqdxTypography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 700, color: status ? MSQDX_THEME.dark.text.primary : MSQDX_THEME.dark.text.tertiary }}>
                {value}
            </MsqdxTypography>
        </Box>
    );
}
