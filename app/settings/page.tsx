'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { Box, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxSelect,
    MsqdxCheckboxField,
    MsqdxCard,
    MsqdxDivider,
    MsqdxAvatar,
    MsqdxFormField,
} from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { WcagStandard, Runner } from '@/lib/types';
import type { SelectChangeEvent } from '@mui/material';
import { BrandColorSelector } from '@/components/settings/BrandColorSelector';
import { FORM_FIELD_ACCENT_SX } from '@/lib/theme-accent';

const STANDARDS: { value: WcagStandard; label: string; desc: string }[] = [
    { value: 'WCAG2A', label: 'Level A - Grundlegende Barrierefreiheit', desc: '' },
    { value: 'WCAG2AA', label: 'Level AA - Empfohlen für die meisten Websites', desc: '' },
    { value: 'WCAG2AAA', label: 'Level AAA - Höchstes Level der Barrierefreiheit', desc: '' },
];

const RUNNERS: { value: Runner; label: string; desc: string }[] = [
    { value: 'axe', label: 'axe-core (Deque axe accessibility engine)', desc: '' },
    { value: 'htmlcs', label: 'HTML CodeSniffer (Squiz HTML_CodeSniffer)', desc: '' },
];

const LANGUAGE_OPTIONS = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
];

type ProfileUser = {
    id: string;
    email?: string;
    name?: string;
    company?: string;
    avatar_url?: string;
    locale?: string;
};

