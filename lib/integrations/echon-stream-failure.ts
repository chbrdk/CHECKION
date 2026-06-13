/** Stream failures where ECHON may still finish the run — keep polling the thread. */
export function isRecoverableEchonStreamFailure(reason: string): boolean {
    return (
        reason === 'echon_fetch_timeout' ||
        reason === 'echon_stream_incomplete' ||
        reason === 'echon_fetch_failed' ||
        reason === 'echon_http_503'
    );
}

/** Hard failures from ECHON agent (LLM/auth) — stop immediately. */
export function isFatalEchonStreamFailure(reason: string): boolean {
    return reason === 'echon_stream_error' || reason === 'echon_stream_parse_failed';
}
