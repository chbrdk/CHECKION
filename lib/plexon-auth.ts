/* ------------------------------------------------------------------ */
/*  CHECKION – Auth via PLEXON (zentrale User-DB nur in PLEXON)       */
/* ------------------------------------------------------------------ */

const PLEXON_AUTH_URL = process.env.PLEXON_AUTH_URL ?? '';
const PLEXON_SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET ?? '';

export function isPlexonAuthConfigured(): boolean {
  return Boolean(PLEXON_AUTH_URL.trim() && PLEXON_SERVICE_SECRET.trim());
}

export type PlexonAuthUser = { id: string; email: string; name?: string };

/**
 * Validiert E-Mail/Passwort gegen PLEXON. Nur wenn PLEXON_AUTH_URL und
 * PLEXON_SERVICE_SECRET gesetzt sind.
 */
export async function validateCredentialsWithPlexon(
  email: string,
  password: string
): Promise<PlexonAuthUser | null> {
  if (!PLEXON_AUTH_URL.trim() || !PLEXON_SERVICE_SECRET.trim()) return null;
  const url = `${PLEXON_AUTH_URL.replace(/\/$/, '')}/api/auth/validate-credentials`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': PLEXON_SERVICE_SECRET,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: PlexonAuthUser };
    return data?.user ?? null;
  } catch (e) {
    console.error('[CHECKION] PLEXON auth error:', e);
    return null;
  }
}

export type PlexonProfile = {
  id: string;
  email: string;
  name?: string;
  company?: string;
  avatar_url?: string;
  locale?: string;
};

export async function getPlexonProfile(userId: string): Promise<PlexonProfile | null> {
  if (!PLEXON_AUTH_URL.trim() || !PLEXON_SERVICE_SECRET.trim()) return null;
  const base = PLEXON_AUTH_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/services/profile?user_id=${encodeURIComponent(userId)}`, {
      headers: { 'X-Service-Secret': PLEXON_SERVICE_SECRET },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: PlexonProfile };
    return data?.user ?? null;
  } catch (e) {
    console.error('[CHECKION] PLEXON getProfile error:', e);
    return null;
  }
}

export async function patchPlexonProfile(
  userId: string,
  updates: { name?: string | null; email?: string; company?: string | null; avatar_url?: string | null; locale?: string | null }
): Promise<PlexonProfile | null> {
  if (!PLEXON_AUTH_URL.trim() || !PLEXON_SERVICE_SECRET.trim()) return null;
  const base = PLEXON_AUTH_URL.replace(/\/$/, '');
  const body: Record<string, unknown> = { user_id: userId };
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.email !== undefined) body.email = updates.email;
  if (updates.company !== undefined) body.company = updates.company;
  if (updates.avatar_url !== undefined) body.avatar_url = updates.avatar_url;
  if (updates.locale !== undefined) body.locale = updates.locale;
  try {
    const res = await fetch(`${base}/api/services/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': PLEXON_SERVICE_SECRET,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: PlexonProfile };
    return data?.user ?? null;
  } catch (e) {
    console.error('[CHECKION] PLEXON patchProfile error:', e);
    return null;
  }
}
