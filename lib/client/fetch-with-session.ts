/**
 * Cookie-based API fetch with one retry after session refresh on 401.
 */

import { getSession } from 'next-auth/react';

export async function fetchWithSessionCookies(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const merged: RequestInit = { ...init, credentials: 'include' };
    let res = await fetch(input, merged);
    if (res.status === 401) {
        await getSession();
        res = await fetch(input, merged);
    }
    return res;
}
