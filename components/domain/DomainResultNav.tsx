'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';
import { pathDomainSection, type DomainResultSectionSlug } from '@/lib/domain-result-sections';

const NAV_SLUGS = [
    { slug: 'overview' as const, labelKey: 'domainResult.tabOverview' },
    { slug: 'visual-map' as const, labelKey: 'domainResult.tabVisualMap' },
    { slug: 'list-details' as const, labelKey: 'domainResult.tabListDetails' },
    { slug: 'ux-audit' as const, labelKey: 'domainResult.tabUxAudit' },
    { slug: 'structure' as const, labelKey: 'domainResult.tabStructure' },
    { slug: 'links-seo' as const, labelKey: 'domainResult.tabLinksSeo' },
    { slug: 'infra' as const, labelKey: 'domainResult.tabInfra' },
    { slug: 'generative' as const, labelKey: 'domainResult.tabGenerative' },
    { slug: 'page-topics' as const, labelKey: 'domainResult.tabPageTopics' },
] as const;

export type DomainResultNavProps = {
    domainId: string;
    activeSection: DomainResultSectionSlug;
    domainLinkQuery: Record<string, string>;
    /** Kein unterer Rand — z. B. innerhalb einer MoleculeCard wie auf Projekt-Unterseiten. */
    embedded?: boolean;
};

/**
 * Tab strip only subscribes to i18n — avoids re-rendering on unrelated DomainScanContext updates
 * (journey state, slim-pages fetch, etc.).
 */
export const DomainResultNav = memo(function DomainResultNav({
    domainId,
    activeSection,
    domainLinkQuery,
    embedded = false,
}: DomainResultNavProps) {
    const { t } = useI18n();
    const query = Object.keys(domainLinkQuery).length ? domainLinkQuery : undefined;

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                mb: embedded ? 0 : 'var(--msqdx-spacing-lg)',
                pb: embedded ? 0 : 1,
                borderBottom: embedded ? 'none' : '1px solid var(--color-secondary-dx-grey-light-tint)',
                rowGap: 0.75,
            }}
        >
            {NAV_SLUGS.map(({ slug, labelKey }) => {
                const href = pathDomainSection(domainId, slug, query);
                const selected = activeSection === slug;
                return (
                    <Link key={slug} href={href} style={{ textDecoration: 'none' }}>
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                px: 1.25,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                fontWeight: selected ? 600 : 400,
                                color: selected ? 'var(--color-theme-accent)' : 'var(--color-text-on-light)',
                                bgcolor: selected ? 'var(--color-secondary-dx-grey-light-tint)' : 'transparent',
                                border: selected ? '1px solid var(--color-theme-accent)' : '1px solid transparent',
                                '&:hover': { bgcolor: 'var(--color-secondary-dx-grey-light-tint)' },
                            }}
                        >
                            {t(labelKey)}
                        </Box>
                    </Link>
                );
            })}
        </Box>
    );
});
