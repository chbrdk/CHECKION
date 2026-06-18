/**
 * Sample UiLayout covering all Plexon assistant block types (tests + manual QA).
 */
import type { PlexonAssistantReportPayload, PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';

function block(type: string, props: Record<string, unknown>, id = type): PlexonUiBlock {
    return { id, type, props };
}

export const PLEXON_ASSISTANT_SAMPLE_BLOCKS: PlexonUiBlock[] = [
    block('text', { markdown: '# Rich Report\n\nIntro from assistant session.' }, 'report-intro'),
    block('alert', { title: 'Zusammenfassung', message: 'Executive summary text.', tone: 'info' }, 'report-summary'),
    block('metric_grid', {
        title: 'Kernkennzahlen',
        items: [{ label: 'Score', value: 92, unit: '%', tone: 'success' }],
    }, 'report-highlights'),
    block('finding_list', {
        title: 'Erkenntnisse',
        items: [{ title: 'Finding', description: 'Detail', severity: 'warning' }],
    }, 'report-findings'),
    block('metric_grid', {
        title: 'KPIs',
        items: [{ label: 'Visits', value: 1200 }],
    }, 'report-pin-metric'),
    block('data_table', {
        title: 'Top Issues',
        columns: ['Issue', 'Count'],
        rows: [['Broken links', 3]],
    }, 'report-pin-table'),
    block('chart', {
        title: 'Traffic',
        chartType: 'bar',
        labels: ['Mon', 'Tue'],
        datasets: [{ label: 'Visits', values: [100, 120] }],
    }, 'report-pin-chart'),
    block('persona_card', {
        title: 'Personas',
        personas: [{ id: 'p1', name: 'Anna', segment: 'B2B', confidence: 0.9, headline: 'Decision maker' }],
    }, 'report-pin-persona'),
    block('alert', { title: 'Fazit', message: 'Overall positive outlook.', tone: 'success' }, 'report-fazit'),
    block('recommendation_list', {
        title: 'Empfehlungen',
        items: [{ title: 'Fix links', description: 'Update hrefs', priority: 1 }],
    }, 'report-recommendations'),
];

export const PLEXON_ASSISTANT_ALL_BLOCK_TYPES: PlexonUiBlock[] = [
    block('text', { markdown: 'Intro text' }),
    block('alert', { title: 'Hinweis', message: 'Wichtig', tone: 'warning' }),
    block('metric_grid', { title: 'KPIs', items: [{ label: 'Score', value: 92, unit: '%' }] }),
    block('data_table', { title: 'Top Issues', columns: ['Issue', 'Count'], rows: [['Broken links', 3]] }),
    block('key_value_list', { title: 'Scan', items: [{ label: 'URL', value: 'https://example.com' }] }),
    block('finding_list', { items: [{ title: 'Finding', description: 'Detail', severity: 'warning' }] }),
    block('recommendation_list', { items: [{ title: 'Fix links', description: 'Update hrefs', priority: 1 }] }),
    block('link_list', { title: 'Links', links: [{ label: 'Report', href: 'https://example.com/r' }] }),
    block('persona_card', {
        personas: [{ id: 'p1', name: 'Anna', segment: 'B2B', confidence: 0.9, headline: 'Decision maker' }],
    }),
    block('target_group_card', {
        targetGroups: [{
            id: 'tg1',
            name: 'Enterprise',
            segment: 'DE',
            description: 'Large accounts',
            personaCount: 2,
            knowledgeEntryCount: 5,
        }],
    }),
    block('summary_card', {
        title: 'Overview',
        checkionScanCount: 4,
        audionPersonaCount: 2,
        links: [{ label: 'Open', href: 'https://example.com' }],
    }),
    block('step_list', {
        title: 'Workflow',
        steps: [{ id: 's1', label: 'Scan', status: 'done', detail: 'Completed' }],
    }),
    block('corner_tab_section', { tabLabel: 'SEO', title: 'Meta', markdown: 'Description missing' }),
    block('collapsible', { title: 'Details', markdown: 'Hidden content in print' }),
    block('chart', {
        title: 'Traffic',
        chartType: 'bar',
        labels: ['Mon', 'Tue'],
        datasets: [{ label: 'Visits', values: [100, 120] }],
    }),
];

export function plexonAssistantReportFixture(
    blocks: PlexonUiBlock[] = PLEXON_ASSISTANT_SAMPLE_BLOCKS
): PlexonAssistantReportPayload {
    return {
        title: 'Rich Report',
        locale: 'de',
        uiLayout: { version: 1, blocks },
    };
}
