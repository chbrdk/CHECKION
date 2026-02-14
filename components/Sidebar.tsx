'use client';

import { usePathname } from 'next/navigation';
import { MsqdxAdminNav } from '@msqdx/react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';
import { Box } from '@mui/material';

const NAV_ITEMS: AdminNavItem[] = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'New Scan', path: '/scan', icon: 'search' },
    { label: 'History', path: '/history', icon: 'history' },
    { label: 'Settings', path: '/developers', icon: 'code' },
];

const EXTERNAL_ITEMS: AdminNavItem[] = [
    { label: 'Einstellungen', path: '/settings', icon: 'settings' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MsqdxAdminNav
                open={true}
                onClose={() => {}}
                currentPath={pathname}
                items={NAV_ITEMS}
                externalItems={EXTERNAL_ITEMS}
                brandColor="green"
                linkComponent={NextLink as any}
            />
        </Box>
    );
}
