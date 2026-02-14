
import fs from 'fs';

async function check() {
    try {
        const res = await fetch('http://localhost:3333/api/scans');
        const json = await res.json();

        if (!json.success || !json.data || json.data.length === 0) {
            console.log('No scans found.');
            return;
        }

        const latestId = json.data[0].id;
        console.log(`Checking scan ${latestId}...`);

        const detailRes = await fetch(`http://localhost:3333/api/scan/${latestId}`);
        const detail = await detailRes.json();

        if (detail.ux && detail.ux.focusOrder) {
            console.log(`Found ${detail.ux.focusOrder.length} focus items.`);
            console.log('Sample:', detail.ux.focusOrder.slice(0, 3));
        } else {
            console.log('NO FOCUS ORDER DATA FOUND!');
            console.log('UX Object keys:', detail.ux ? Object.keys(detail.ux) : 'UX is missing');
        }

    } catch (e) {
        console.error(e);
    }
}

check();
