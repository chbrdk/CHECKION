'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: name || undefined }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');
            router.replace('/login');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
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
                title="Konto erstellen"
                subtitle="CHECKION – WCAG Accessibility Checker"
                sx={{ maxWidth: 400, width: '100%' }}
            >
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <MsqdxFormField
                            label="Name (optional)"
                            type="text"
                            value={name}
                            onChange={(e) => setName((e.target as HTMLInputElement).value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label="E-Mail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                            required
                            fullWidth
                        />
                        <MsqdxFormField
                            label="Passwort (min. 8 Zeichen)"
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
                            {loading ? 'Wird erstellt…' : 'Registrieren'}
                        </MsqdxButton>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                            Bereits ein Konto? <Link href="/login" style={{ color: 'var(--color-theme-accent)' }}>Anmelden</Link>
                        </MsqdxTypography>
                    </Stack>
                </form>
            </MsqdxMoleculeCard>
        </Box>
    );
}
