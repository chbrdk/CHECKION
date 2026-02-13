import { usePathname } from 'next/navigation';
import { MsqdxAdminNav } from '@msqdx/react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';

const NAV_ITEMS: AdminNavItem[] = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Deep Domain Scan', path: '/scan/domain', icon: 'language' }, // Globe icon
    { label: 'Single Page Scan', path: '/scan', icon: 'find_in_page' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
];

const EXTERNAL_ITEMS: AdminNavItem[] = [
    { label: 'Einstellungen', path: '/settings', icon: 'settings' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <MsqdxAdminNav
            open={true}
            onClose={() => { }}
            currentPath={pathname}
            items={NAV_ITEMS}
            externalItems={EXTERNAL_ITEMS}
            brandColor="green"
            linkComponent={NextLink}
        />
    );
}