export default function SettingsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [locale, setLocale] = useState('de');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [standard, setStandard] = useState<WcagStandard>('WCAG2AA');
    const [runners, setRunners] = useState<Runner[]>(['axe', 'htmlcs']);
    const [saved, setSaved] = useState(false);

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;
        fetch('/api/auth/profile')
            .then((res) => res.json())
            .then((data) => {
                if (data.user) {
                    setProfile(data.user);
                    setName(data.user.name ?? '');
                    setEmail(data.user.email ?? '');
                    setCompany(data.user.company ?? '');
                    setAvatarUrl(data.user.avatar_url ?? '');
                    setLocale(data.user.locale ?? 'de');
                }
            })
            .catch(() => setProfile(null));
    }, [status, session?.user?.id]);

    const initials = useMemo(() => {
        const base = (name || profile?.email || session?.user?.email || 'A').trim();
        return base
            .split(/\s+/)
            .map((part) => part[0]?.toUpperCase())
            .filter(Boolean)
            .slice(0, 2)
            .join('');
    }, [name, profile?.email, session?.user?.email]);

    const handleSaveProfile = async () => {
        setError(null);
        setSuccess(null);
        setSavingProfile(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim() || undefined,
                    email: email.trim() || undefined,
                    company: company.trim() || undefined,
                    avatar_url: avatarUrl.trim() || null,
                    locale: locale || undefined,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? 'Profil konnte nicht gespeichert werden');
            setProfile(data.user);
            setSuccess('Profil aktualisiert.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordUpdate = async () => {
        setError(null);
        setSuccess(null);
        if (!currentPassword || !newPassword) {
            setError('Aktuelles und neues Passwort eingeben.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Neues Passwort und Bestätigung stimmen nicht überein.');
            return;
        }
        setSavingPassword(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? 'Passwort konnte nicht geändert werden');
            setSuccess('Passwort geändert.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.replace('/login');
        router.refresh();
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!mounted || status === 'loading') {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }} suppressHydrationWarning>
                <MsqdxTypography>Laden…</MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            <Box sx={{ mb: MSQDX_SPACING.scale.md }}>
                <MsqdxTypography
                    variant="h4"
                    sx={{ fontWeight: 700, mb: MSQDX_SPACING.scale.xs, letterSpacing: '-0.02em' }}
                >
                    Einstellungen
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    Profil, Erscheinungsbild, Sicherheit und Scan-Standards.
                </MsqdxTypography>
            </Box>

            {(error ?? success) && (
                <Box
                    sx={{
                        mb: 'var(--msqdx-spacing-md)',
                        p: 'var(--msqdx-spacing-sm)',
                        borderRadius: 'var(--msqdx-radius-sm)',
                        bgcolor: error ? 'error.light' : 'success.light',
                        color: error ? 'error.contrastText' : 'success.contrastText',
                    }}
                >
                    <MsqdxTypography variant="body2">{error ?? success}</MsqdxTypography>
                </Box>
            )}

            <Stack sx={{ gap: 'var(--msqdx-spacing-lg)' }}>
                {/* Profil / Identity (1:1 AUDION) */}
                <MsqdxCard
                    variant="flat"
                    borderRadius="button"
                    sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                >
                    <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 'var(--msqdx-spacing-lg)', alignItems: 'center' }}>
                        <MsqdxAvatar
                            src={avatarUrl || undefined}
                            size="xl"
                            sx={{
                                width: 72,
                                height: 72,
                                bgcolor: 'var(--color-secondary-dx-pink-tint)',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {initials}
                        </MsqdxAvatar>
                        <Box sx={{ flex: 1 }}>
                            <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                Profil
                            </MsqdxTypography>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                                Name, E-Mail und Anzeigeoptionen.
                            </MsqdxTypography>
                        </Box>
                    </Stack>
                    <MsqdxDivider spacing="lg" />
                    <Stack spacing={2}>
                        <MsqdxFormField
                            label="Name"
                            value={name}
                            onChange={(e) => setName((e.target as HTMLInputElement).value)}
                            placeholder="Dein Name"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label="E-Mail"
                            value={email}
                            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                            placeholder="E-Mail"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label="Firma (optional)"
                            value={company}
                            onChange={(e) => setCompany((e.target as HTMLInputElement).value)}
                            placeholder="Firma"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label="Avatar-URL (optional)"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl((e.target as HTMLInputElement).value)}
                            placeholder="https://…"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxSelect
                            label="Sprache"
                            value={locale}
                            onChange={(e: SelectChangeEvent<unknown>) => setLocale(e.target.value as string)}
                            options={LANGUAGE_OPTIONS}
                            size="small"
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxButton variant="contained" onClick={handleSaveProfile} disabled={savingProfile} sx={{ alignSelf: 'flex-start' }}>
                            {savingProfile ? 'Wird gespeichert…' : 'Profil speichern'}
                        </MsqdxButton>
                    </Stack>
                </MsqdxCard>

                {/* Erscheinungsbild (1:1 AUDION) */}
                <MsqdxCard
                    variant="flat"
                    borderRadius="button"
                    sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                >
                    <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                        Erscheinungsbild
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
                        Akzentfarbe für Sidebar und Buttons.
                    </MsqdxTypography>
                    <BrandColorSelector />
                </MsqdxCard>

                {/* Sicherheit – Passwort ändern (1:1 AUDION) */}
                <MsqdxCard
                    variant="flat"
                    borderRadius="button"
                    sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                >
                    <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 'var(--msqdx-spacing-sm)' }}>
                        Passwort ändern
                    </MsqdxTypography>
                    <Stack sx={{ gap: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxFormField
                            label="Aktuelles Passwort"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label="Neues Passwort"
                            value={newPassword}
                            onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label="Neues Passwort bestätigen"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxButton variant="outlined" onClick={handlePasswordUpdate} disabled={savingPassword} sx={{ alignSelf: 'flex-start' }}>
                            {savingPassword ? 'Wird geändert…' : 'Passwort ändern'}
                        </MsqdxButton>
                    </Stack>
                </MsqdxCard>

                {/* Session – Abmelden (1:1 AUDION) */}
                <MsqdxCard
                    variant="flat"
                    borderRadius="button"
                    sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                >
                    <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                        Sitzung
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
                        Dich von diesem Gerät abmelden.
                    </MsqdxTypography>
                    <MsqdxButton variant="text" onClick={handleLogout}>
                        Abmelden
                    </MsqdxButton>
                </MsqdxCard>

                {/* Scan-Standards + Über CHECKION (bestehend) */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 'var(--msqdx-spacing-md)' }}>
                    <Box>
                        <MsqdxMoleculeCard
                            title="Standard Konfiguration"
                            variant="flat"
                            borderRadius="lg"
                            footerDivider={false}
                            sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxSelect
                                    label="Standard WCAG Level"
                                    value={standard}
                                    onChange={(e: SelectChangeEvent<unknown>) => {
                                        setStandard(e.target.value as WcagStandard);
                                        setSaved(false);
                                    }}
                                    options={STANDARDS}
                                    fullWidth
                                    helperText="Wähle das Standard-Level für neue Scans."
                                />
                                <MsqdxCheckboxField
                                    label="Standard Runners"
                                    options={RUNNERS.map((r) => ({ value: r.value, label: r.label }))}
                                    value={runners}
                                    onChange={(val) => {
                                        setRunners(val as Runner[]);
                                        setSaved(false);
                                    }}
                                />
                            </Box>
                        </MsqdxMoleculeCard>
                        <MsqdxButton
                            variant="contained"
                            brandColor="green"
                            size="medium"
                            onClick={handleSave}
                            sx={{ mt: 'var(--msqdx-spacing-md)', width: 'auto', minWidth: 200 }}
                        >
                            {saved ? '✓ Gespeichert' : 'Einstellungen speichern'}
                        </MsqdxButton>
                    </Box>
                    <Box>
                        <MsqdxMoleculeCard title="Über CHECKION" variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.7 }}>
                                CHECKION nutzt <strong>pa11y</strong> und <strong>axe-core</strong> für automatisierte WCAG-Checks.
                                Basiert auf dem MSQDX Design System · v0.1.0
                            </MsqdxTypography>
                        </MsqdxMoleculeCard>
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}
