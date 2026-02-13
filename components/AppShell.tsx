'use client';

import type { ReactNode } from 'react';
import { MsqdxAppLayout } from '@msqdx/react';
import { MSQDX_THEME } from '@msqdx/tokens';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <MsqdxAppLayout
            brandColor="green"
            appName="CHECKION"
            logo={true}
            borderWidth="thin"
            borderRadius="2xl"
            innerBackgroundColor={MSQDX_THEME.dark.background.primary}
            sidebar={<Sidebar />}
        >
            {children}
        </MsqdxAppLayout>
    );
}
