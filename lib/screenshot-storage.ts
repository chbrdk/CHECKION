/**
 * Store scan screenshots: local disk or S3 (configurable).
 * S3 = shared storage for all instances, no "file missing on other server".
 * Env: SCREENSHOT_STORAGE=local|s3, and for s3: S3_BUCKET, AWS_REGION (+ credentials).
 */

import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
    ENV_SCREENSHOT_AWS_REGION,
    ENV_SCREENSHOT_S3_BUCKET,
    ENV_SCREENSHOT_S3_PREFIX,
    ENV_SCREENSHOT_STORAGE,
    ENV_SCAN_SCREENSHOTS_PATH,
} from '@/lib/constants';

const DEFAULT_DIR = path.join(process.cwd(), 'data', 'screenshots');
const EXT = '.jpg';

const STORAGE = (process.env[ENV_SCREENSHOT_STORAGE] || 'local').toLowerCase();
const S3_BUCKET = process.env[ENV_SCREENSHOT_S3_BUCKET] || process.env.S3_BUCKET;
const S3_PREFIX = (process.env[ENV_SCREENSHOT_S3_PREFIX] || 'screenshots').replace(/\/$/, '');
const AWS_REGION = process.env[ENV_SCREENSHOT_AWS_REGION] || process.env.AWS_REGION || 'eu-central-1';

function getDir(): string {
    const dir = process.env[ENV_SCAN_SCREENSHOTS_PATH] || DEFAULT_DIR;
    return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function getS3Key(scanId: string): string {
    return S3_PREFIX ? `${S3_PREFIX}/${scanId}${EXT}` : `${scanId}${EXT}`;
}

let s3Client: S3Client | null = null;
function getS3(): S3Client {
    if (!s3Client) {
        if (!S3_BUCKET) throw new Error(`${ENV_SCREENSHOT_S3_BUCKET} or S3_BUCKET required when ${ENV_SCREENSHOT_STORAGE}=s3`);
        s3Client = new S3Client({
            region: AWS_REGION,
            ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
                ? {
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    },
                }
                : {}),
        });
    }
    return s3Client;
}

/** Ensure the screenshot directory exists (local only). */
export function ensureScreenshotDir(): void {
    if (STORAGE !== 'local') return;
    const dir = getDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** Path on disk for a scan's screenshot (local only, no check if file exists). */
export function getScreenshotPath(scanId: string): string {
    ensureScreenshotDir();
    return path.join(getDir(), scanId + EXT);
}

/** Write screenshot to storage (local disk or S3). Returns the URL path to store in DB. */
export async function writeScreenshot(scanId: string, buffer: Buffer): Promise<string> {
    if (STORAGE === 's3') {
        const client = getS3();
        await client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET!,
                Key: getS3Key(scanId),
                Body: buffer,
                ContentType: 'image/jpeg',
            })
        );
        return `/api/scan/${scanId}/screenshot`;
    }
    const filePath = getScreenshotPath(scanId);
    fs.writeFileSync(filePath, buffer, 'binary');
    return `/api/scan/${scanId}/screenshot`;
}

/** Read screenshot from storage. Returns buffer or null if not found. */
export async function readScreenshot(scanId: string): Promise<Buffer | null> {
    if (STORAGE === 's3') {
        try {
            const client = getS3();
            const out = await client.send(
                new GetObjectCommand({
                    Bucket: S3_BUCKET!,
                    Key: getS3Key(scanId),
                })
            );
            if (!out.Body) return null;
            const chunks: Uint8Array[] = [];
            for await (const chunk of out.Body as AsyncIterable<Uint8Array>) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch {
            return null;
        }
    }
    const filePath = path.join(getDir(), scanId + EXT);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
}

/** Whether the scan result uses file-based screenshot (URL) vs inline base64. */
export function isFileScreenshot(screenshot: string): boolean {
    return typeof screenshot === 'string' && screenshot.startsWith('/api/scan/') && screenshot.endsWith('/screenshot');
}

/** Get screenshot as base64 for APIs that expect it (e.g. saliency). */
export async function getScreenshotBase64(screenshot: string | undefined, scanId: string): Promise<string | null> {
    if (!screenshot) return null;
    if (screenshot.startsWith('data:')) {
        const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
        return base64 || null;
    }
    if (isFileScreenshot(screenshot)) {
        const buffer = await readScreenshot(scanId);
        return buffer ? buffer.toString('base64') : null;
    }
    return null;
}
