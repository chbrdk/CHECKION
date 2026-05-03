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
    /** Space between rows (TanStack `gap`). Use this instead of margin-bottom on row content — margins break measured heights while scrolling. */
    gap?: number;
    /**
     * When false, render every row in the DOM inside a normal scroll container (no windowing).
     * Prefer for bounded domain lists (API caps) to avoid virtualization flicker; keep true for very long lists.
     */
    virtualize?: boolean;
    getItemKey: (item: T, index: number) => string | number;
    renderItem: (item: T, index: number) => React.ReactNode;
    ariaLabel?: string;
};

function VirtualScrollListStatic<T>({
    items,
    maxHeight,
    minHeight = 0,
    gap,
    getItemKey,
    renderItem,
    ariaLabel,
}: Pick<
    VirtualScrollListProps<T>,
    'items' | 'maxHeight' | 'minHeight' | 'gap' | 'getItemKey' | 'renderItem' | 'ariaLabel'
>) {
    return (
        <Box
            role="list"
            aria-label={ariaLabel}
            sx={{
                maxHeight,
                minHeight,
                overflow: 'auto',
                width: '100%',
                minWidth: 0,
                flexShrink: 1,
                WebkitOverflowScrolling: 'touch',
                display: 'flex',
                flexDirection: 'column',
                gap: gap != null && gap > 0 ? `${gap}px` : 0,
            }}
        >
            {items.map((item, index) => (
                <Box key={getItemKey(item, index)} role="listitem">
                    {renderItem(item, index)}
                </Box>
            ))}
        </Box>
    );
}

function VirtualScrollListWindowed<T>({
    items,
    maxHeight,
    minHeight = 0,
    estimateSize = DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    overscan = DOMAIN_TAB_VIRTUAL_OVERSCAN,
    gap = 0,
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
        gap,
        useAnimationFrameWithResizeObserver: true,
        getItemKey: (index) => {
            const item = items[index];
            return item !== undefined ? getItemKey(item, index) : String(index);
        },
    });

    return (
        <Box
            ref={parentRef}
            role="list"
            aria-label={ariaLabel}
            sx={{
                maxHeight,
                minHeight,
                overflow: 'auto',
                width: '100%',
                minWidth: 0,
                flexShrink: 1,
                WebkitOverflowScrolling: 'touch',
                overflowAnchor: 'none',
            }}
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

/**
 * Scrollable list: optional windowing via TanStack Virtual (`virtualize`), or plain stacked rows (real DOM).
 */
export function VirtualScrollList<T>({
    items,
    maxHeight,
    minHeight = 0,
    estimateSize = DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    overscan = DOMAIN_TAB_VIRTUAL_OVERSCAN,
    gap = 0,
    virtualize = true,
    getItemKey,
    renderItem,
    ariaLabel,
}: VirtualScrollListProps<T>) {
    if (items.length === 0) return null;

    if (!virtualize) {
        return (
            <VirtualScrollListStatic
                items={items}
                maxHeight={maxHeight}
                minHeight={minHeight}
                gap={gap}
                getItemKey={getItemKey}
                renderItem={renderItem}
                ariaLabel={ariaLabel}
            />
        );
    }

    return (
        <VirtualScrollListWindowed
            items={items}
            maxHeight={maxHeight}
            minHeight={minHeight}
            estimateSize={estimateSize}
            overscan={overscan}
            gap={gap}
            getItemKey={getItemKey}
            renderItem={renderItem}
            ariaLabel={ariaLabel}
        />
    );
}
