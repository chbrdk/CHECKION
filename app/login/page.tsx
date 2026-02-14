'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Box, Stack } from '@mui/material';
import { MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl: redirectTo,
            });
            if (result?.error) throw new Error(result.error);
            if (result?.ok) {
                router.replace(redirectTo);
                router.refresh();
            } else {
                throw new Error('Anmeldung fehlgeschlagen');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                p: 2,
            }}
        >
            <MsqdxMoleculeCard
                title="Anmelden"
                subtitle="CHECKION – WCAG Accessibility Checker"
                sx={{ maxWidth: 400, width: '100%' }}
            >
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <MsqdxFormField
                            label="E-Mail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                            required
                            fullWidth
                        />
                        <MsqdxFormField
                            label="Passwort"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                            required
                            fullWidth
                        />
                        {error && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)' }}>
                                {error}
                            </MsqdxTypography>
                        )}
                        <MsqdxButton type="submit" disabled={loading} fullWidth>
                            {loading ? 'Wird angemeldet…' : 'Anmelden'}
                        </MsqdxButton>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                            Noch kein Konto? <Link href="/register" style={{ color: 'var(--color-theme-accent)' }}>Registrieren</Link>
                        </MsqdxTypography>
                    </Stack>
                </form>
            </MsqdxMoleculeCard>
        </Box>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Laden…</Box>}>
            <LoginForm />
        </Suspense>
    );
}
