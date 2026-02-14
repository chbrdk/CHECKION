'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import { MsqdxAppLayout } from '@msqdx/react';
import { Sidebar } from './Sidebar';
import { BrandColorInitializer } from './settings/BrandColorInitializer';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';

const AUTH_PATHS = ['/login', '/register'];

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <>
            <BrandColorInitializer />
            <MsqdxAppLayout
                appName="CHECKION"
                logo={true}
                borderWidth="thin"
                borderRadius="2xl"
                innerBackground="grid"
                sidebar={<Sidebar />}
                sx={{
                    '& > div:last-of-type': {
                        backgroundColor: `${THEME_ACCENT_WITH_FALLBACK.backgroundColor} !important`,
                    },
                    '& > div:last-of-type > div': {
                        borderColor: `${THEME_ACCENT_WITH_FALLBACK.borderColor} !important`,
                    },
                    '& > div:last-of-type > div > div:first-of-type': {
                        backgroundColor: 'transparent !important',
                        color: 'var(--color-theme-accent-contrast, #ffffff) !important',
                    },
                    '& > div:last-of-type > div > div:first-of-type *': {
                        color: 'inherit !important',
                    },
                    '& > div:last-of-type > div > div:first-of-type > div': {
                        backgroundColor: `${THEME_ACCENT_WITH_FALLBACK.backgroundColor} !important`,
                    },
                }}
            >
                <Box data-checkion-content sx={{ flex: 1, minHeight: 0, color: 'var(--color-text-on-light)' }}>
                    {children as any}
                </Box>
            </MsqdxAppLayout>
        </>
    );
}
