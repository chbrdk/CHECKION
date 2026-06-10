#!/usr/bin/env npx tsx
/**
 * Smoke-test ECHON connectivity (URL is hardcoded in lib/paths/echon-api.ts).
 * Usage:
 *   npm run scripts:test-echon-integration
 *   npm run scripts:test-echon-integration -- --stream   (agent stream probe, ~5s)
 *   npm run scripts:test-echon-integration -- --chat      (full report research path)
 */
import {
    ECHON_API_BASE_URL,
    getEchonIntegrationEnvSnapshot,
    getEchonReportResearchDepth,
    getEchonReportResearchTimeoutMs,
    echonIntegrationUrl,
    echonResearchStreamPath,
} from '../lib/paths/echon-api';
import { runEchonReportResearch } from '../lib/integrations/echon-research-client';
import { runEchonResearchAgentStream } from '../lib/integrations/echon-research-stream-client';

async function main() {
    const env = getEchonIntegrationEnvSnapshot();
    console.log('ECHON integration:', env);
    console.log('api base (code):', ECHON_API_BASE_URL);
    console.log('stream url:', echonIntegrationUrl(echonResearchStreamPath()));
    console.log('research_depth:', getEchonReportResearchDepth());
    console.log('timeout_ms:', getEchonReportResearchTimeoutMs());

    const threadsUrl = echonIntegrationUrl('/api/v2/research/threads?limit=1');

    console.log('\n1) GET threads (reachability)...');
    const listRes = await fetch(threadsUrl, { cache: 'no-store' });
    console.log('   status:', listRes.status);
    if (!listRes.ok) {
        const body = await listRes.text().catch(() => '');
        console.error('   body:', body.slice(0, 400));
        process.exit(1);
    }
    console.log('   OK');

    const runStream = process.argv.includes('--stream') || process.argv.includes('--chat');
    if (runStream) {
        console.log('\n2) POST research/stream (agent probe)...');
        const events: string[] = [];
        const stream = await runEchonResearchAgentStream(
            'CHECKION probe: Versicherungsmarkt DE Kurz',
            {
                timeoutMs: 120_000,
                onEvent: (evt) => {
                    const line = `[${evt.type}]${'thread_id' in evt && evt.thread_id ? ` thread=${evt.thread_id}` : ''}${evt.type === 'error' ? ` ${evt.message ?? ''}` : ''}`;
                    events.push(line);
                    console.log('  ', line.slice(0, 200));
                },
            }
        );
        if (!stream.ok) {
            console.error('\nFAIL: ECHON agent stream error.');
            console.error('   reason:', stream.reason);
            if (stream.detail) console.error('   detail:', stream.detail.slice(0, 500));
            if (stream.detail?.includes('401') || stream.detail?.includes('API key')) {
                console.error('\n>>> Fix on ECHON server (Coolify echon-v2-api): OPENAI_API_KEY is invalid/expired.');
            }
            process.exit(1);
        }
        console.log('   stream complete, thread:', stream.threadId);
    }

    const runChat = process.argv.includes('--chat');
    if (!runChat) {
        if (!runStream) {
            console.log('\nPass --stream for agent probe or --chat for full report path.');
        }
        console.log('\nPASS.');
        return;
    }

    console.log('\n3) Full report research path (stream + poll)...');
    const ctx = await runEchonReportResearch(
        'Kurztest CHECKION: Versicherungsmarkt DE — executive_summary + 2 key_findings.',
        { timeoutMs: getEchonReportResearchTimeoutMs() }
    );
    console.log('   marketContext:', JSON.stringify(ctx, null, 2));
    if (!ctx.available) {
        console.error('\nFAIL: no market context. reason:', ctx.reason);
        if (ctx.errorDetail) console.error('   detail:', ctx.errorDetail.slice(0, 500));
        process.exit(1);
    }
    console.log('\nPASS: ECHON research returned market context.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
