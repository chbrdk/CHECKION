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

    const textPrimary = MSQDX_THEME.light.text.primary;
    const textTertiary = MSQDX_THEME.light.text.tertiary;

    return (
        <MsqdxMoleculeCard
            title="Generative Engine Optimization (GEO)"
            subtitle="Optimierung der Sichtbarkeit in KI-Suchmaschinen (ChatGPT, Perplexity, Gemini)."
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: MSQDX_THEME.light.surface.primary, color: textPrimary, height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                {/* Global Score */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', bgcolor: alpha(getScoreColor(data.score), 0.08), borderRadius: 2, border: `1px solid ${alpha(getScoreColor(data.score), 0.25)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)' }}>
                        <Brain size={32} color={getScoreColor(data.score)} />
                        <Box>
                            <MsqdxTypography variant="h5" sx={{ fontWeight: 800, color: getScoreColor(data.score) }}>
                                {data.score}/100
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary, fontWeight: 600, textTransform: 'uppercase' }}>
                                Score für KI-Auswertbarkeit
                            </MsqdxTypography>
                        </Box>
                    </Box>
                    <MsqdxChip
                        label={data.score >= 70 ? 'KI-bereit' : 'Optimierung nötig'}
                        size="small"
                        sx={{ bgcolor: alpha(getScoreColor(data.score), 0.12), color: getScoreColor(data.score), fontWeight: 700 }}
                    />
                </Box>

                {/* Technical Section */}
                <Box>
                    <SectionHeader icon={<Bot size={18} />} title="Technische KI-Bereitschaft" color={MSQDX_STATUS.info.base} />
                    <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-xs)' }}>
                        <StatusRow label="llms.txt-Unterstützung" status={data.technical.hasLlmsTxt} textTertiary={textTertiary} />
                        {data.technical.hasLlmsTxt && data.technical.llmsTxtSections && data.technical.llmsTxtSections.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--msqdx-spacing-xxs)' }}>
                                <MsqdxTypography variant="caption" sx={{ color: textTertiary, mr: 'var(--msqdx-spacing-xs)' }}>Abschnitte:</MsqdxTypography>
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
                        <StatusRow label="KI-Bot-Zugriff (Robots.txt)" status={data.technical.hasRobotsAllowingAI} textTertiary={textTertiary} />
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
                                <MsqdxTypography variant="body2" sx={{ color: textTertiary }}>Meta Robots</MsqdxTypography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                                    <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: textPrimary }}>
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
                                <MsqdxTypography variant="caption" sx={{ color: textTertiary, mb: 'var(--msqdx-spacing-xxs)', display: 'block' }}>Empfohlene Schema-Typen (KI)</MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                    {data.technical.recommendedSchemaTypesFound.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.1), color: MSQDX_BRAND_PRIMARY.green }} />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {data.technical.missingRecommendedSchemaTypes && data.technical.missingRecommendedSchemaTypes.length > 0 && (
                            <Box>
                                <MsqdxTypography variant="caption" sx={{ color: textTertiary, mb: 'var(--msqdx-spacing-xxs)', display: 'block' }}>Fehlende empfohlene Typen</MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                    {data.technical.missingRecommendedSchemaTypes.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', borderColor: alpha(MSQDX_STATUS.warning.base, 0.5), color: textTertiary }} />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {data.technical.articleSchemaQuality && (
                            <Box sx={{ mt: 1, p: 'var(--msqdx-spacing-sm)', borderRadius: 1, border: `1px solid ${MSQDX_NEUTRAL[200]}`, bgcolor: MSQDX_NEUTRAL[50] }}>
                                <MsqdxTypography variant="caption" sx={{ color: textTertiary, mb: 'var(--msqdx-spacing-xs)', display: 'block' }}>Article/NewsArticle Schema</MsqdxTypography>
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
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary, mb: 'var(--msqdx-spacing-xs)', display: 'block' }}>Schema.org-Abdeckung</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                                {data.technical.schemaCoverage.length > 0 ? (
                                    data.technical.schemaCoverage.map((s, i) => (
                                        <MsqdxChip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    ))
                                ) : (
                                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base }}>Kein für KI relevantes Schema gefunden</MsqdxTypography>
                                )}
                            </Box>
                        </Box>
                        {data.technical.jsonLdErrors && data.technical.jsonLdErrors.length > 0 ? (
                            <Box sx={{ mt: 1, p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.error.base, 0.06), border: `1px solid ${alpha(MSQDX_STATUS.error.base, 0.3)}` }}>
                                <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base, fontWeight: 600, display: 'block', mb: 'var(--msqdx-spacing-xs)' }}>
                                    JSON-LD Parse-Fehler
                                </MsqdxTypography>
                                <Box component="ul" sx={{ m: 0, pl: 2, color: textPrimary }}>
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
                    <SectionHeader icon={<Database size={18} />} title="Inhaltsstruktur" color={MSQDX_BRAND_PRIMARY.purple} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--msqdx-spacing-sm)' }}>
                        <MetricItem label="Tabellen" value={data.content.tableCount} status={data.content.tableCount > 0} textPrimary={textPrimary} textTertiary={textTertiary} />
                        <MetricItem label="FAQ-Abschnitte" value={data.content.faqCount} status={data.content.faqCount > 0} textPrimary={textPrimary} textTertiary={textTertiary} />
                        <MetricItem label="Zitate" value={data.content.citationDensity} status={data.content.citationDensity > 2} textPrimary={textPrimary} textTertiary={textTertiary} />
                        <MetricItem label="Listen-Dichte" value={data.content.listDensity} status={data.content.listDensity > 0.5} textPrimary={textPrimary} textTertiary={textTertiary} />
                    </Box>
                </Box>

                {/* E-E-A-T Section */}
                <Box>
                    <SectionHeader icon={<UserCheck size={18} />} title="Autorität & Expertise" color={MSQDX_BRAND_PRIMARY.green} />
                    <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)' }}>
                        <MsqdxChip
                            icon={data.expertise.hasAuthorBio ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            label="Autoren-Bio erkannt"
                            size="small"
                            sx={{ bgcolor: data.expertise.hasAuthorBio ? alpha(MSQDX_BRAND_PRIMARY.green, 0.12) : alpha(MSQDX_STATUS.error.base, 0.1), color: data.expertise.hasAuthorBio ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base }}
                        />
                        <MsqdxChip
                            icon={data.expertise.hasExpertCitations ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            label="Experten-Zitate"
                            size="small"
                            sx={{ bgcolor: data.expertise.hasExpertCitations ? alpha(MSQDX_BRAND_PRIMARY.green, 0.12) : alpha(MSQDX_STATUS.error.base, 0.1), color: data.expertise.hasExpertCitations ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base }}
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

function StatusRow({ label, status, textTertiary }: { label: string; status: boolean; textTertiary: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <MsqdxTypography variant="body2" sx={{ color: textTertiary }}>{label}</MsqdxTypography>
            {status ? <CheckCircle2 size={16} color={MSQDX_BRAND_PRIMARY.green} /> : <XCircle size={16} color={MSQDX_STATUS.error.base} />}
        </Box>
    );
}

function MetricItem({ label, value, status, textPrimary, textTertiary }: { label: string; value: number; status: boolean; textPrimary: string; textTertiary: string }) {
    return (
        <Box sx={{ p: 1, borderRadius: 1, border: `1px solid ${MSQDX_NEUTRAL[200]}`, bgcolor: MSQDX_NEUTRAL[50] }}>
            <MsqdxTypography variant="caption" sx={{ color: textTertiary, display: 'block' }}>{label}</MsqdxTypography>
            <MsqdxTypography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 700, color: status ? textPrimary : textTertiary }}>
                {value}
            </MsqdxTypography>
        </Box>
    );
}
