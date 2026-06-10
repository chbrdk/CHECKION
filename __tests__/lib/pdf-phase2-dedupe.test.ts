import { describe, it, expect } from 'vitest';
import { selectCompetitiveInsightsForPdf } from '@/lib/project-report/pdf-competitive-display';
import { filterFindingsForPdf } from '@/lib/project-report/pdf-findings-display';
import {
    filterSupplementaryMetricsForPdf,
    PDF_KPI_EXCLUDED_METRIC_IDS,
} from '@/lib/project-report/pdf-metrics-display';
import { PDF_AUDIENCE_PERSONA_LIMIT } from '@/lib/project-report/audience-pdf-personas';
import type { CompetitiveInsightFact, MetricInsight } from '@/lib/project-report/types';

describe('PDF phase-2 compactness', () => {
    it('limits competitive insight cards to top 3 gaps', () => {
        const insights: CompetitiveInsightFact[] = [
            { id: '1', kind: 'topic_gap', title: 'A', description: 'a', evidenceId: 'e' },
            { id: '2', kind: 'topic_gap', title: 'B', description: 'b', evidenceId: 'e' },
            { id: '3', kind: 'gap', title: 'C', description: 'c', evidenceId: 'e' },
            { id: '4', kind: 'topic_gap', title: 'D', description: 'd', evidenceId: 'e' },
            { id: '5', kind: 'topic_lead', title: 'E', description: 'e', evidenceId: 'e' },
        ];
        const selected = selectCompetitiveInsightsForPdf(insights);
        expect(selected).toHaveLength(3);
        expect(selected.every((i) => i.kind === 'gap' || i.kind === 'topic_gap')).toBe(true);
    });

    it('excludes executive scorecard metrics from KPI appendix', () => {
        const metrics: MetricInsight[] = [
            {
                id: 'domain-score',
                pillar: 'wcag',
                label: 'Domain',
                value: 64,
                evidenceId: 'e',
            },
            {
                id: 'ranking-vs-best-competitor',
                pillar: 'competitive',
                label: 'Vs best',
                value: -5,
                evidenceId: 'e',
            },
        ];
        const filtered = filterSupplementaryMetricsForPdf(metrics);
        expect(filtered.map((m) => m.id)).toEqual(['ranking-vs-best-competitor']);
        expect(PDF_KPI_EXCLUDED_METRIC_IDS.has('domain-score')).toBe(true);
    });

    it('filters duplicate findings vs executive summary', () => {
        const exec =
            'GEO-Score 93 und starke LLM-Sichtbarkeit bei den meisten Modellen im Benchmark.';
        const findings = filterFindingsForPdf(
            [
                {
                    title: 'GEO stark',
                    description:
                        'GEO-Score 93 und starke LLM-Sichtbarkeit bei den meisten Modellen im Benchmark.',
                },
                {
                    title: 'WCAG systemisch',
                    description: '26.953 WCAG-Fehler deuten auf Template-Probleme in Formularen und Links.',
                },
            ],
            exec
        );
        expect(findings).toHaveLength(1);
        expect(findings[0]?.title).toBe('WCAG systemisch');
    });

    it('uses 3 personas in PDF audience chapter', () => {
        expect(PDF_AUDIENCE_PERSONA_LIMIT).toBe(3);
    });
});
