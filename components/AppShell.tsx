'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MsqdxAppLayout } from '@msqdx/react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <MsqdxAppLayout
            brandColor="green"
            appName="CHECKION"
            logo={true}
            borderWidth="thin"
            borderRadius="2xl"
            innerBackground="grid"
            sidebar={<Sidebar />}
        >
            <Box data-checkion-content sx={{ flex: 1, minHeight: 0, color: 'var(--color-text-on-light)' }}>
                {children as any}
            </Box>
        </MsqdxAppLayout>
    );
}
