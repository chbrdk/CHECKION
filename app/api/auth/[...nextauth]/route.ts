import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

const { GET: AuthGet, POST: AuthPost } = handlers;

function authErrorResponse(e: unknown) {
    console.error('[CHECKION] Auth route error:', e);
    return NextResponse.json(
        {
            error: 'AuthError',
            message:
                process.env.NODE_ENV === 'production'
                    ? 'Server configuration error. Check server logs. Set AUTH_SECRET (min 32 chars) and DATABASE_URL.'
                    : String(e),
        },
        { status: 503 }
    );
}

export async function GET(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
    try {
        return await AuthGet(req, context);
    } catch (e) {
        return authErrorResponse(e);
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
    try {
        return await AuthPost(req, context);
    } catch (e) {
        return authErrorResponse(e);
    }
}
