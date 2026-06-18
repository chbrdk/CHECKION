'use client';

import { useCallback, useEffect, useState } from 'react';
import { DOMAIN_SCAN_MAX_PAGES_STORAGE_KEY } from '@/lib/constants';
import {
    DOMAIN_SCAN_DEFAULT_MAX_PAGES,
    parseDomainScanMaxPagesParam,
    resolveDomainScanMaxPages,
} from '@/lib/domain-scan-max-pages';

function readStoredMaxPages(): number {
    if (typeof window === 'undefined') return DOMAIN_SCAN_DEFAULT_MAX_PAGES;
    try {
        const stored = localStorage.getItem(DOMAIN_SCAN_MAX_PAGES_STORAGE_KEY);
        return parseDomainScanMaxPagesParam(stored) ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES;
    } catch {
        return DOMAIN_SCAN_DEFAULT_MAX_PAGES;
    }
}

/** Shared deep-scan page limit with optional URL override and localStorage persistence. */
export function useDomainScanMaxPages(urlParam?: string | null) {
    const urlResolved = parseDomainScanMaxPagesParam(urlParam ?? undefined);
    const [maxPages, setMaxPagesState] = useState(
        urlResolved ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES
    );

    useEffect(() => {
        if (urlResolved != null) {
            setMaxPagesState(urlResolved);
            return;
        }
        setMaxPagesState(readStoredMaxPages());
    }, [urlResolved]);

    const setMaxPages = useCallback((next: number) => {
        const resolved = resolveDomainScanMaxPages(next);
        setMaxPagesState(resolved);
        try {
            localStorage.setItem(DOMAIN_SCAN_MAX_PAGES_STORAGE_KEY, String(resolved));
        } catch {
            // ignore quota / private mode
        }
    }, []);

    return { maxPages, setMaxPages };
}
