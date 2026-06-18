import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    getReportPptxMasterAbsolutePath,
    getReportPptxZoneCalibrationAbsolutePath,
    REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH,
} from '@/lib/paths/report-export-templates';
import { extractMsqdxPptZonesFromPptx } from '@/lib/project-report/pptx/extract-msqdx-ppt-zones';
import { loadMsqdxPptZoneCalibration } from '@/lib/project-report/pptx/load-msqdx-ppt-zone-calibration';

const CHECKION_ROOT = path.resolve(__dirname, '../..');

describe('msqdx-ppt-zone-calibration', () => {
    it('ships calibration JSON next to the PPT master', () => {
        const calibrationPath = path.join(CHECKION_ROOT, REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH);
        expect(fs.existsSync(calibrationPath)).toBe(true);
        const parsed = loadMsqdxPptZoneCalibration(CHECKION_ROOT);
        expect(parsed.layouts.CONTENT.body.y).toBe(2.023);
        expect(parsed.layouts.CONTENT.footer.y).toBe(7.264);
    });

    it('matches live extraction from MSQDX master', () => {
        const masterPath = getReportPptxMasterAbsolutePath(CHECKION_ROOT);
        if (!fs.existsSync(masterPath)) return;

        const extracted = extractMsqdxPptZonesFromPptx(masterPath);
        const committed = JSON.parse(
            fs.readFileSync(getReportPptxZoneCalibrationAbsolutePath(CHECKION_ROOT), 'utf8')
        );

        expect(extracted.slideSize).toEqual(committed.slideSize);
        expect(extracted.layouts.CONTENT).toEqual(committed.layouts.CONTENT);
        expect(extracted.layouts.TWO_COLUMN.column).toEqual(committed.layouts.TWO_COLUMN.column);
    });
});
