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
