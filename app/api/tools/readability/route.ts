import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    let text = '';
    try {
        const body = await req.json();
        text = body.text;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!text) {
        return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length === 0) {
        return NextResponse.json({ error: 'Text is empty' }, { status: 400 });
    }

    const sentences = cleanText.split(/[.!?]+/).length;
    const words = cleanText.split(/\s+/).length;
    const syllables = cleanText.split(/[aeiouy]+/).length; // Rough approximation

    // Flesch-Kincaid Grade Level Formula
    const s_w = sentences > 0 ? (words / sentences) : 0;
    const syl_w = words > 0 ? (syllables / words) : 0;
    let gradeLevel = 0.39 * s_w + 11.8 * syl_w - 15.59;
    if (isNaN(gradeLevel) || gradeLevel < 0) gradeLevel = 0;

    let grade = 'Unknown';
    if (gradeLevel <= 6) grade = 'Easy (6th Grade)';
    else if (gradeLevel <= 10) grade = 'Standard (High School)';
    else if (gradeLevel <= 14) grade = 'Complex (College)';
    else grade = 'Very Complex (Academic)';

    return NextResponse.json({
        success: true,
        data: {
            score: parseFloat(gradeLevel.toFixed(2)),
            grade,
            stats: {
                sentences,
                words,
                syllables
            }
        }
    });
}
