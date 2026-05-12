import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAppBasePath, PATH_SCAN, PATH_RESULTS, PATH_DOMAIN, PATH_SETTINGS, PATH_LOGIN, PATH_REGISTER } from '@/lib/constants';

const protectedPaths = [PATH_SCAN, PATH_RESULTS, PATH_DOMAIN, PATH_SETTINGS];
const authPaths = [PATH_LOGIN, PATH_REGISTER];

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

function isProtected(pathname: string): boolean {
    return protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}
function isAuthPath(pathname: string): boolean {
    return authPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function hasSessionCookie(req: NextRequest): boolean {
    return SESSION_COOKIES.some(name => req.cookies.has(name));
}

export function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;
    const basePath = getAppBasePath();
    const normalizedPath =
        basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;
    const hasSession = hasSessionCookie(req);

    if (normalizedPath.startsWith('/api/')) return NextResponse.next();

    if (isAuthPath(normalizedPath)) {
        if (hasSession) {
            const url = req.nextUrl.clone();
            url.pathname = `${basePath || ''}/`;
            url.search = '';
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    if ((isProtected(normalizedPath) || normalizedPath === '/') && !hasSession) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = `${basePath || ''}${PATH_LOGIN}`;
        loginUrl.search = '';
        loginUrl.searchParams.set('redirect', `${normalizedPath}${search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)'],
};
