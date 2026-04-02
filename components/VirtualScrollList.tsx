'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';
import { DOMAIN_TAB_VIRTUAL_OVERSCAN, DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX } from '@/lib/constants';

export type VirtualScrollListProps<T> = {
    items: readonly T[];
    maxHeight: number | string;
    minHeight?: number | string;
    /** Default: `DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX` */
    estimateSize?: number;
    /** Default: `DOMAIN_TAB_VIRTUAL_OVERSCAN` */
    overscan?: number;
    getItemKey: (item: T, index: number) => string | number;
    renderItem: (item: T, index: number) => React.ReactNode;
    ariaLabel?: string;
};

/**
 * Windowed list for long domain/result tabs — keeps DOM size bounded.
 */
export function VirtualScrollList<T>({
    items,
    maxHeight,
    minHeight = 0,
    estimateSize = DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    overscan = DOMAIN_TAB_VIRTUAL_OVERSCAN,
    getItemKey,
    renderItem,
    ariaLabel,
}: VirtualScrollListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
        getItemKey: (index) => {
            const item = items[index];
            return item !== undefined ? getItemKey(item, index) : String(index);
        },
    });

    if (items.length === 0) return null;

    return (
        <Box
            ref={parentRef}
            role="list"
            aria-label={ariaLabel}
            sx={{ maxHeight, minHeight, overflow: 'auto', width: '100%' }}
        >
            <Box sx={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                {virtualizer.getVirtualItems().map((vi) => {
                    const item = items[vi.index];
                    if (item === undefined) return null;
                    return (
                        <Box
                            key={vi.key}
                            role="listitem"
                            data-index={vi.index}
                            ref={virtualizer.measureElement}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${vi.start}px)`,
                            }}
                        >
                            {renderItem(item, vi.index)}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
