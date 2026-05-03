import type { DomainScanStatus } from '@/lib/types';

export function isTerminalDomainScanStatus(s: DomainScanStatus): boolean {
    return s === 'complete' || s === 'error' || s === 'cancelled';
}
