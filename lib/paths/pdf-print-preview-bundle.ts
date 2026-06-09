/**
 * Comprehensive project-report bundle for `/dev/pdf-print` — drives `ProjectReportDocument`.
 */
import { buildChartSpecs } from '@/lib/project-report/chart-specs';
import type { AudiencePersonaFitFact, DomainFacts, ProjectReportBundle } from '@/lib/project-report/types';

const EVIDENCE = 'preview-evidence-1';

const PREVIEW_PILLARS = ['wcag', 'seo', 'geo', 'rankings', 'performance', 'topics'] as const;

function previewAudiencePersona(
    personaId: string,
    personaName: string,
    headline: string,
    pillarScores: readonly [number, number, number, number, number, number],
    overallFit: AudiencePersonaFitFact['overallFit'] = 'mixed'
): AudiencePersonaFitFact {
    return {
        personaId,
        personaName,
        targetGroupId: 'tg-1',
        targetGroupName: 'Verantwortungsbewusste Hundehalter',
        headline,
        painPoints: [],
        goals: [],
        pillars: PREVIEW_PILLARS.map((pillar, index) => {
            const score = pillarScores[index] ?? 50;
            const level =
                score >= 75 ? 'strong' : score >= 50 ? 'mixed' : ('weak' as const);
            return { pillar, level, score, note: '' };
        }),
        overallFit,
        insights: [
            {
                id: `${personaId}-ins`,
                kind: 'persona_voice',
                title: 'Perspektive',
                description: headline,
                evidenceId: EVIDENCE,
            },
        ],
        geoQuestionMatches: [],
        latestUxJourney: null,
        evidenceId: EVIDENCE,
        evaluationSource: 'agent',
        personaPerspective: headline,
    };
}

