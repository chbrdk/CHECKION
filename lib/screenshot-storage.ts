/**
 * Store scan screenshots as files on disk instead of base64 in the DB.
 * Reduces payload size and avoids "Invalid string length" for large domain scans.
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_DIR = path.join(process.cwd(), 'data', 'screenshots');
const EXT = '.jpg';

function getDir(): string {
    const dir = process.env.SCAN_SCREENSHOTS_PATH || DEFAULT_DIR;
    return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

/** Ensure the screenshot directory exists (call before write). */
export function ensureScreenshotDir(): void {
    const dir = getDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** Path on disk for a scan's screenshot (no check if file exists). */
export function getScreenshotPath(scanId: string): string {
    ensureScreenshotDir();
    return path.join(getDir(), scanId + EXT);
}

/** Write screenshot buffer to disk. Returns the URL path to store in DB. */
export function writeScreenshot(scanId: string, buffer: Buffer): string {
    const filePath = getScreenshotPath(scanId);
    fs.writeFileSync(filePath, buffer, 'binary');
    return `/api/scan/${scanId}/screenshot`;
}

/** Read screenshot from disk. Returns buffer or null if not found. */
export function readScreenshot(scanId: string): Buffer | null {
    const filePath = path.join(getDir(), scanId + EXT);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
}

/** Whether the scan result uses file-based screenshot (URL) vs inline base64. */
export function isFileScreenshot(screenshot: string): boolean {
    return typeof screenshot === 'string' && screenshot.startsWith('/api/scan/') && screenshot.endsWith('/screenshot');
}

/** Get screenshot as base64 string for APIs that expect it (e.g. saliency). From DB result: data URL, or read file and return base64. */
export function getScreenshotBase64(screenshot: string | undefined, scanId: string): string | null {
    if (!screenshot) return null;
    if (screenshot.startsWith('data:')) {
        const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
        return base64 || null;
    }
    if (isFileScreenshot(screenshot)) {
        const buffer = readScreenshot(scanId);
        return buffer ? buffer.toString('base64') : null;
    }
    return null;
}
