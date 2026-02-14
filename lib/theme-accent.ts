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
