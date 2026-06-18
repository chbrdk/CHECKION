'use client';

import { MsqdxSelect } from '@msqdx/react';
import type { SelectChangeEvent } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';
import { buildDomainScanMaxPagesSelectOptions } from '@/lib/domain-scan-max-pages';

type DomainScanMaxPagesSelectProps = {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    fullWidth?: boolean;
};

export function DomainScanMaxPagesSelect({
    value,
    onChange,
    disabled,
    fullWidth = true,
}: DomainScanMaxPagesSelectProps) {
    const { t } = useI18n();
    const options = buildDomainScanMaxPagesSelectOptions(t('domain.maxPagesAll'));

    return (
        <MsqdxSelect
            label={t('domain.maxPagesLabel')}
            value={String(value)}
            onChange={(e: SelectChangeEvent<unknown>) =>
                onChange(Number((e.target as HTMLSelectElement).value))
            }
            options={options}
            disabled={disabled}
            fullWidth={fullWidth}
        />
    );
}
