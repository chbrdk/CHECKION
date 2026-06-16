/**
 * Minimal UiLayout contract shared with PLEXON assistant reports (JSON over HTTP).
 */
export type PlexonUiTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export type PlexonUiBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type PlexonUiLayout = {
  version: number;
  blocks: PlexonUiBlock[];
};

export type PlexonAssistantReportPayload = {
  title: string;
  locale?: 'de' | 'en';
  uiLayout: PlexonUiLayout;
};
