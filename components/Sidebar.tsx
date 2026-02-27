'use client';

import { usePathname } from 'next/navigation';
import { MsqdxAdminNav } from '@msqdx/react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';
import { Box } from '@mui/material';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PATH_HOME, PATH_SCAN, PATH_HISTORY, PATH_DEVELOPERS, PATH_SETTINGS } from '@/lib/constants';

export type SidebarProps = {
    /** Mobile drawer open state (controlled by parent for close button + menu button). */
    open?: boolean;
    /** Called when mobile drawer should close (e.g. close button tapped). */
    onClose?: () => void;
};

export function Sidebar({ open = true, onClose = () => {} }: SidebarProps) {
    const pathname = usePathname();
    const { t } = useI18n();

    const NAV_ITEMS: AdminNavItem[] = [
        { label: t('nav.dashboard'), path: PATH_HOME, icon: 'dashboard' },
        { label: t('nav.newScan'), path: PATH_SCAN, icon: 'search' },
        { label: t('nav.history'), path: PATH_HISTORY, icon: 'history' },
        { label: t('nav.developers'), path: PATH_DEVELOPERS, icon: 'code' },
    ];

    const EXTERNAL_ITEMS: AdminNavItem[] = [
        { label: t('nav.settings'), path: PATH_SETTINGS, icon: 'settings' },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MsqdxAdminNav
                open={open}
                onClose={onClose}
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
