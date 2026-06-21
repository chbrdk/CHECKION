/** Event Quick Check report model (mirrors PLEXON event-quick-check-report-types). */
export const EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE = 'event_quick_check_report' as const;

export type EventQuickCheckReportGeoEeatDimension = {
  key: string;
  label: string;
  score: number;
  reasoning?: string;
};

export type EventQuickCheckReportCitationModelSlice = {
  modelId: string;
  modelLabel: string;
  citations: Array<{ query: string; domain: string; position: number }>;
};

export type EventQuickCheckReportModel = {
  templateId: string;
  meta: {
    title: string;
    url: string;
    domain: string;
    projectName: string;
    platformProjectId?: string;
    generatedAt: string;
    playbookLabel: string;
    checkionOnly?: boolean;
  };
  executive: {
    summary?: string;
    fazit?: string;
    fazitTone?: string;
    kpiTiles: Array<{ label: string; value: string | number; unit?: string }>;
  };
  workflow: {
    steps: Array<{ id: string; label: string; status: string; detail: string }>;
  };
  domain?: {
    scanId: string;
    domain: string;
    url: string;
    status: string;
    score: number;
    totalPages: number;
    stats: { errors: number; warnings: number; notices: number; total: number };
    topIssues: Array<{ title: string; count: number }>;
    checkionHref: string;
  };
  persona?: {
    id: string;
    name: string;
    segment: string;
    confidence: number;
    headline: string;
    bio?: string;
    traits: Array<{ name: string; displayName: string; score: number }>;
    goals: string[];
    painPoints: string[];
    interests: string[];
  };
  market?: {
    status: 'complete' | 'failed' | 'skipped' | 'partial';
    errorMessage?: string;
    query?: string;
    threadId?: string;
    runId?: string;
    executiveSummary?: string;
    keyFindings?: string[];
    implications?: string;
    echonHref?: string;
  };
  geo: {
    status: string;
    errorMessage?: string;
    questions: string[];
    overallScore?: number | null;
    geoFitnessScore?: number | null;
    competitors: Array<{ name: string; score?: number | null; shareOfVoice?: number | null }>;
    eeatDimensions?: EventQuickCheckReportGeoEeatDimension[];
    recommendations?: Array<{ title: string; description: string; priority?: number }>;
    citationHighlights?: Array<{ query: string; domain: string; position: number }>;
    citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[];
  };
  insights?: {
    findings: Array<{ title: string; description: string; severity?: string }>;
    recommendations: Array<{ title: string; description: string; priority?: number; category?: string }>;
  };
  appendix: {
    scanId?: string;
    geoJobId?: string;
    platformProjectId?: string;
    stepTable: { columns: string[]; rows: Array<[string, string, string]> };
    links: Array<{ label: string; href: string; external?: boolean }>;
  };
};

export function parseEventQuickCheckReportModel(raw: unknown): EventQuickCheckReportModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as EventQuickCheckReportModel;
  if (r.templateId !== 'event_quick_check' || !r.meta?.title) return null;
  return r;
}
