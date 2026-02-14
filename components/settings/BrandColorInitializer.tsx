'use client';

import { useEffect } from 'react';
import { initBrandColorFromStorage } from '@/lib/brand-color-utils';

/**
 * Initializes brand color from localStorage on mount.
 * Renders nothing. Place in layout so the saved color is applied.
 */
export function BrandColorInitializer() {
    useEffect(() => {
        initBrandColorFromStorage('dark');
    }, []);
    return null;
}
