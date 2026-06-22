import type { EventQuickCheckReportModel } from '@/lib/integrations/plexon/event-quick-check-report-types';

export function eventQuickCheckReportModelFixture(): EventQuickCheckReportModel {
  return {
    templateId: 'event_quick_check',
    meta: {
      title: 'Quick Check: bvik.org',
      url: 'https://bvik.org',
      domain: 'bvik.org',
      projectName: 'bvik.org',
      generatedAt: '2026-06-15T12:00:00.000Z',
      playbookLabel: 'Quick Check',
    },
    executive: {
      summary: 'Domain score 57 with accessibility issues.',
      fazit: 'Fix template-level A11y first.',
      kpiTiles: [
        { label: 'Domain-Score', value: 57, unit: '/100' },
        { label: 'Seiten', value: 50 },
        { label: 'Fehler', value: 213 },
      ],
    },
    workflow: {
      steps: [
        { id: 'domain_scan', label: 'Domain-Scan', status: 'done', detail: 'Abgeschlossen' },
        { id: 'geo_check', label: 'GEO', status: 'error', detail: 'Timeout' },
      ],
    },
    domain: {
      scanId: 'scan-1',
      domain: 'bvik.org',
      url: 'https://bvik.org',
      status: 'complete',
      score: 57,
      totalPages: 50,
      stats: { errors: 213, warnings: 0, notices: 0, total: 213 },
      topIssues: [{ title: 'Missing submit button', count: 50 }],
      checkionHref: 'https://checkion.example/scan/1',
    },
    persona: {
      id: 'p1',
      name: 'Elena',
      segment: 'B2B',
      confidence: 0.81,
      headline: 'Operations Director',
      traits: [{ name: 'detail_oriented', displayName: 'Detail-orientiert', score: 0.82 }],
      goals: ['Stay informed'],
      painPoints: ['Long cycles'],
      interests: ['Digitalization'],
    },
    geo: {
      status: 'failed',
      errorMessage: 'Navigation timeout',
      questions: ['Top Verbände?'],
      competitors: [],
      recommendations: [],
    },
    insights: {
      findings: [{ title: 'A11y', description: '213 errors', severity: 'error' }],
      recommendations: [{ title: 'Fix forms', description: 'Add submit buttons', priority: 1 }],
    },
    appendix: {
      scanId: 'scan-1',
      stepTable: { columns: ['Schritt', 'Status', 'Ergebnis'], rows: [['GEO', '✗', 'Timeout']] },
      links: [],
    },
  };
}
