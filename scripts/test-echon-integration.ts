#!/usr/bin/env npx tsx
/**
 * Smoke-test ECHON connectivity (URL is hardcoded in lib/paths/echon-api.ts).
 * Usage:
 *   npm run scripts:test-echon-integration
 *   npm run scripts:test-echon-integration -- --chat
 */
import {
    ECHON_API_BASE_URL,
    getEchonIntegrationEnvSnapshot,
    getEchonReportResearchDepth,
    getEchonReportResearchTimeoutMs,
    echonIntegrationUrl,
} from '../lib/paths/echon-api';
import { runEchonReportResearch } from '../lib/integrations/echon-research-client';

async function main() {
    const env = getEchonIntegrationEnvSnapshot();
    console.log('ECHON integration:', env);
    console.log('api base (code):', ECHON_API_BASE_URL);
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

    const runChat = process.argv.includes('--chat');
    if (!runChat) {
        console.log('\nSkip live chat (pass --chat to run research with poll, may take several min).');
        console.log('PASS: ECHON base URL reachable.');
        return;
    }

    console.log('\n2) POST research/chat (minimal query, can be slow)...');
    const ctx = await runEchonReportResearch(
        'Kurztest CHECKION: Versicherungsmarkt DE — executive_summary + 2 key_findings.',
        { timeoutMs: getEchonReportResearchTimeoutMs() }
    );
    console.log('   marketContext:', JSON.stringify(ctx, null, 2));
    if (!ctx.available) {
        console.error('\nFAIL: chat did not return structured answer. reason:', ctx.reason);
        process.exit(1);
    }
    console.log('\nPASS: ECHON research chat returned market context.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
