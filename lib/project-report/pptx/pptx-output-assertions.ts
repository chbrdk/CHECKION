/**
 * Test helpers for rendered PPTX output.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOREM_PATTERN = /Lorem ipsum|consetetur sadipscing/i;

export function readActivePresentationSlideXml(buffer: Buffer): string[] {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkion-pptx-assert-'));
    const archivePath = path.join(dir, 'deck.pptx');
    const extractDir = path.join(dir, 'extracted');

    try {
        fs.writeFileSync(archivePath, buffer);
        execSync(`unzip -q ${JSON.stringify(archivePath)} -d ${JSON.stringify(extractDir)}`);

        const pres = fs.readFileSync(path.join(extractDir, 'ppt/presentation.xml'), 'utf8');
        const rels = fs.readFileSync(path.join(extractDir, 'ppt/_rels/presentation.xml.rels'), 'utf8');
        const relMap = new Map<string, string>();
        for (const match of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
            relMap.set(match[1]!, match[2]!);
        }

        const slideRids = [...pres.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map((m) => m[1]!);
        return slideRids.map((rid) => {
            const target = relMap.get(rid) ?? '';
            const fileName = target.split('/').pop() ?? target;
            return fs.readFileSync(path.join(extractDir, 'ppt/slides', fileName), 'utf8');
        });
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export function assertNoTemplateLoremInActiveSlides(buffer: Buffer): void {
    const slideXmls = readActivePresentationSlideXml(buffer);
    const offenders = slideXmls.filter((xml) => LOREM_PATTERN.test(xml));
    if (offenders.length > 0) {
        throw new Error(`Found MSQDX template placeholder text on ${offenders.length} slide(s)`);
    }
}
