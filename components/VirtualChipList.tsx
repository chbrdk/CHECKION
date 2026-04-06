'use client';

import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import {
    VIRTUAL_CHIP_LIST_INLINE_THRESHOLD,
    VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX,
    VIRTUAL_CHIP_LIST_OVERSCAN,
    VIRTUAL_CHIP_LIST_ROW_ESTIMATE_PX,
} from '@/lib/constants';

export type VirtualChipListProps<T> = {
    items: readonly T[];
    getItemKey: (item: T, index: number) => string | number;
    renderChip: (item: T, index: number) => React.ReactNode;
    /** Scroll area when virtualized (ignored in inline mode). */
    maxHeight?: number | string;
    /** Use plain flex-wrap when `items.length` is below this (default from constants). */
    inlineThreshold?: number;
};

/**
 * Renders many chips: flex-wrap for small lists, vertical virtual scroll for long lists
 * (bounded DOM + scroll, same pattern as `VirtualScrollList`).
 */
export function VirtualChipList<T>({
    items,
    getItemKey,
    renderChip,
    maxHeight = VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX,
    inlineThreshold = VIRTUAL_CHIP_LIST_INLINE_THRESHOLD,
}: VirtualChipListProps<T>) {
    const renderItem = useCallback(
        (item: T, index: number) => (
            <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 0.5, pb: 0.25, boxSizing: 'border-box' }}>
                {renderChip(item, index)}
            </Box>
        ),
        [renderChip]
    );

    if (items.length === 0) return null;

    if (items.length < inlineThreshold) {
        return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {items.map((item, index) => (
                    <React.Fragment key={getItemKey(item, index)}>{renderChip(item, index)}</React.Fragment>
                ))}
            </Box>
        );
    }

    return (
        <VirtualScrollList
            items={[...items]}
            maxHeight={maxHeight}
            estimateSize={VIRTUAL_CHIP_LIST_ROW_ESTIMATE_PX}
            overscan={VIRTUAL_CHIP_LIST_OVERSCAN}
            getItemKey={(item, index) => getItemKey(item, index)}
            renderItem={renderItem}
        />
    );
}
