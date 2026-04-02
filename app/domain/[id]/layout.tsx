import type { ReactNode } from 'react';
import { DomainScanProvider } from '@/context/DomainScanContext';
import { DomainResultShell } from '@/components/domain';

export default async function DomainLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <DomainScanProvider domainId={id}>
            <DomainResultShell>{children}</DomainResultShell>
        </DomainScanProvider>
    );
}
