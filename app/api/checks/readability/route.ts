/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/checks/readability (proxy to /api/tools/readability) */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const target = `${origin}/api/tools/readability`;
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body || undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
