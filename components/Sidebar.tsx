'use client';

import { usePathname } from 'next/navigation';
import { MsqdxAdminNav } from '@msqdx/react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';
import { Box } from '@mui/material';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';
import { useI18n } from '@/components/i18n/I18nProvider';

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useI18n();

    const NAV_ITEMS: AdminNavItem[] = [
        { label: t('nav.dashboard'), path: '/', icon: 'dashboard' },
        { label: t('nav.newScan'), path: '/scan', icon: 'search' },
        { label: t('nav.history'), path: '/history', icon: 'history' },
        { label: t('nav.developers'), path: '/developers', icon: 'code' },
    ];

    const EXTERNAL_ITEMS: AdminNavItem[] = [
        { label: t('nav.settings'), path: '/settings', icon: 'settings' },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MsqdxAdminNav
                open={true}
                onClose={() => {}}
                currentPath={pathname}
                items={NAV_ITEMS}
                externalItems={EXTERNAL_ITEMS}
                linkComponent={NextLink as any}
                sx={{
                    backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
                    borderRightColor: THEME_ACCENT_WITH_FALLBACK.borderColor,
                    color: 'var(--color-theme-accent-contrast, #ffffff)',
                    '& a': { color: 'inherit' },
                    '& .MuiIconButton-root': { color: 'var(--color-theme-accent-contrast, #ffffff)' },
                }}
            />
        </Box>
    );
}
