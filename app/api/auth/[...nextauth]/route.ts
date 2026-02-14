import { handlers } from '@/auth';
import { NextResponse } from 'next/server';

const { GET: AuthGet, POST: AuthPost } = handlers;

async function withAuthErrorLogging(
    handler: (req: Request, context: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>,
    req: Request,
    context: { params: Promise<{ nextauth: string[] }> }
): Promise<Response> {
    try {
        return await handler(req, context);
    } catch (e) {
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
}

export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
    return withAuthErrorLogging(AuthGet, req, context);
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
    return withAuthErrorLogging(AuthPost, req, context);
}
