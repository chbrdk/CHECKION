/** Latest persisted agent stage on an ECHON research thread (for progress logging). */

const STAGE_ORDER = ['discovery', 'plan', 'retrieval', 'scoring', 'synthesis', 'final'] as const;

export type EchonAgentStage = (typeof STAGE_ORDER)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function getLatestEchonAgentStage(threadRaw: unknown): EchonAgentStage | 'user_only' | null {
    if (!isRecord(threadRaw)) return null;
    const messages = threadRaw.messages;
    if (!Array.isArray(messages)) return messages === undefined ? null : 'user_only';

    let latest: EchonAgentStage | null = null;
    for (const msg of messages) {
        if (!isRecord(msg)) continue;
        const structured = isRecord(msg.structured) ? msg.structured : null;
        const stage = structured?.stage;
        if (typeof stage !== 'string') continue;
        if ((STAGE_ORDER as readonly string[]).includes(stage)) {
            latest = stage as EchonAgentStage;
        }
    }

    if (latest) return latest;
    const hasUser = messages.some((m) => isRecord(m) && m.role === 'user');
    return hasUser ? 'user_only' : null;
}
