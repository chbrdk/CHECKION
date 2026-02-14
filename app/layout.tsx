import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppShell } from '@/components/AppShell';
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CHECKION – WCAG Accessibility Checker',
  description: 'Automated WCAG accessibility checks powered by pa11y and axe-core.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
