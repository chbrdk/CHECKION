'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Box, Tabs, Tab } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';
import { pathDomainSection, type DomainResultSectionSlug } from '@/lib/domain-result-sections';
import { MSQDX_TABS_THEME_ACCENT_SX } from '@/lib/theme-accent';

const NAV_SLUGS = [
    { slug: 'overview' as const, labelKey: 'domainResult.tabOverview' },
    { slug: 'visual-map' as const, labelKey: 'domainResult.tabVisualMap' },
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
                width: '100%',
                minWidth: 0,
                mb: embedded ? 0 : 'var(--msqdx-spacing-lg)',
                pb: embedded ? 0 : 1,
                borderBottom: embedded ? 'none' : '1px solid var(--color-secondary-dx-grey-light-tint)',
            }}
        >
            <Tabs
                value={activeSection}
                textColor="inherit"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                    minHeight: 40,
                    color: '#000',
                    '& .MuiTabs-flexContainer': { gap: 0 },
                    '& .MuiTab-root': {
                        minHeight: 40,
                        py: 0,
                        textTransform: 'none',
                    },
                    '& .MuiTab-root:not(.Mui-selected)': {
                        color: '#000 !important',
                        opacity: 0.85,
                    },
                    ...MSQDX_TABS_THEME_ACCENT_SX,
                }}
            >
                {NAV_SLUGS.map(({ slug, labelKey }) => (
                    <Tab
                        key={slug}
                        label={t(labelKey)}
                        value={slug}
                        href={pathDomainSection(domainId, slug, query)}
                        component={Link}
                    />
                ))}
            </Tabs>
        </Box>
    );
});
