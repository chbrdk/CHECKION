import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PlexonAssistantReportDocument } from '@/components/pdf/PlexonAssistantReportDocument';
import type { PlexonAssistantReportPayload } from '@/lib/integrations/plexon/assistant-report-types';

export async function renderPlexonAssistantReportPdf(
  payload: PlexonAssistantReportPayload
): Promise<Buffer> {
  const buffer = await renderToBuffer(<PlexonAssistantReportDocument payload={payload} />);
  return Buffer.from(buffer);
}
