import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/scan', '/results', '/domain', '/settings'];
const authPaths = ['/login', '/register'];

const SESSION_COOKIE = 'authjs.session-token';

function isProtected(pathname: string): boolean {
    return protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}
function isAuthPath(pathname: string): boolean {
    return authPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const hasSession = req.cookies.has(SESSION_COOKIE);

    if (pathname.startsWith('/api/')) return NextResponse.next();

    if (isAuthPath(pathname)) {
        if (hasSession) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
    }

    if ((isProtected(pathname) || pathname === '/') && !hasSession) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)'],
};
