'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useStatusUi } from '@/components/status/StatusUiContext';
import { fetchWithSessionCookies } from '@/lib/client/fetch-with-session';
import {
    apiScanCreate,
    pathResults,
    HEADER_CHECKION_SCAN_STREAM,
    HEADER_CHECKION_SCAN_STREAM_ON,
} from '@/lib/constants';
import { readScanNdjsonStream } from '@/lib/scan-stream-parse';
import { ensureUrlWithScheme } from '@/lib/url-normalize';
import type { Runner, ScanResult, WcagStandard } from '@/lib/types';

const DEFAULT_STANDARD: WcagStandard = 'WCAG2AA';
const DEFAULT_RUNNERS: Runner[] = ['axe', 'htmlcs'];

export interface RunSinglePageScanOptions {
    projectId?: string | null;
    /** Called when the scan session opens (e.g. close a modal). */
    onSessionOpen?: () => void;
}

export function useSinglePageScanRunner() {
    const { t } = useI18n();
    const router = useRouter();
    const { singlePageScan } = useStatusUi();
    const [scanningUrl, setScanningUrl] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const runScan = useCallback(
        async (rawUrl: string, options?: RunSinglePageScanOptions) => {
            const url = ensureUrlWithScheme(rawUrl);
            if (!url) {
                setScanError(t('scan.error'));
                return;
            }

            setScanError(null);
            setScanningUrl(url);
            options?.onSessionOpen?.();
            singlePageScan.openSession();

            try {
                const res = await fetchWithSessionCookies(apiScanCreate, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [HEADER_CHECKION_SCAN_STREAM]: HEADER_CHECKION_SCAN_STREAM_ON,
                    },
                    body: JSON.stringify({
                        url,
                        standard: DEFAULT_STANDARD,
                        runners: DEFAULT_RUNNERS,
                        ...(options?.projectId ? { projectId: options.projectId } : {}),
                    }),
                });

                const ct = res.headers.get('Content-Type') ?? '';

                if (!res.ok) {
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    setScanError(data.error || t('scan.error'));
                    singlePageScan.close();
                    return;
                }

                if (ct.includes('ndjson')) {
                    let streamFinished = false;
                    try {
                        for await (const line of readScanNdjsonStream(res.body)) {
                            if (line.type === 'progress') {
                                singlePageScan.applyProgressLine(line);
                            } else if (line.type === 'complete') {
                                streamFinished = true;
                                singlePageScan.close();
                                router.push(pathResults(line.data.id));
                                return;
                            } else if (line.type === 'error') {
                                setScanError(line.message);
                                singlePageScan.close();
                                return;
                            }
                        }
                    } catch {
                        setScanError(t('scan.networkError'));
                        singlePageScan.close();
                        return;
                    }
                    if (!streamFinished) {
                        setScanError(t('scan.streamIncomplete'));
                        singlePageScan.close();
                    }
                    return;
                }

                const data = (await res.json()) as { success?: boolean; error?: string; data?: ScanResult };
                if (!data.success) {
                    setScanError(data.error || t('scan.error'));
                    singlePageScan.close();
                    return;
                }

                if (data.data?.id) {
                    singlePageScan.close();
                    router.push(pathResults(data.data.id));
                }
            } catch {
                setScanError(t('scan.networkError'));
                singlePageScan.close();
            } finally {
                setScanningUrl(null);
            }
        },
        [router, singlePageScan, t]
    );

    const clearScanError = useCallback(() => setScanError(null), []);

    return { runScan, scanningUrl, scanError, clearScanError };
}
