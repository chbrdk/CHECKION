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
import { useI18n } from '@/components/i18n/I18nProvider';

function useStandards(t: (k: string) => string): { value: WcagStandard; label: string; desc: string }[] {
    return useMemo(
        () => [
            { value: 'WCAG2A', label: t('standards.wcag2a'), desc: '' },
            { value: 'WCAG2AA', label: t('standards.wcag2aa'), desc: '' },
            { value: 'WCAG2AAA', label: t('standards.wcag2aaa'), desc: '' },
        ],
        [t]
    );
}

function useRunners(t: (k: string) => string): { value: Runner; label: string; desc: string }[] {
    return useMemo(
        () => [
            { value: 'axe', label: t('runners.axe'), desc: '' },
            { value: 'htmlcs', label: t('runners.htmlcs'), desc: '' },
        ],
        [t]
    );
}

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
    const { t, setLocale: setUiLocale } = useI18n();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const STANDARDS = useStandards(t);
    const RUNNERS = useRunners(t);
    const LANGUAGE_OPTIONS = useMemo(
        () => [
            { value: 'de', label: t('language.de') },
            { value: 'en', label: t('language.en') },
        ],
        [t]
    );

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
            if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileSaveFailed'));
            setProfile(data.user);
            setSuccess(t('settings.messages.profileUpdated'));
            setUiLocale(locale);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('settings.messages.profileError'));
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordUpdate = async () => {
        setError(null);
        setSuccess(null);
        if (!currentPassword || !newPassword) {
            setError(t('settings.messages.passwordMissing'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('settings.messages.passwordMismatch'));
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
            if (!res.ok) throw new Error(data.error ?? t('settings.messages.passwordError'));
            setSuccess(t('settings.messages.passwordUpdated'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('settings.messages.passwordError'));
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
                <MsqdxTypography>{t('common.loading')}</MsqdxTypography>
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
                    {t('settings.title')}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('settings.subtitle')}
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
                                {t('settings.profile.title')}
                            </MsqdxTypography>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                                {t('settings.profile.subtitle')}
                            </MsqdxTypography>
                        </Box>
                    </Stack>
                    <MsqdxDivider spacing="lg" />
                    <Stack spacing={2}>
                        <MsqdxFormField
                            label={t('settings.profile.name')}
                            value={name}
                            onChange={(e) => setName((e.target as HTMLInputElement).value)}
                            placeholder={t('settings.profile.namePlaceholder')}
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label={t('settings.profile.email')}
                            value={email}
                            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                            placeholder={t('settings.profile.emailPlaceholder')}
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label={t('settings.profile.company')}
                            value={company}
                            onChange={(e) => setCompany((e.target as HTMLInputElement).value)}
                            placeholder={t('settings.profile.companyPlaceholder')}
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label={t('settings.profile.avatarUrl')}
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl((e.target as HTMLInputElement).value)}
                            placeholder={t('settings.profile.avatarUrlPlaceholder')}
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxSelect
                            label={t('settings.profile.language')}
                            value={locale}
                            onChange={(e: SelectChangeEvent<unknown>) => setLocale(e.target.value as string)}
                            options={LANGUAGE_OPTIONS}
                            size="small"
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxButton variant="contained" onClick={handleSaveProfile} disabled={savingProfile} sx={{ alignSelf: 'flex-start' }}>
                            {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
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
                        {t('settings.appearance.title')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
                        {t('settings.appearance.subtitle')}
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
                        {t('settings.password.title')}
                    </MsqdxTypography>
                    <Stack sx={{ gap: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxFormField
                            label={t('settings.password.current')}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label={t('settings.password.new')}
                            value={newPassword}
                            onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxFormField
                            label={t('settings.password.confirm')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                            type="password"
                            fullWidth
                            sx={FORM_FIELD_ACCENT_SX}
                        />
                        <MsqdxButton variant="outlined" onClick={handlePasswordUpdate} disabled={savingPassword} sx={{ alignSelf: 'flex-start' }}>
                            {savingPassword ? t('settings.password.ctaSaving') : t('settings.password.cta')}
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
                        {t('settings.session.title')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
                        {t('settings.session.subtitle')}
                    </MsqdxTypography>
                    <MsqdxButton variant="text" onClick={handleLogout}>
                        {t('settings.session.logout')}
                    </MsqdxButton>
                </MsqdxCard>

                {/* Scan-Standards + Über CHECKION (bestehend) */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 'var(--msqdx-spacing-md)' }}>
                    <Box>
                        <MsqdxMoleculeCard
                            title={t('settings.scanConfig.title')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider={false}
                            sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxSelect
                                    label={t('settings.scanConfig.wcagLabel')}
                                    value={standard}
                                    onChange={(e: SelectChangeEvent<unknown>) => {
                                        setStandard(e.target.value as WcagStandard);
                                        setSaved(false);
                                    }}
                                    options={STANDARDS}
                                    fullWidth
                                    helperText={t('settings.scanConfig.wcagHelper')}
                                />
                                <MsqdxCheckboxField
                                    label={t('settings.scanConfig.runnersLabel')}
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
                            {saved ? t('settings.scanConfig.saved') : t('settings.scanConfig.saveCta')}
                        </MsqdxButton>
                    </Box>
                    <Box>
                        <MsqdxMoleculeCard title={t('settings.about.title')} variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.7 }}>
                                {t('settings.about.body')}
                            </MsqdxTypography>
                        </MsqdxMoleculeCard>
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}
