/* ------------------------------------------------------------------ */
/*  CHECKION – Share access token (password-protected share unlock)   */
/*  Simple signed payload with AUTH_SECRET; 24h expiry.                */
/* ------------------------------------------------------------------ */

import { createHmac, timingSafeEqual } from 'crypto';

const ALG = 'sha256';
const MAX_AGE_SEC = 24 * 60 * 60; // 24h

function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('AUTH_SECRET required for share access tokens');
    }
    return secret;
}

export function createShareAccessToken(shareToken: string): string {
    const secret = getSecret();
    const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
    const payload = JSON.stringify({ shareToken, exp });
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    const sig = createHmac(ALG, secret).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
}

/** Get share access token from Authorization header or from query param ?access= (for img/video src). */
export function getShareAccessTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const t = authHeader.slice(7).trim();
        if (t) return t;
    }
    try {
        const url = new URL(request.url);
        const access = url.searchParams.get('access');
        if (access && access.length > 0) return access;
    } catch {
        // ignore
    }
    return null;
}

/**
 * Check if request is allowed to access a share (no password, or valid Bearer/access param).
 * Returns true if allowed, false if password required.
 */
export function canAccessShare(
    passwordHash: string | null,
    request: Request,
    shareToken: string
): boolean {
    if (!passwordHash) return true;
    const bearer = getShareAccessTokenFromRequest(request);
    const verified = bearer ? verifyShareAccessToken(bearer) : null;
    return Boolean(verified && verified.shareToken === shareToken);
}

export function verifyShareAccessToken(accessToken: string): { shareToken: string } | null {
    try {
        const secret = getSecret();
        const [payloadB64, sig] = accessToken.split('.');
        if (!payloadB64 || !sig) return null;
        const expectedSig = createHmac(ALG, secret).update(payloadB64).digest('base64url');
        const a = Buffer.from(expectedSig, 'base64url');
        const b = Buffer.from(sig, 'base64url');
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        if (typeof payload.shareToken !== 'string') return null;
        return { shareToken: payload.shareToken };
    } catch {
        return null;
    }
}
