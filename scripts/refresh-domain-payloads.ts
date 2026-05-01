/**
 * Rebuild stored domain payloads from existing per-page scans.
 *
 *   DATABASE_URL=... npx tsx scripts/refresh-domain-payloads.ts --dry-run
 *   DATABASE_URL=... npx tsx scripts/refresh-domain-payloads.ts
 *
 * Docker (optional, before `npm run start`): set `CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START=1`
 * or `dry-run` — see `knowledge/checkion-docker-refresh-domain-payloads.md`.
 *
 * @see lib/domain-payload-refresh-batch.ts
 */

import {
    parseDomainPayloadRefreshCliArgs,
    printDomainPayloadRefreshHelp,
    runDomainPayloadRefreshBatch,
} from '@/lib/domain-payload-refresh-batch';

async function main(): Promise<void> {
    const parsed = parseDomainPayloadRefreshCliArgs(process.argv.slice(2));
    if (!parsed.ok) {
        printDomainPayloadRefreshHelp();
        process.exit(0);
    }

    const summary = await runDomainPayloadRefreshBatch(parsed.options);
    console.log(
        JSON.stringify(
            {
                examined: summary.examined,
                updated: summary.updated,
                skipped: summary.skipped,
                failed: summary.failed,
                dryRun: parsed.options.dryRun,
            },
            null,
            2
        )
    );
    process.exit(summary.failed > 0 ? 1 : 0);
}

void main();
