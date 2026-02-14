/**
 * CSS-Variablen für User-wählbare Brand-Farbe (wie AUDION).
 * Wird von applyBrandColorVars() gesetzt. Nav/Layout nutzen diese für Sidebar und Rahmen.
 */
export const THEME_ACCENT = {
    color: 'var(--color-theme-accent)',
    borderColor: 'var(--color-theme-accent)',
    backgroundColor: 'var(--color-theme-accent)',
} as const;

/** Fallback wenn CSS-Variable noch nicht gesetzt */
export const THEME_ACCENT_WITH_FALLBACK = {
    color: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
    borderColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
    backgroundColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
} as const;

/** sx für FormField/Input mit Theme-Akzent (1:1 AUDION) */
export const FORM_FIELD_ACCENT_SX = {
    '& .MuiOutlinedInput-root': {
        borderColor: 'var(--color-theme-accent) !important',
        '&:hover': { borderColor: 'var(--color-theme-accent) !important' },
        '&.Mui-focused': { borderColor: 'var(--color-theme-accent) !important' },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-theme-accent) !important',
        },
    },
    '& .MuiInputLabel-root': {
        color: 'var(--color-input-label, var(--color-theme-accent)) !important',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--color-input-label, var(--color-theme-accent)) !important',
    },
} as const;
