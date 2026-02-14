// Using native fetch


async function verify() {
    try {
        console.log('Starting scan of example.com...');
        const res = await fetch('http://localhost:3333/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        if (!res.ok) {
            console.error('Scan failed:', res.status, res.statusText);
            const txt = await res.text();
            console.error(txt);
            return;
        }

        const response: any = await res.json();
        const data = response.data;
        console.log('--- SEO Data ---');
        console.log(JSON.stringify(data.seo, null, 2));
        console.log('--- Link Data ---');
        console.log(JSON.stringify(data.links, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
verify();
