import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLEXON_SERVICE_SECRET_HEADER } from '@/lib/plexon-contract';
import { buildPlexonAssistantPptxDebugPayload } from '@/lib/integrations/plexon/debug-plexon-assistant-pptx-plan';
import { renderPlexonAssistantReportPptx } from '@/lib/integrations/plexon/render-assistant-report-pptx';
import { isPlexonAssistantPptxDebugPlanRequest } from '@/lib/paths/plexon-assistant-export';

const bodySchema = z.object({
    title: z.string().trim().min(1).max(256),
    locale: z.enum(['de', 'en']).optional(),
    uiLayout: z.object({
        version: z.number(),
        blocks: z.array(
            z.object({
                id: z.string(),
                type: z.string(),
                props: z.record(z.string(), z.unknown()),
            })
        ),
    }),
});

function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: Request) {
    const expected = process.env.PLEXON_SERVICE_SECRET?.trim();
    const provided = request.headers.get(PLEXON_SERVICE_SECRET_HEADER)?.trim();
    if (!expected || !provided || provided !== expected) {
        return unauthorized();
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const payload = {
            title: parsed.data.title,
            locale: parsed.data.locale ?? 'de',
            uiLayout: parsed.data.uiLayout,
        };

        if (isPlexonAssistantPptxDebugPlanRequest(request.url)) {
            const debug = buildPlexonAssistantPptxDebugPayload(payload);
            return NextResponse.json(debug, {
                status: 200,
                headers: { 'Cache-Control': 'private, max-age=30' },
            });
        }

        const pptx = await renderPlexonAssistantReportPptx(payload);
        const slug = parsed.data.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
        return new NextResponse(new Uint8Array(pptx), {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="plexon-assistant-report-${slug}.pptx"`,
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'PPTX render failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
