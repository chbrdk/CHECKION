/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/checks/contrast (proxy to /api/tools/contrast) */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const target = `${origin}/api/tools/contrast?${request.nextUrl.searchParams.toString()}`;
  const res = await fetch(target, { method: 'GET', headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
