/**
 * Unit tests for domain-graph-data (transform and filter).
 * Run: npx tsx lib/domain-graph-data.test.ts
 */
import assert from 'node:assert';
import {
    normalizeGraphId,
    pathDepthFromUrl,
    domainGraphToForceData,
    filterForceGraphData,
    type DomainGraph,
} from './domain-graph-data';

function run(): void {
    // normalizeGraphId
    assert.strictEqual(normalizeGraphId('https://example.com/'), 'https://example.com/');
    assert.strictEqual(normalizeGraphId('https://example.com'), 'https://example.com/');
    assert.strictEqual(normalizeGraphId('https://example.com/foo/'), 'https://example.com/foo');
    assert.strictEqual(normalizeGraphId('https://example.com/foo'), 'https://example.com/foo');

    // pathDepthFromUrl
    assert.strictEqual(pathDepthFromUrl('https://example.com/'), 0);
    assert.strictEqual(pathDepthFromUrl('https://example.com/foo'), 1);
    assert.strictEqual(pathDepthFromUrl('https://example.com/a/b'), 2);

    // domainGraphToForceData empty
    assert.deepStrictEqual(domainGraphToForceData(null), { nodes: [], links: [] });
    assert.deepStrictEqual(domainGraphToForceData(undefined), { nodes: [], links: [] });
    assert.deepStrictEqual(domainGraphToForceData({ nodes: [], links: [] }), { nodes: [], links: [] });

    // domainGraphToForceData with nodes and links
    const graph: DomainGraph = {
        nodes: [
            { id: 'https://example.com/', url: 'https://example.com/', score: 90, depth: 0, status: 'ok', title: 'Home' },
            { id: 'https://example.com/about', url: 'https://example.com/about', score: 85, depth: 1, status: 'ok', title: 'About' },
            { id: 'https://example.com/contact', url: 'https://example.com/contact', score: 40, depth: 1, status: 'error' },
        ],
        links: [
            { source: 'https://example.com/', target: 'https://example.com/about' },
            { source: 'https://example.com/', target: 'https://example.com/contact' },
            { source: 'https://example.com/about', target: 'https://example.com/contact' },
            { source: 'https://example.com/other', target: 'https://example.com/about' }, // other not in nodes -> dropped
        ],
    };
    const out = domainGraphToForceData(graph);
    assert.strictEqual(out.nodes.length, 3);
    assert.strictEqual(out.links.length, 3); // link from 'other' dropped
    assert.strictEqual(out.nodes[0].id, 'https://example.com/');
    assert.strictEqual(out.nodes[0].url, 'https://example.com/');
    assert.strictEqual(out.nodes[0].score, 90);
    assert.strictEqual(out.nodes[0].depth, 0);
    assert.strictEqual(out.nodes[0].val, 6);
    assert.ok(out.links.some((l) => l.source === 'https://example.com/' && l.target === 'https://example.com/about'));

    // Normalization: trailing slash in link target
    const graph2: DomainGraph = {
        nodes: [
            { id: 'https://example.com/', url: 'https://example.com/', score: 80, depth: 0, status: 'ok' },
            { id: 'https://example.com/foo', url: 'https://example.com/foo', score: 70, depth: 1, status: 'ok' },
        ],
        links: [{ source: 'https://example.com/', target: 'https://example.com/foo/' }],
    };
    const out2 = domainGraphToForceData(graph2);
    assert.strictEqual(out2.links.length, 1);
    assert.strictEqual(out2.links[0].target, 'https://example.com/foo');

    // filterForceGraphData: no filter returns same
    const data = { nodes: out.nodes, links: out.links };
    assert.deepStrictEqual(filterForceGraphData(data, {}), data);

    // filterForceGraphData: scoreMin
    const filteredScore = filterForceGraphData(data, { scoreMin: 85 });
    assert.strictEqual(filteredScore.nodes.length, 2);
    assert.ok(filteredScore.nodes.every((n) => n.score >= 85));
    assert.strictEqual(filteredScore.links.length, 1); // only link between the two kept nodes

    // filterForceGraphData: search
    const filteredSearch = filterForceGraphData(data, { search: 'about' });
    assert.strictEqual(filteredSearch.nodes.length, 1);
    assert.strictEqual(filteredSearch.nodes[0].url, 'https://example.com/about');
    assert.strictEqual(filteredSearch.links.length, 0);

    const filteredSearchTitle = filterForceGraphData(data, { search: 'Home' });
    assert.strictEqual(filteredSearchTitle.nodes.length, 1);
    assert.strictEqual(filteredSearchTitle.nodes[0].title, 'Home');

    // filterForceGraphData: status
    const filteredStatus = filterForceGraphData(data, { status: 'error' });
    assert.strictEqual(filteredStatus.nodes.length, 1);
    assert.strictEqual(filteredStatus.nodes[0].status, 'error');

    // filterForceGraphData: depthMax
    const filteredDepth = filterForceGraphData(data, { depthMax: 0 });
    assert.strictEqual(filteredDepth.nodes.length, 1);
    assert.strictEqual(filteredDepth.nodes[0].depth, 0);

    console.log('All domain-graph-data tests passed.');
}

run();
