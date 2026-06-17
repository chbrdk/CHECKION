import { describe, expect, it } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  PPTX_LAYOUT,
  PPTX_MSQDX_MASTER_LAYOUT,
  PPTX_PLACEHOLDER,
  REPORT_PPTX_MASTER_RELATIVE_PATH,
  getReportPptxMasterAbsolutePath,
  getReportPptxLogoWhiteAbsolutePath,
} from '@/lib/paths/report-export-templates';
import { buildProjectReportPptxPlan } from '@/lib/project-report/pptx/build-pptx-plan';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { renderProjectReportPptx } from '@/lib/project-report/pptx/render-pptx';
import { PPTX_MAX_SLIDES } from '@/lib/project-report/pptx/types';

const CHECKION_ROOT = path.resolve(__dirname, '../..');

describe('report-export-templates paths', () => {
  it('exposes stable layout and placeholder names', () => {
    expect(PPTX_LAYOUT.TITLE).toBe('MSQDX_TITLE');
    expect(PPTX_PLACEHOLDER.BODY).toBe('BODY');
    expect(PPTX_MSQDX_MASTER_LAYOUT.TITLE).toBe('Hero 2 (BK)');
  });

  it('resolves master path from repo-relative default', () => {
    const resolved = getReportPptxMasterAbsolutePath('/app/checkion');
    expect(resolved).toBe(path.join('/app/checkion', REPORT_PPTX_MASTER_RELATIVE_PATH));
  });

  it('prefers CHECKION_REPORT_PPTX_MASTER_PATH env', () => {
    const prev = process.env.CHECKION_REPORT_PPTX_MASTER_PATH;
    process.env.CHECKION_REPORT_PPTX_MASTER_PATH = '/custom/master.pptx';
    try {
      expect(getReportPptxMasterAbsolutePath()).toBe('/custom/master.pptx');
    } finally {
      if (prev === undefined) delete process.env.CHECKION_REPORT_PPTX_MASTER_PATH;
      else process.env.CHECKION_REPORT_PPTX_MASTER_PATH = prev;
    }
  });

  it('points at shipped master and logo assets in repo', () => {
    const master = getReportPptxMasterAbsolutePath(CHECKION_ROOT);
    const logo = getReportPptxLogoWhiteAbsolutePath(CHECKION_ROOT);
    expect(fs.existsSync(master)).toBe(true);
    expect(fs.existsSync(logo)).toBe(true);
  });
});

describe('buildProjectReportPptxPlan', () => {
  it('builds a bounded slide deck from preview bundle', () => {
    const bundle = buildComprehensivePreviewBundle();
    const plan = buildProjectReportPptxPlan(bundle);

    expect(plan.slides.length).toBeGreaterThan(3);
    expect(plan.slides.length).toBeLessThanOrEqual(PPTX_MAX_SLIDES);
    expect(plan.slides[0]?.kind).toBe('cover');
    expect(plan.slides.some((s) => s.kind === 'closing')).toBe(true);
  });
});

describe('renderProjectReportPptx', () => {
  it('renders a non-empty PPTX buffer', async () => {
    const plan = buildProjectReportPptxPlan(buildComprehensivePreviewBundle());
    const buffer = await renderProjectReportPptx(plan, CHECKION_ROOT);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(10_000);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('renders without logo assets when paths are missing', async () => {
    const plan = buildProjectReportPptxPlan(buildComprehensivePreviewBundle());
    const buffer = await renderProjectReportPptx(plan, '/tmp/missing-checkion-assets');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(5_000);
  });
});
