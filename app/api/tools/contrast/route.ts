import { NextRequest, NextResponse } from 'next/server';

function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const f = searchParams.get('f'); // Foreground (without #)
    const b = searchParams.get('b'); // Background (without #)

    if (!f || !b) {
        return NextResponse.json({ error: 'Missing parameters f (foreground) and b (background) hex codes.' }, { status: 400 });
    }

    const rgb1 = hexToRgb(f);
    const rgb2 = hexToRgb(b);

    if (!rgb1 || !rgb2) {
        return NextResponse.json({ error: 'Invalid hex codes.' }, { status: 400 });
    }

    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    const ratioRounded = parseFloat(ratio.toFixed(2));

    let aa = 'fail';
    let aaa = 'fail';
    let aaLarge = 'fail';
    let aaaLarge = 'fail';

    if (ratio >= 4.5) aa = 'pass';
    if (ratio >= 7) aaa = 'pass';
    if (ratio >= 3) aaLarge = 'pass';
    if (ratio >= 4.5) aaaLarge = 'pass';

    return NextResponse.json({
        success: true,
        data: {
            ratio: ratioRounded,
            score: {
                aa,
                aaa,
                aaLarge,
                aaaLarge
            }
        }
    });
}
