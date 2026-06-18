/** Deutsche UI-Texte für Event Quick Check Report (CHECKION PDF/PPTX). */
export const EQC_REPORT_COPY = {
  sectionKpi: 'Kernkennzahlen',
  sectionWorkflow: 'Ablauf',
  sectionDomain: 'Domain & Barrierefreiheit',
  sectionTopIssues: 'Top-Probleme',
  sectionPersona: 'AUDION Persona',
  sectionPersonaTraits: 'Eigenschaften',
  sectionGoals: 'Ziele',
  sectionPainPoints: 'Schmerzpunkte',
  sectionGeoCheck: 'GEO-Wettbewerbsanalyse',
  sectionInsights: 'Erkenntnisse & Empfehlungen',
  fazit: 'Fazit',
  competitors: 'Wettbewerber',
  colIssue: 'Problem',
  colCount: 'Anzahl',
  colName: 'Name',
  colScore: 'Score',
  colShareOfVoice: 'Sichtbarkeitsanteil',
  colPages: 'Seiten',
  geoIncompleteTitle: 'GEO nicht vollständig',
  geoIncomplete: 'GEO unvollständig',
  geoComplete: 'GEO abgeschlossen',
  noDomainScan: 'Kein Domain-Scan verfügbar.',
  noPersona: 'Keine Persona verfügbar.',
  unknownError: 'Unbekannter Fehler',
  noRecommendations: 'Keine Empfehlungen',
  insightPrefix: 'Erkenntnis',
  recommendationPrefix: 'Empfehlung',
  goalPrefix: 'Ziel',
  painPrefix: 'Schmerzpunkt',
  pdfCoverEyebrow: 'Event Quick Check',
  pdfExecutiveLead: 'Kernkennzahlen und Ablauf-Übersicht.',
  pdfDomainSection: 'Domain & Top-Probleme',
  pdfGoalsAndPain: 'Ziele & Schmerzpunkte',
} as const;

export const EQC_SEVERITY_LABELS_DE: Record<string, string> = {
  error: 'Kritisch',
  warning: 'Warnung',
  success: 'Positiv',
  info: 'Hinweis',
  neutral: 'Neutral',
};

export function eqcSeverityLabel(severity: string | undefined): string {
  if (!severity) return EQC_SEVERITY_LABELS_DE.info;
  return EQC_SEVERITY_LABELS_DE[severity] ?? severity;
}
