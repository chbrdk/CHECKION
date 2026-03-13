'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { MsqdxAppLayout, MsqdxIcon } from '@msqdx/react';
import { Sidebar } from './Sidebar';
import { ProjectHeaderNav } from './ProjectHeaderNav';
import { BrandColorInitializer } from './settings/BrandColorInitializer';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';
import { PATH_LOGIN, PATH_REGISTER, PATH_SHARE } from '@/lib/constants';

const AUTH_PATHS = [PATH_LOGIN, PATH_REGISTER];
/** Share landing pages: use app layout + logo but hide navigation. */
const SHARE_PATHS = [PATH_SHARE];
/** Project sub-routes: show project subnav in header. */
const isProjectRoute = (path: string | null) =>
    path != null && path.startsWith('/projects/') && /^\/projects\/[^/]+/.test(path);

/** Header height (matches Audion): xs 56px, md 64px. */
const HEADER_HEIGHT_XS = 56;
const HEADER_HEIGHT_MD = 64;

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

    const layoutProps = {
        appName: 'CHECKION',
        logo: true as const,
        borderWidth: 'thin' as const,
        borderRadius: '2xl' as const,
        innerBackground: 'grid' as const,
        sidebar: showSidebar ? <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} /> : null,
        sx: {
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
        },
    };

    return (
        <>
            <BrandColorInitializer />
            <MsqdxAppLayout {...layoutProps}>
                {/* Wrapper: relative + flex column so header and main can be absolutely positioned (Audion-style). */}
                <Box
                    sx={{
                        position: 'relative',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header bar – project subnav when on project route; same positioning as Audion. */}
                    <Box
                        component="header"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            padding: { xs: '0.75rem 1rem', md: '1rem 1.5rem' },
                            minHeight: { xs: HEADER_HEIGHT_XS, md: HEADER_HEIGHT_MD },
                            backgroundColor: 'transparent',
                            overflow: 'visible',
                        }}
                    >
                        {isProjectRoute(pathname ?? null) ? <ProjectHeaderNav /> : null}
                    </Box>
                    {/* Main content – full area with paddingTop to clear header (Audion-style). */}
                    <Box
                        component="main"
                        data-checkion-content
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 0,
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            padding: { xs: '1rem', md: '1.5rem' },
                            paddingTop: {
                                xs: `calc(${HEADER_HEIGHT_XS}px + 1rem)`,
                                md: `calc(${HEADER_HEIGHT_MD}px + 1.5rem)`,
                            },
                            minWidth: 0,
                            maxWidth: '100%',
                            width: '100%',
                            color: 'var(--color-text-on-light)',
                        }}
                    >
                        {children}
                    </Box>
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
