'use client';

import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { SERP_MAIN_MARKETS, marketKey } from '@/lib/serp-markets';

export interface SerpMarketSelectProps {
    label?: string;
    /** Single market key (de-de) or empty. */
    value?: string;
    onChange?: (marketKey: string) => void;
    /** Multi-select market keys. */
    selectedKeys?: string[];
    onSelectedKeysChange?: (keys: string[]) => void;
    multiple?: boolean;
    required?: boolean;
    placeholder?: string;
}

export function SerpMarketSelect({
    label,
    value = '',
    onChange,
    selectedKeys = [],
    onSelectedKeysChange,
    multiple = false,
    required,
    placeholder,
}: SerpMarketSelectProps) {
    if (multiple) {
        return (
            <Box>
                {label ? (
                    <MsqdxTypography component="label" variant="body2" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                        {label}
                    </MsqdxTypography>
                ) : null}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {SERP_MAIN_MARKETS.map((m) => {
                        const key = marketKey(m.country, m.language);
                        const checked = selectedKeys.includes(key);
                        return (
                            <Box
                                key={key}
                                component="label"
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 'var(--msqdx-radius-sm, 4px)',
                                    border: '1px solid var(--color-border-subtle, #ccc)',
                                    cursor: 'pointer',
                                    bgcolor: checked ? 'var(--color-accent-muted, rgba(0,0,0,0.06))' : 'transparent',
                                    fontSize: '0.8125rem',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                        const next = checked
                                            ? selectedKeys.filter((k) => k !== key)
                                            : [...selectedKeys, key];
                                        onSelectedKeysChange?.(next);
                                    }}
                                />
                                {m.label}
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            {label ? (
                <MsqdxTypography component="label" variant="body2" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                    {label}
                </MsqdxTypography>
            ) : null}
            <Box
                component="select"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                sx={{
                    width: '100%',
                    py: 1,
                    px: 1.5,
                    borderRadius: 'var(--msqdx-radius-sm, 4px)',
                    border: '1px solid var(--color-border-subtle, #ccc)',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                }}
            >
                {placeholder ? <option value="">{placeholder}</option> : null}
                {SERP_MAIN_MARKETS.map((m) => {
                    const key = marketKey(m.country, m.language);
                    return (
                        <option key={key} value={key}>
                            {m.label} ({m.country}/{m.language})
                        </option>
                    );
                })}
            </Box>
        </Box>
    );
}
