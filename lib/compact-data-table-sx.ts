/**
 * Slightly smaller than default MUI table/body2 (~0.875rem) for dense data grids.
 * Use on `<Table sx={{ ...COMPACT_DATA_TABLE_SX, minWidth: … }}>`.
 */
export const COMPACT_DATA_TABLE_SX = {
    fontSize: '0.8125rem',
    lineHeight: 1.4,
    '& .MuiTableCell-root': {
        fontSize: '0.8125rem',
        lineHeight: 1.4,
    },
    '& .MuiTypography-root': {
        fontSize: 'inherit',
        lineHeight: 'inherit',
    },
} as const;