export function buildComprehensivePreviewBundle(): ProjectReportBundle {
    const domain: DomainFacts = {
        scanId: 'scan-preview',
        domain: 'example.com',
        score: 72,
        wcagScore: 68,
        seoOnPageScore: 81,
        seoOnPageLabel: 'Gut',
        totalPageCount: 124,
        scannedAt: '2026-06-01T10:00:00.000Z',
        issueStats: { errors: 12, warnings: 34, notices: 8 },
        performance: { avgTtfb: 420, avgFcp: 1.8, avgLcp: 2.4 },
        eco: { avgCo2: 0.42, gradeDistribution: { A: 40, B: 52, C: 32 } },
        pageClassification: {
            topThemes: [
                {
                    tag: 'Versicherungen',
                    score: 88,
                    pageCount: 24,
                    themeTagKey: 'versicherungen',
                    maxTier: 4 as const,
                    avgTier: 2.8,
                },
                {
                    tag: 'Haftpflicht',
                    score: 76,
                    pageCount: 18,
                    themeTagKey: 'haftpflicht',
                    maxTier: 3 as const,
                    avgTier: 2.4,
                },
                {
                    tag: 'Hundehalter',
                    score: 64,
                    pageCount: 11,
                    themeTagKey: 'hundehalter',
                    maxTier: 3 as const,
                    avgTier: 2.1,
                },
            ],
            coverage: { totalPages: 124, pagesWithClassification: 110 },
            tierDistribution: {
                avgTagsPerPageByTier: { tier1: 1, tier2: 2, tier3: 3, tier4: 2, tier5: 1 },
                pagesWithAtLeastOneTier5: 12,
                pagesDominatedByLowTiers: 8,
            },
            pageSamples: [],
        },
        systemicIssues: [
            { issueId: 'missing-alt', title: 'Fehlende Alt-Texte', count: 18, evidenceId: EVIDENCE },
            { issueId: 'contrast', title: 'Kontrast zu niedrig', count: 9, evidenceId: EVIDENCE },
        ],
        llmSummary: {
            summary:
                'Die Domain wirkt inhaltlich stark auf Versicherungsprodukte ausgerichtet, weist aber technische Schwächen bei Barrierefreiheit und Performance auf.',
            themes: [{ name: 'Versicherungsprodukte', severity: 'medium' as const }],
            recommendations: [
                {
                    title: 'WCAG-Fixes priorisieren',
                    description: 'Alt-Texte und Kontraste auf Produktseiten beheben.',
                    priority: 1 as const,
                },
            ],
            modelUsed: 'preview',
            generatedAt: '2026-06-01T10:00:00.000Z',
        },
        evidenceIds: { wcagScore: EVIDENCE, seoScore: EVIDENCE, domainScore: EVIDENCE },
    };

    const competitors = [
        {
            domain: 'competitor-a.de',
            scanId: 'c1',
            status: 'complete',
            score: 78,
            wcagScore: 74,
            seoOnPageScore: 85,
            seoOnPageLabel: 'Sehr gut',
            totalPageCount: 210,
            pageClassification: null,
            issueStats: { errors: 6, warnings: 20, notices: 4 },
            performance: { avgTtfb: 380, avgFcp: 1.5, avgLcp: 2.1 },
            eco: null,
            systemicIssues: [],
            llmSummary: null,
            evidenceIds: { wcagScore: EVIDENCE, seoScore: EVIDENCE, domainScore: EVIDENCE },
            evidenceId: EVIDENCE,
        },
        {
            domain: 'competitor-b.de',
            scanId: 'c2',
            status: 'complete',
            score: 65,
            wcagScore: 60,
            seoOnPageScore: 72,
            seoOnPageLabel: 'Gut',
            totalPageCount: 98,
            pageClassification: null,
            issueStats: { errors: 14, warnings: 28, notices: 6 },
            performance: null,
            eco: null,
            systemicIssues: [],
            llmSummary: null,
            evidenceIds: { wcagScore: EVIDENCE, seoScore: EVIDENCE, domainScore: EVIDENCE },
            evidenceId: EVIDENCE,
        },
    ];

    const rankings = {
        score: 58,
        keywordCount: 48,
        lastUpdated: '2026-06-01T08:00:00.000Z',
        competitorScores: { 'competitor-a.de': 71, 'competitor-b.de': 52 },
        topKeywords: [
            { id: 'k1', keyword: 'hundehalterhaftpflicht', position: 8, evidenceId: EVIDENCE },
            { id: 'k2', keyword: 'haftpflicht hund', position: 14, evidenceId: EVIDENCE },
            { id: 'k3', keyword: 'versicherung hundehalter', position: 22, evidenceId: EVIDENCE },
        ],
        evidenceId: EVIDENCE,
    };

    const geo = {
        score: 64,
        runId: 'geo-preview',
        runUrl: 'https://example.com',
        runCreatedAt: '2026-06-01T09:00:00.000Z',
        status: 'complete',
        recommendations: [
            {
                title: 'FAQ-Schema für GEO-Fragen ergänzen',
                description: 'Strukturierte Antworten erhöhen die Zitierwahrscheinlichkeit in LLM-Antworten.',
                priority: 1,
            },
        ],
        competitiveDomains: [
            { domain: 'example.com', shareOfVoice: 0.28, avgPosition: 2.1, score: 64, evidenceId: EVIDENCE },
            { domain: 'competitor-a.de', shareOfVoice: 0.35, avgPosition: 1.4, score: 78, evidenceId: EVIDENCE },
        ],
        competitorScores: { 'competitor-a.de': 78 },
        evidenceId: EVIDENCE,
    };

    const rankTrends = [
        {
            keywordId: 'k1',
            keyword: 'hundehalterhaftpflicht',
            points: [
                { recordedAt: '2026-05-01', position: 14 },
                { recordedAt: '2026-05-15', position: 11 },
                { recordedAt: '2026-06-01', position: 8 },
            ],
        },
    ];

    const geoQuestionDetails = [
        {
            queryText: 'Welche Versicherung empfehlen Makler für Hundehalterhaftpflicht?',
            queryIndex: 1,
            latestPosition: 2.1,
            trend: 'improving' as const,
            positionsByModel: [
                { modelId: 'GPT 5', position: 2, cited: true },
                { modelId: 'Claude', position: 4, cited: true },
            ],
            topCitedDomains: ['competitor-a.de', 'example.com'],
            points: [
                { recordedAt: '2026-05-01', avgPosition: 4.2 },
                { recordedAt: '2026-05-15', avgPosition: 3.1 },
                { recordedAt: '2026-06-01', avgPosition: 2.1 },
            ],
            evidenceId: 'geo-q-1',
        },
        {
            queryText: 'Was kostet eine Hundehaftpflicht für große Rassen?',
            queryIndex: 2,
            latestPosition: 5.5,
            trend: 'stable' as const,
            positionsByModel: [
                { modelId: 'GPT 5', position: 5, cited: false },
                { modelId: 'Claude', position: 6, cited: true },
            ],
            topCitedDomains: ['competitor-b.de'],
            points: [
                { recordedAt: '2026-05-01', avgPosition: 5.8 },
                { recordedAt: '2026-06-01', avgPosition: 5.5 },
            ],
            evidenceId: 'geo-q-2',
        },
    ];

    const deep = {
        metrics: [
            {
                id: 'm-domain',
                pillar: 'wcag' as const,
                label: 'Domain Score',
                value: 72,
                unit: '/100',
                benchmark: 'Branche Ø 68',
                interpretation: 'Leicht über Branchendurchschnitt',
                evidenceId: EVIDENCE,
            },
            {
                id: 'm-geo',
                pillar: 'geo' as const,
                label: 'GEO Score',
                value: 64,
                unit: '/100',
                evidenceId: EVIDENCE,
            },
        ],
        sections: {
            siteQuality: {
                title: 'Site Quality',
                summary:
                    'Technische Qualität ist solide, aber WCAG-Fehler und Formular-Reibung bremsen Vertrauen. Performance liegt im grünen Bereich, Eco leicht über dem Zielwert.',
                keyFindings: [
                    '12 kritische WCAG-Fehler',
                    'LCP unter 2.5s auf 78% der Seiten',
                    'Fehlende Alt-Texte auf 34 Seiten',
                ],
                metricsHighlighted: ['Domain Score', 'WCAG'],
                metricInterpretations: {
                    domainScore:
                        'Mit 72/100 liegt die Domain leicht über dem Branchendurchschnitt — Nutzer finden Inhalte, aber wiederkehrende UX- und Barrierefreiheits-Lücken kosten Conversion.',
                    wcagErrors:
                        '12 Fehler und 34 Warnungen bedeuten: Screenreader-Nutzer stoßen auf strukturelle Hürden. Die häufigsten Muster betreffen Bilder ohne Alt-Text und Formular-Labels.',
                    performance:
                        'Ø LCP 2,4s ist akzeptabel (Google-Ziel ≤2,5s). TTFB 420ms deutet auf moderate Server-Antwortzeiten — bei Traffic-Spitzen spürbar.',
                    eco: '0,42g CO₂ pro Aufruf ist moderat — Bildoptimierung und weniger Third-Party-Skripte würden Nachhaltigkeit und Ladezeit verbessern.',
                    systemicIssues:
                        'Die drei häufigsten Issue-Typen wiederholen sich auf Dutzenden Seiten. Template- oder Komponenten-Fixes haben hier den größten Hebel.',
                },
            },
            seoRankings: {
                title: 'SEO & Rankings',
                summary:
                    'Starke On-Page-Basis, Rankings mit Verbesserungspotenzial bei Long-Tail-Keywords. Der Kernbegriff „hundehalterhaftpflicht“ steigt Richtung Top 5.',
                keyFindings: ['48 Keywords getrackt', 'Top-10 für 6 Kernbegriffe'],
                metricsHighlighted: ['SEO On-Page', 'Ranking Score'],
                metricInterpretations: {
                    seoOnPage:
                        '81/100 On-Page: Titel, Meta und H1 sind überwiegend sauber — gute Grundlage für Crawling und Snippets.',
                    rankingScore:
                        '58/100 Ranking-Score: sichtbar bei Kernbegriffen, aber viele Long-Tail-Begriffe noch außerhalb der Top 10.',
                    keywords:
                        '48 Keywords im Tracking — 6 in den Top 10. „hundehalterhaftpflicht“ (#8) ist der stärkste Hebel für organischen Traffic.',
                    rankTrend:
                        'Positiver Trend bei „hundehalterhaftpflicht“ (#14 → #8) — Content und interne Verlinkung wirken.',
                },
            },
            geo: {
                title: 'GEO / EEAT',
                summary:
                    'Sichtbarkeit in LLM-Antworten wächst, Wettbewerber A dominiert bei Share of Voice. On-Page E-E-A-T ist solide, FAQ-Content fehlt für Kernfragen.',
                keyFindings: ['2 von 5 Kernfragen zitiert', 'FAQ-Content unterrepräsentiert'],
                metricsHighlighted: ['GEO Score', 'Share of Voice'],
                metricInterpretations: {
                    geoScore:
                        '64/100 GEO-Score: mittlere KI-Sichtbarkeit — bei Kernfragen teils zitiert, bei Long-Tail noch Lücken.',
                    llmVisibility:
                        '2 Modelle (GPT, Claude) — GPT führt mit 72/100 Sichtbarkeit, Claude folgt mit 61.',
                    geoQuestions:
                        '2 Testfragen — 1 ohne Zitation der eigenen Domain. FAQ- und Schema-Inhalte erhöhen Zitierwahrscheinlichkeit.',
                    geoOnPageEeat:
                        '1 Seite analysiert — GEO-Fitness 71/100, Vertrauen 4/5. Fehlende FAQ und Autor-Bio bremsen E-E-A-T.',
                    geoCompetitive:
                        'competitor-a.de führt mit GEO-Score 78 vs. eigene 64 — höherer Share of Voice in LLM-Antworten.',
                    geoInsights:
                        '40% der Testfragen ohne Eigen-Zitation — Content-Lücken bei strukturierten Antworten.',
                },
            },
            competitive: {
                title: 'Wettbewerb',
                summary: 'competitor-a.de führt bei Domain- und GEO-Score, eigene Themenvielfalt ist stärker.',
                keyFindings: ['SEO-Rang #2 im Set', '3 exklusive Content-Themen'],
                metricsHighlighted: ['Domain Score Rank'],
            },
            journey: null,
        },
        geoQuestionHistory: geoQuestionDetails.map((q) => ({
            queryText: q.queryText,
            queryIndex: q.queryIndex,
            points: q.points,
            latestPosition: q.latestPosition,
            trend: q.trend,
            evidenceId: q.evidenceId,
        })),
        geoPages: [
            {
                url: 'https://example.com/haftpflicht',
                title: 'Hundehalterhaftpflicht',
                geoFitnessScore: 71,
                trustScore: 4,
                experienceScore: 3,
                expertiseScore: 4,
                authoritativenessScore: 3,
                missingElements: ['FAQ', 'Autor-Bio'],
                hasPrivacy: true,
                hasImpressum: true,
                evidenceId: EVIDENCE,
            },
        ],
        geoDeep: {
            modelBenchmarks: [
                {
                    modelId: 'GPT 5',
                    shareOfVoice: 0.32,
                    avgPosition: 2.4,
                    mentionCount: 18,
                    queryCount: 24,
                    visibilityScore: 72,
                    evidenceId: EVIDENCE,
                },
                {
                    modelId: 'Claude',
                    shareOfVoice: 0.24,
                    avgPosition: 3.1,
                    mentionCount: 12,
                    queryCount: 24,
                    visibilityScore: 61,
                    evidenceId: EVIDENCE,
                },
            ],
            questionDetails: geoQuestionDetails,
            pages: [],
            deterministicInsights: [
                {
                    id: 'geo-ins-1',
                    kind: 'question' as const,
                    title: 'Kernfrage ohne Zitation',
                    description: 'Bei 40% der GEO-Fragen fehlt eine Zitation der eigenen Domain.',
                    evidenceId: EVIDENCE,
                },
            ],
            summary: {
                modelCount: 2,
                questionCount: 2,
                pageCount: 1,
                avgGeoFitness: 71,
                avgTrust: 4,
                questionsNotCited: 1,
                pagesBelowGeoThreshold: 0,
            },
        },
        rankKeywordDetails: [
            {
                id: 'k1',
                keyword: 'hundehalterhaftpflicht',
                position: 8,
                previousPosition: 11,
                positionDelta: 3,
                serpLeaderDomain: 'competitor-a.de',
                competitorPositions: { 'competitor-a.de': 3, 'competitor-b.de': 12 },
                points: rankTrends[0]!.points,
                evidenceId: EVIDENCE,
            },
        ],
        issueGroups: [
            {
                groupKey: 'img-alt',
                title: 'Fehlende Alt-Texte',
                type: 'wcag',
                pageCount: 18,
                wcagLevel: 'A',
                evidenceId: EVIDENCE,
            },
        ],
        seoRollup: {
            pagesMissingTitle: 2,
            pagesMissingMeta: 6,
            pagesMissingH1: 4,
            duplicateTitles: 1,
            brokenLinksCount: 3,
            jsonLdPages: 42,
        },
        competitiveBenchmark: {
            scoreboard: [
                {
                    domain: 'example.com',
                    isOwn: true,
                    scanStatus: 'complete',
                    domainScore: 72,
                    wcagScore: 68,
                    seoOnPageScore: 81,
                    totalPageCount: 124,
                    wcagErrors: 12,
                    avgLcp: 2.4,
                    avgCo2: 0.42,
                    geoScore: 64,
                    rankingScore: 58,
                    domainScoreDeltaVsOwn: null,
                    seoDeltaVsOwn: null,
                    evidenceId: EVIDENCE,
                },
                {
                    domain: 'competitor-a.de',
                    isOwn: false,
                    scanStatus: 'complete',
                    domainScore: 78,
                    wcagScore: 74,
                    seoOnPageScore: 85,
                    totalPageCount: 210,
                    wcagErrors: 6,
                    avgLcp: 2.1,
                    avgCo2: null,
                    geoScore: 78,
                    rankingScore: 71,
                    domainScoreDeltaVsOwn: 6,
                    seoDeltaVsOwn: 4,
                    evidenceId: EVIDENCE,
                },
            ],
            topicOverlap: [
                {
                    themeTag: 'Haftpflicht',
                    themeTagKey: 'haftpflicht',
                    own: { score: 76, pageCount: 18, maxTier: 3, avgTier: 2.1 },
                    competitors: {
                        'competitor-a.de': { score: 82, pageCount: 24, maxTier: 3, avgTier: 2.4 },
                    },
                    presentOn: ['example.com', 'competitor-a.de'],
                    evidenceId: EVIDENCE,
                },
            ],
            deterministicInsights: [
                {
                    id: 'comp-ins-1',
                    kind: 'gap' as const,
                    title: 'GEO-Rückstand vs. competitor-a.de',
                    description: 'Share of Voice 7 Prozentpunkte unter Marktführer.',
                    evidenceId: EVIDENCE,
                },
            ],
            summary: {
                completeCompetitorCount: 2,
                ownDomainScoreRank: 2,
                ownSeoRank: 2,
                sharedThemeCount: 4,
                uniqueOwnThemes: 3,
                themesOnlyCompetitorsHave: 2,
            },
        },
    };

    const visuals = buildChartSpecs(
        domain,
        competitors,
        rankings,
        geo,
        'example.com',
        rankTrends,
        deep
    );

    return {
        version: '2.0',
        generatedAt: '2026-06-06T10:00:00.000Z',
        locale: 'de',
        variant: 'comprehensive',
        project: {
            id: 'preview-project',
            name: 'Beispiel GmbH',
            domain: 'example.com',
            industry: 'Versicherung',
            valueProposition:
                'Spezialisierte Haftpflicht-Lösungen für Hundehalter mit transparenten Tarifen und schneller Schadensabwicklung.',
            tags: ['versicherung', 'b2c'],
            competitors: ['competitor-a.de', 'competitor-b.de'],
            counts: {
                domainScans: 3,
                journeyRuns: 2,
                geoEeatRuns: 1,
                singleScans: 5,
                rankTrackingKeywords: 48,
            },
        },
        domain,
        competitors,
        rankings,
        geo,
        rankTrends,
        journey: {
            runId: 'journey-1',
            url: 'https://example.com/tarif',
            task: 'Tarif für Labrador berechnen',
            status: 'complete',
            createdAt: '2026-06-01T11:00:00.000Z',
            stepCount: 6,
            summary: 'Journey erfolgreich, aber Formularschritt mit unnötiger Reibung.',
        },
        visuals,
        narrative: {
            executiveSummary:
                'Beispiel GmbH positioniert sich solide im Versicherungssegment, verliert aber GEO-Sichtbarkeit gegenüber competitor-a.de.\n\nPriorität liegt auf WCAG-Fixes, FAQ-Content für LLM-Zitationen und Ranking-Push bei Kern-Keywords.',
            competitiveLandscape:
                'competitor-a.de führt bei Domain- und GEO-Score. Eigene Stärke: Themenvielfalt und SEO On-Page.',
            findings: [
                {
                    title: 'WCAG-Fehler auf Produktseiten',
                    description: '12 Fehler betreffen primär Bilder und Formularlabels.',
                    severity: 'high',
                    evidenceIds: [EVIDENCE],
                },
            ],
            recommendations: [
                {
                    title: 'Alt-Texte und Kontraste beheben',
                    description: 'Systemische WCAG-Issues in einem Sprint adressieren.',
                    priority: 1,
                    evidenceIds: [EVIDENCE],
                },
                {
                    title: 'GEO-FAQ-Cluster aufbauen',
                    description: 'Top-5 GEO-Fragen mit strukturierten Antworten beantworten.',
                    priority: 2,
                    evidenceIds: [EVIDENCE],
                },
            ],
            riskAmpel: { wcag: 'high', geo: 'medium', rankings: 'medium' },
            sections: {
                geo: {
                    title: 'GEO Agent Analysis',
                    summary: 'LLM-Sichtbarkeit verbessert sich, bleibt aber hinter Wettbewerber A.',
                    keyFindings: [
                        'Share of Voice 28%',
                        '2 Modelle mit regelmäßiger Zitation',
                    ],
                    metricsHighlighted: ['GEO Score'],
                },
            },
            synthesisAvailable: true,
        },
        deep,
        audience: {
            available: true,
            audionProjectId: 'audion-preview',
            audionProjectName: 'Hundehalter Zielgruppe',
            targetGroups: [
                {
                    id: 'tg-1',
                    name: 'Verantwortungsbewusste Hundehalter',
                    segment: 'B2C',
                    description: 'Besitzer großer Rassen, hohe Schadensrisiko-Sensibilität',
                    personaCount: 6,
                },
            ],
            personas: [
                {
                    personaId: 'p-1',
                    personaName: 'Sandra, 38',
                    targetGroupId: 'tg-1',
                    targetGroupName: 'Verantwortungsbewusste Hundehalter',
                    headline: 'Sucht schnelle Klarheit über Deckungssummen',
                    painPoints: ['Unklare Tarifdetails', 'Lange Wartezeiten im Schadenfall'],
                    goals: ['Transparente Preise', 'Schnelle Online-Abwicklung'],
                    pillars: [
                        { pillar: 'wcag', level: 'mixed', score: 68, note: 'Formular nicht vollständig barrierefrei' },
                        { pillar: 'seo', level: 'strong', score: 81, note: 'Gute Auffindbarkeit' },
                        { pillar: 'geo', level: 'mixed', score: 64, note: 'Antworten nicht immer zitiert' },
                        { pillar: 'rankings', level: 'mixed', score: 58, note: 'Kernkeyword außerhalb Top 5' },
                        { pillar: 'performance', level: 'strong', score: 78, note: 'Schnelle Ladezeiten' },
                        { pillar: 'topics', level: 'strong', score: 82, note: 'Passende Themenabdeckung' },
                    ],
                    overallFit: 'mixed',
                    insights: [
                        {
                            id: 'ins-1',
                            kind: 'gap',
                            title: 'Tarifrechner-Reibung',
                            description: 'UX-Journey bricht bei Rassen-Auswahl ab.',
                            evidenceId: EVIDENCE,
                        },
                    ],
                    geoQuestionMatches: [
                        { queryText: geoQuestionDetails[0]!.queryText, latestPosition: 2.1, relevance: 0.92 },
                    ],
                    latestUxJourney: {
                        task: 'Tarif berechnen',
                        success: false,
                        stepsCount: 6,
                        createdAt: '2026-06-01T11:00:00.000Z',
                    },
                    evidenceId: EVIDENCE,
                    evaluationSource: 'agent',
                    personaPerspective: 'Ich will sofort wissen, ob mein Labrador ausreichend abgesichert ist.',
                },
                {
                    personaId: 'p-2',
                    personaName: 'Thomas, 45',
                    targetGroupId: 'tg-1',
                    targetGroupName: 'Verantwortungsbewusste Hundehalter',
                    headline: 'Vergleicht Anbieter und liest Bewertungen',
                    painPoints: ['Zu viel Kleingedrucktes'],
                    goals: ['Schneller Vergleich', 'Klare Leistungsübersicht'],
                    pillars: [
                        { pillar: 'wcag', level: 'strong', score: 84, note: 'Gute Lesbarkeit' },
                        { pillar: 'seo', level: 'mixed', score: 62, note: 'Vergleichskeywords schwach' },
                        { pillar: 'geo', level: 'weak', score: 41, note: 'Kaum in KI-Antworten' },
                        { pillar: 'rankings', level: 'mixed', score: 55, note: 'Mittelfeld' },
                        { pillar: 'performance', level: 'strong', score: 80, note: 'Stabil' },
                        { pillar: 'topics', level: 'mixed', score: 60, note: 'Vergleichsthemen fehlen' },
                    ],
                    overallFit: 'mixed',
                    insights: [
                        {
                            id: 'ins-2',
                            kind: 'gap',
                            title: 'Vergleichsrechner fehlt',
                            description: 'Persona erwartet Side-by-Side-Tarife.',
                            evidenceId: EVIDENCE,
                        },
                    ],
                    geoQuestionMatches: [],
                    latestUxJourney: null,
                    evidenceId: EVIDENCE,
                    evaluationSource: 'agent',
                    personaPerspective: 'Ich möchte zwei Tarife direkt nebeneinander sehen können.',
                },
                previewAudiencePersona(
                    'p-3',
                    'Lea, 29',
                    'Sucht günstige Einstiegs-Tarife',
                    [45, 52, 38, 42, 70, 48],
                    'weak'
                ),
                previewAudiencePersona(
                    'p-4',
                    'Markus, 52',
                    'Priorisiert Service-Hotline und Schadenhistorie',
                    [88, 76, 82, 79, 85, 90],
                    'strong'
                ),
                previewAudiencePersona(
                    'p-5',
                    'Aylin, 33',
                    'Nutzt primär Mobile und Social Proof',
                    [58, 44, 55, 40, 62, 51],
                    'mixed'
                ),
                previewAudiencePersona(
                    'p-6',
                    'Jonas, 41',
                    'Vergleicht nur Haftpflicht-Grundschutz',
                    [72, 68, 30, 65, 74, 58],
                    'mixed'
                ),
            ],
            summaryInsights: [
                'Personas bestätigen Relevanz der Haftpflicht-Themen, kritisieren Formular-UX.',
            ],
        },
        provenance: [{ evidenceId: EVIDENCE, source: 'preview', label: 'Sample data' }],
        freshness: {
            sources: [
                { key: 'domain', label: 'Domain Scan', updatedAt: domain.scannedAt, available: true },
                { key: 'geo', label: 'GEO Run', updatedAt: geo.runCreatedAt, available: true },
            ],
        },
        links: {
            projectPath: '/projects/preview-project',
            domainScanPath: '/results/scan-preview',
            geoRunPath: '/projects/preview-project/geo',
            rankingsPath: '/projects/preview-project/rankings',
        },
    };
}
