'use client';

import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { MSQDX_THEME, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { ReactNode } from 'react';

/** Theme-Akzent: wie Navigation – User-wählbare Brand-Farbe aus Settings (--color-theme-accent). */
const THEME_ACCENT_MAIN = 'var(--color-theme-accent, var(--color-secondary-dx-green))';
const THEME_ACCENT_CONTRAST = 'var(--color-theme-accent-contrast, #000000)';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: THEME_ACCENT_MAIN,
        },
        secondary: {
            main: MSQDX_BRAND_PRIMARY.purple,
        },
        error: {
            main: MSQDX_STATUS.error.base,
        },
        warning: {
            main: MSQDX_STATUS.warning.base,
        },
        success: {
            main: MSQDX_STATUS.success.base,
        },
        info: {
            main: MSQDX_STATUS.info.base,
        },
        background: {
            /* Match AUDION/globals --checkion-app-bg */
            default: '#0f172a',
            paper: MSQDX_THEME.dark.surface.primary,
        },
        text: {
            primary: MSQDX_THEME.dark.text.primary,
            secondary: MSQDX_THEME.dark.text.secondary,
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    /* Align with globals.css --checkion-app-bg (#0f172a); MUI needs hex for palette ops */
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                },
            },
        },
        /* Alle Primary-Buttons (contained/outlined) nutzen die gesetzte Brand-Farbe (wie Navigation). */
        MuiButton: {
            styleOverrides: {
                containedPrimary: {
                    backgroundColor: THEME_ACCENT_MAIN,
                    color: THEME_ACCENT_CONTRAST,
                    '&:hover': {
                        backgroundColor: 'var(--color-theme-accent-tint, rgba(0, 202, 85, 0.2))',
                        filter: 'brightness(1.05)',
                    },
                },
                outlinedPrimary: {
                    borderColor: THEME_ACCENT_MAIN,
                    color: THEME_ACCENT_MAIN,
                    '&:hover': {
                        borderColor: THEME_ACCENT_MAIN,
                        backgroundColor: 'var(--color-theme-accent-tint, rgba(0, 202, 85, 0.08))',
                    },
                },
            },
        },
        /* Input-/Form-Labels: gesetzte Brand-Farbe (wie Navigation/Buttons). */
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: 'var(--color-input-label, var(--color-theme-accent))',
                },
                focused: {
                    color: THEME_ACCENT_MAIN,
                },
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    color: 'var(--color-input-label, var(--color-theme-accent))',
                },
                focused: {
                    color: THEME_ACCENT_MAIN,
                },
            },
        },
        MuiFormControlLabel: {
            styleOverrides: {
                label: {
                    color: 'var(--color-input-label, var(--color-theme-accent))',
                },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    color: 'var(--color-input-label, var(--color-theme-accent))',
                },
                colorPrimary: {
                    '&.Mui-checked': {
                        color: THEME_ACCENT_MAIN,
                    },
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    color: 'var(--color-input-label, var(--color-theme-accent))',
                },
                selected: {
                    color: THEME_ACCENT_MAIN,
                },
            },
        },
    },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
}
