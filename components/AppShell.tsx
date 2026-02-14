'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import { MsqdxAppLayout } from '@msqdx/react';
import { Sidebar } from './Sidebar';

const AUTH_PATHS = ['/login', '/register'];

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <MsqdxAppLayout
            brandColor="green"
            appName="CHECKION"
            logo={true}
            borderWidth="thin"
            borderRadius="2xl"
            innerBackground="grid"
            sidebar={<Sidebar />}
        >
            <Box data-checkion-content sx={{ flex: 1, minHeight: 0, color: 'var(--color-text-on-light)' }}>
                {children as any}
            </Box>
        </MsqdxAppLayout>
    );
}
