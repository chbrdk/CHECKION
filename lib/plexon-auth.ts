/* ------------------------------------------------------------------ */
/*  CHECKION – Auth via PLEXON (zentrale User-DB nur in PLEXON)       */
/* ------------------------------------------------------------------ */

import { createHmac } from 'crypto';
import { getPlexonContractHeaders } from '@/lib/plexon-contract';

/** Read env at call time so runtime config and tests see current `process.env`. */
function getPlexonAuthUrl(): string {
  return (process.env.PLEXON_AUTH_URL ?? '').trim();
}

function getPlexonServiceSecret(): string {
  return (process.env.PLEXON_SERVICE_SECRET ?? '').trim();
}

export function isPlexonAuthConfigured(): boolean {
  return Boolean(getPlexonAuthUrl() && getPlexonServiceSecret());
}

export type PlexonAuthUser = { id: string; email: string; name?: string };

export function getPlexonDerivedPassword(plexonUserId: string): string {
  return createHmac('sha256', getPlexonServiceSecret())
    .update(plexonUserId)
    .digest('base64url')
    .slice(0, 32);
}

/**
 * Validiert E-Mail/Passwort gegen PLEXON. Nur wenn PLEXON_AUTH_URL und
 * PLEXON_SERVICE_SECRET gesetzt sind.
 */
export async function validateCredentialsWithPlexon(
  email: string,
  password: string
): Promise<PlexonAuthUser | null> {
  const baseUrl = getPlexonAuthUrl();
  const secret = getPlexonServiceSecret();
  if (!baseUrl || !secret) return null;
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/validate-credentials`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
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
  /** PLEXON `companies.id` from service profile (oldest company membership). */
  default_platform_company_id?: string;
};

const MAX_PLATFORM_COMPANY_ID_LEN = 64;

function mapPlexonServiceUser(raw: unknown): PlexonProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const id = u.id;
  const email = u.email;
  if (typeof id !== 'string' || typeof email !== 'string') return null;
  let default_platform_company_id: string | undefined;
  const defRaw = u.default_platform_company_id;
  if (typeof defRaw === 'string') {
    const t = defRaw.trim();
    if (t && t.length <= MAX_PLATFORM_COMPANY_ID_LEN) default_platform_company_id = t;
  }
  return {
    id,
    email,
    name: typeof u.name === 'string' ? u.name : undefined,
    company: typeof u.company === 'string' ? u.company : undefined,
    avatar_url: typeof u.avatar_url === 'string' ? u.avatar_url : undefined,
    locale: typeof u.locale === 'string' ? u.locale : undefined,
    default_platform_company_id,
  };
}

export async function getPlexonProfile(userId: string): Promise<PlexonProfile | null> {
  const baseUrl = getPlexonAuthUrl();
  const secret = getPlexonServiceSecret();
  if (!baseUrl || !secret) return null;
  const base = baseUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/services/profile?user_id=${encodeURIComponent(userId)}`, {
      headers: getPlexonContractHeaders(secret),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: unknown };
    return mapPlexonServiceUser(data?.user);
  } catch (e) {
    console.error('[CHECKION] PLEXON getProfile error:', e);
    return null;
  }
}

/** Profil per E-Mail aus PLEXON (Fallback wenn Abfrage per user_id fehlschlägt). */
export async function getPlexonProfileByEmail(email: string): Promise<PlexonProfile | null> {
  const baseUrl = getPlexonAuthUrl();
  const secret = getPlexonServiceSecret();
  if (!baseUrl || !secret) return null;
  const base = baseUrl.replace(/\/$/, '');
  const normalized = email?.trim()?.toLowerCase();
  if (!normalized) return null;
  try {
    const res = await fetch(`${base}/api/services/profile?email=${encodeURIComponent(normalized)}`, {
      headers: getPlexonContractHeaders(secret),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: unknown };
    return mapPlexonServiceUser(data?.user);
  } catch (e) {
    console.error('[CHECKION] PLEXON getProfileByEmail error:', e);
    return null;
  }
}

export async function patchPlexonProfile(
  userId: string,
  updates: { name?: string | null; email?: string; company?: string | null; avatar_url?: string | null; locale?: string | null }
): Promise<PlexonProfile | null> {
  const baseUrl = getPlexonAuthUrl();
  const secret = getPlexonServiceSecret();
  if (!baseUrl || !secret) return null;
  const base = baseUrl.replace(/\/$/, '');
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
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: unknown };
    return mapPlexonServiceUser(data?.user);
  } catch (e) {
    console.error('[CHECKION] PLEXON patchProfile error:', e);
    return null;
  }
}

export type PlexonRegisterResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

/** Public PLEXON `POST /api/auth/register` (no service secret). */
export async function registerUserAtPlexon(params: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<PlexonRegisterResult> {
  const baseUrl = getPlexonAuthUrl();
  if (!baseUrl) {
    return { ok: false, status: 503, error: 'PLEXON not configured' };
  }
  const base = baseUrl.replace(/\/$/, '');
  const email = params.email.trim().toLowerCase();
  try {
    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: params.password,
        ...(params.name?.trim() ? { name: params.name.trim() } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { userId?: string; error?: string };
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.error || res.statusText };
    }
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (!userId) return { ok: false, status: 502, error: 'Invalid PLEXON response' };
    return { ok: true, userId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    return { ok: false, status: 503, error: msg };
  }
}
