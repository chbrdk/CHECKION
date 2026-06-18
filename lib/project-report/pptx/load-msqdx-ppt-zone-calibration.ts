/**
 * Load MSQDX placeholder zone calibration (measured from master PPTX).
 */
import fs from 'node:fs';
import {
    REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH,
    getReportPptxZoneCalibrationAbsolutePath,
} from '@/lib/paths/report-export-templates';
import type { MsqdxPptZoneCalibrationFile, PptxLayoutZoneCalibration } from '@/lib/project-report/pptx/extract-msqdx-ppt-zones';

let cached: MsqdxPptZoneCalibrationFile | null = null;

export function loadMsqdxPptZoneCalibration(cwd = process.cwd()): MsqdxPptZoneCalibrationFile {
    if (cached) return cached;
    const filePath = getReportPptxZoneCalibrationAbsolutePath(cwd);
    const raw = fs.readFileSync(filePath, 'utf8');
    cached = JSON.parse(raw) as MsqdxPptZoneCalibrationFile;
    return cached;
}

export function getMsqdxContentZoneCalibration(cwd = process.cwd()): PptxLayoutZoneCalibration {
    return loadMsqdxPptZoneCalibration(cwd).layouts.CONTENT;
}

export function getMsqdxColumnZoneCalibration(cwd = process.cwd()): PptxLayoutZoneCalibration['column'] {
    return loadMsqdxPptZoneCalibration(cwd).layouts.TWO_COLUMN.column;
}

export const MSQDX_ZONE_CALIBRATION_PATH = REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH;
