import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppShell } from '@/components/AppShell';
import { Providers } from '@/components/Providers';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { getServerLocale } from '@/lib/i18n/server';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CHECKION – WCAG Accessibility Checker',
  description: 'Automated WCAG accessibility checks powered by pa11y and axe-core.',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
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
            <I18nProvider initialLocale={locale}>
              <AppShell>{children}</AppShell>
            </I18nProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
