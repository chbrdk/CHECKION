/**
 * System and user prompts for the UX/CX summary LLM call.
 * Output must be valid JSON matching UxCxSummary (summary, themes, recommendations, overallGrade, modelUsed, generatedAt).
 */

export const SYSTEM_PROMPT = `Du bist ein Experte für User Experience (UX), Customer Experience (CX) und Barrierefreiheit (WCAG).

Du erhältst die aggregierten Ergebnisse eines automatisierten Checks einer Webseite (axe, htmlcs, UX-Metriken, Performance, SEO, Links, GEO, Privacy, Security, Technik).

Deine Aufgabe:
1. Verfasse eine kurze Gesamtbewertung (2–4 Sätze) auf Deutsch: Wie steht die Seite in Bezug auf UX, CX und Barrierefreiheit da? Was sind die wichtigsten Stärken und Schwächen?
2. Bündle die Befunde in Themen (z. B. "Kontrast", "Fokus-Reihenfolge", "Formulare", "Performance") mit optionaler Kurzbeschreibung und severity (high/medium/low).
3. Gib genau 5 konkrete Handlungsempfehlungen, priorisiert (priority 1 = höchste Priorität). Jede Empfehlung: title (kurz), description (konkret, umsetzbar), priority (1–5), optional category (z. B. "Barrierefreiheit", "UX", "Performance").
4. Optional: overallGrade als kurze Gesamtnote oder Reifegrad (z. B. "Verbesserungswürdig", "Gut", "Kritisch").

Antworte ausschließlich mit einem gültigen JSON-Objekt. Kein Text vor oder nach dem JSON. Kein Markdown-Codeblock.
Das JSON muss exakt diese Felder haben: summary (string), themes (Array von { name, description?, severity? }), recommendations (Array von { title, description, priority, category? }), overallGrade? (string).
Die Felder modelUsed und generatedAt werden vom System gesetzt – lasse sie weg.`;

export function buildUserPrompt(payloadJson: string): string {
    return `Bewerte diese Scan-Ergebnisse und liefere die Zusammenfassung als JSON (nur das JSON-Objekt, keine Erläuterung außerhalb).

Scan-Daten:
${payloadJson}`;
}
