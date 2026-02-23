'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { MsqdxAppLayout, MsqdxIcon } from '@msqdx/react';
import { Sidebar } from './Sidebar';
import { BrandColorInitializer } from './settings/BrandColorInitializer';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';

const AUTH_PATHS = ['/login', '/register'];
/** Share landing pages: use app layout + logo but hide navigation. */
const SHARE_PATHS = ['/share'];

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileNavOpen, setMobileNavOpen] = useState(true);
    const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));
    const isSharePage = SHARE_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

    if (isAuthPage) {
        return <>{children}</>;
    }

    const showSidebar = !isSharePage;

    return (
        <>
            <BrandColorInitializer />
            <MsqdxAppLayout
                appName="CHECKION"
                logo={true}
                borderWidth="thin"
                borderRadius="2xl"
                innerBackground="grid"
                sidebar={showSidebar ? <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} /> : null}
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
            {/* Mobile: floating menu button when sidebar is closed (only when sidebar is shown) */}
            {showSidebar && isMobile && !mobileNavOpen && (
                <IconButton
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Menü öffnen"
                    sx={{
                        position: 'fixed',
                        top: 12,
                        left: 12,
                        zIndex: 1100,
                        backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
                        color: 'var(--color-theme-accent-contrast, #fff)',
                        '&:hover': { backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor, filter: 'brightness(1.1)' },
                    }}
                >
                    <MsqdxIcon name="menu" customSize={24} />
                </IconButton>
            )}
        </>
    );
}
