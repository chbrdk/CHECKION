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
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                {/* Global Score */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', bgcolor: alpha(getScoreColor(data.score), 0.05), borderRadius: 2, border: `1px solid ${alpha(getScoreColor(data.score), 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)' }}>
                        <Brain size={32} color={getScoreColor(data.score)} />
                        <Box>
                            <MsqdxTypography variant="h5" sx={{ fontWeight: 800, color: getScoreColor(data.score) }}>
                                {data.score}/100
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 600, textTransform: 'uppercase' }}>
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
                    <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-xs)' }}>
                        <StatusRow label="llms.txt support" status={data.technical.hasLlmsTxt} />
                        {data.technical.hasLlmsTxt && data.technical.llmsTxtSections && data.technical.llmsTxtSections.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--msqdx-spacing-xxs)' }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mr: 'var(--msqdx-spacing-xs)' }}>Sections:</MsqdxTypography>
                                {data.technical.llmsTxtSections.map((s, i) => (
                                    <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                                ))}
                                {data.technical.llmsTxtHasSitemap && (
                                    <MsqdxChip label="Sitemap" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.1), color: MSQDX_BRAND_PRIMARY.green }} />
                                )}
                            </Box>
                        )}
                        {data.technical.hasLlmsTxt && data.technical.llmsTxtHasSitemap !== undefined && !data.technical.llmsTxtHasSitemap && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.warning.base }}>llms.txt enthält keine Sitemap-URL</MsqdxTypography>
                        )}
                        <StatusRow label="AI Bot Access (Robots.txt)" status={data.technical.hasRobotsAllowingAI} />
                        {data.technical.aiBotStatus && data.technical.aiBotStatus.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                {data.technical.aiBotStatus.map(({ bot, status }) => (
                                    <MsqdxChip
                                        key={bot}
                                        label={`${bot}: ${status}`}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.6rem',
                                            bgcolor: status === 'allowed' ? alpha(MSQDX_BRAND_PRIMARY.green, 0.1) : alpha(MSQDX_STATUS.error.base, 0.1),
                                            color: status === 'allowed' ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                        {data.technical.metaRobotsContent !== undefined && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Meta Robots</MsqdxTypography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                                    <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: 'var(--color-text-on-light)' }}>
                                        {data.technical.metaRobotsContent || '(nicht gesetzt)'}
                                    </MsqdxTypography>
                                    {data.technical.metaRobotsIndexable ? <CheckCircle2 size={14} color={MSQDX_BRAND_PRIMARY.green} /> : <XCircle size={14} color={MSQDX_STATUS.error.base} />}
                                </Box>
                            </Box>
                        )}
                        {data.technical.metaRobotsIndexable === false && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base }}>Seite ist noindex – nicht in Suchmaschinen/AI indexierbar</MsqdxTypography>
                        )}
                        {data.technical.recommendedSchemaTypesFound && data.technical.recommendedSchemaTypesFound.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xxs)', display: 'block' }}>Empfohlene Schema-Typen (AI)</MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                    {data.technical.recommendedSchemaTypesFound.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.1), color: MSQDX_BRAND_PRIMARY.green }} />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {data.technical.missingRecommendedSchemaTypes && data.technical.missingRecommendedSchemaTypes.length > 0 && (
                            <Box>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xxs)', display: 'block' }}>Fehlende empfohlene Typen</MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                    {data.technical.missingRecommendedSchemaTypes.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', borderColor: alpha(MSQDX_STATUS.warning.base, 0.5), color: 'var(--color-text-muted-on-light)' }} />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {data.technical.articleSchemaQuality && (
                            <Box sx={{ mt: 1, p: 'var(--msqdx-spacing-sm)', borderRadius: 1, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)', display: 'block' }}>Article/NewsArticle Schema</MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                    {['datePublished', 'dateModified', 'author'].map((field) => {
                                        const status = data.technical.articleSchemaQuality![field === 'datePublished' ? 'hasDatePublished' : field === 'dateModified' ? 'hasDateModified' : 'hasAuthor'];
                                        return (
                                            <MsqdxChip
                                                key={field}
                                                icon={status ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                label={field}
                                                size="small"
                                                sx={{ height: 22, fontSize: '0.65rem', bgcolor: status ? alpha(MSQDX_BRAND_PRIMARY.green, 0.1) : alpha(MSQDX_STATUS.error.base, 0.1), color: status ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                        <Box sx={{ mt: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)', display: 'block' }}>Schema.org Coverage</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                {data.technical.schemaCoverage.length > 0 ? (
                                    data.technical.schemaCoverage.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    ))
                                ) : (
                                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base }}>No LLM-relevant Schema found</MsqdxTypography>
                                )}
                            </Box>
                        </Box>
                        {data.technical.jsonLdErrors && data.technical.jsonLdErrors.length > 0 ? (
                            <Box sx={{ mt: 1, p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.error.base, 0.05), border: `1px solid ${alpha(MSQDX_STATUS.error.base, 0.3)}` }}>
                                <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base, fontWeight: 600, display: 'block', mb: 'var(--msqdx-spacing-xs)' }}>
                                    JSON-LD Parse-Fehler
                                </MsqdxTypography>
                                <Box component="ul" sx={{ m: 0, pl: 2, color: 'var(--color-text-on-light)' }}>
                                    {data.technical.jsonLdErrors.map((msg, i) => (
                                        <MsqdxTypography key={i} component="li" variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                            {msg}
                                        </MsqdxTypography>
                                    ))}
                                </Box>
                            </Box>
                        ) : (
                            data.technical.schemaCoverage.length > 0 && (
                                <MsqdxTypography variant="caption" sx={{ color: MSQDX_BRAND_PRIMARY.green, display: 'block', mt: 'var(--msqdx-spacing-xs)' }}>
                                    JSON-LD syntaktisch valide
                                </MsqdxTypography>
                            )
                        )}
                    </Box>
                </Box>

                {/* Content Structure */}
                <Box>
                    <SectionHeader icon={<Database size={18} />} title="Content Structure" color={MSQDX_BRAND_PRIMARY.purple} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--msqdx-spacing-sm)' }}>
                        <MetricItem label="Tables" value={data.content.tableCount} status={data.content.tableCount > 0} />
                        <MetricItem label="FAQ Segments" value={data.content.faqCount} status={data.content.faqCount > 0} />
                        <MetricItem label="Citations" value={data.content.citationDensity} status={data.content.citationDensity > 2} />
                        <MetricItem label="List Density" value={data.content.listDensity} status={data.content.listDensity > 0.5} />
                    </Box>
                </Box>

                {/* E-E-A-T Section */}
                <Box>
                    <SectionHeader icon={<UserCheck size={18} />} title="Authority & Expertise" color={MSQDX_BRAND_PRIMARY.green} />
                    <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)' }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)', color }}>
            {icon}
            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</MsqdxTypography>
        </Box>
    );
}

function StatusRow({ label, status }: { label: string, status: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>{label}</MsqdxTypography>
            {status ? <CheckCircle2 size={16} color={MSQDX_BRAND_PRIMARY.green} /> : <XCircle size={16} color={MSQDX_STATUS.error.base} />}
        </Box>
    );
}

function MetricItem({ label, value, status }: { label: string, value: number, status: boolean }) {
    return (
        <Box sx={{ p: 1, borderRadius: 1, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>{label}</MsqdxTypography>
            <MsqdxTypography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 700, color: status ? 'var(--color-text-on-light)' : 'var(--color-text-muted-on-light)' }}>
                {value}
            </MsqdxTypography>
        </Box>
    );
}
