import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PATH_SCAN, PATH_RESULTS, PATH_DOMAIN, PATH_SETTINGS, PATH_LOGIN, PATH_REGISTER } from '@/lib/constants';

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

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const hasSession = hasSessionCookie(req);

    if (pathname.startsWith('/api/')) return NextResponse.next();

    if (isAuthPath(pathname)) {
        if (hasSession) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
    }

    if ((isProtected(pathname) || pathname === '/') && !hasSession) {
        return NextResponse.redirect(new URL(PATH_LOGIN, req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)'],
};
