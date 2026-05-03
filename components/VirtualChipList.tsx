'use client';

import React from 'react';
import { Box } from '@mui/material';
import { VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX } from '@/lib/constants';

export type VirtualChipListProps<T> = {
    items: readonly T[];
    getItemKey: (item: T, index: number) => string | number;
    renderChip: (item: T, index: number) => React.ReactNode;
    /** Max height of the chip area; scrolls with plain overflow when content exceeds. */
    maxHeight?: number | string;
    /**
     * @deprecated Ignored — chips always render in the DOM (flex-wrap). Virtual windowing caused scroll glitches.
     */
    inlineThreshold?: number;
};

/**
 * Renders chips in a scrollable flex-wrap container (full DOM, no virtualization).
 */
export function VirtualChipList<T>({
    items,
    getItemKey,
    renderChip,
    maxHeight = VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX,
}: VirtualChipListProps<T>) {
    if (items.length === 0) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                maxHeight,
                overflow: maxHeight === 'none' ? 'visible' : 'auto',
                alignContent: 'flex-start',
                minWidth: 0,
                WebkitOverflowScrolling: maxHeight === 'none' ? 'auto' : 'touch',
            }}
        >
            {items.map((item, index) => (
                <React.Fragment key={getItemKey(item, index)}>{renderChip(item, index)}</React.Fragment>
            ))}
        </Box>
    );
}
