'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

import { ReactQueryProvider } from '@/components/ReactQueryProvider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <ReactQueryProvider>{children}</ReactQueryProvider>
        </SessionProvider>
    );
}
