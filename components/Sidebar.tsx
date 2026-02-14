import { usePathname } from 'next/navigation';
import { MsqdxAdminNav } from '@msqdx/react';
import {
    LayoutDashboard,
    ScanLine,
    Settings,
    History,
    Globe,
    Terminal
} from 'lucide-react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';

const NAV_ITEMS: AdminNavItem[] = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'New Scan', path: '/scan', icon: 'search' },
    { label: 'History', path: '/history', icon: 'history' }, // Assuming history page exists or will exist, or just remove if not ready
    { label: 'Settings', path: '/developers', icon: 'code' }, // API/Devs
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
            linkComponent={NextLink as any}
        />
    );
}
