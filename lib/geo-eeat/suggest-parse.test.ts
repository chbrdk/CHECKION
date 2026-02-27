/**
 * Unit tests for suggest-parse (extractHostname, parseSuggestResponse).
 * Run: npx tsx lib/geo-eeat/suggest-parse.test.ts
 */
import assert from 'node:assert';
import { extractHostname, parseSuggestResponse } from './suggest-parse';

function run(): void {
    // extractHostname
    assert.strictEqual(extractHostname('https://www.example.com/path'), 'example.com');
    assert.strictEqual(extractHostname('https://example.com'), 'example.com');
    assert.strictEqual(extractHostname('example.de'), 'example.de');
    assert.strictEqual(extractHostname('https://sub.domain.co.uk'), 'sub.domain.co.uk');
    assert.strictEqual(extractHostname('  https://sub.domain.co.uk  '), 'sub.domain.co.uk');

    // parseSuggestResponse – valid JSON
    const valid = parseSuggestResponse('{"competitors":["a.com","b.com"],"queries":["q1","q2"]}');
    assert.deepStrictEqual(valid.competitors, ['a.com', 'b.com']);
    assert.deepStrictEqual(valid.queries, ['q1', 'q2']);

    // parseSuggestResponse – wrapped in text
    const wrapped = parseSuggestResponse('Here is the result:\n{"competitors":["x.com"],"queries":["query one"]}\nDone.');
    assert.deepStrictEqual(wrapped.competitors, ['x.com']);
    assert.deepStrictEqual(wrapped.queries, ['query one']);

    // parseSuggestResponse – limits and filters
    const many = parseSuggestResponse(
        JSON.stringify({
            competitors: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'],
            queries: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16'],
        })
    );
    assert.strictEqual(many.competitors.length, 10);
    assert.strictEqual(many.queries.length, 15);
    assert.strictEqual(many.competitors[9], 'c10');
    assert.strictEqual(many.queries[14], 'q15');

    // parseSuggestResponse – non-strings filtered out
    const mixed = parseSuggestResponse(
        JSON.stringify({ competitors: ['ok', 1, null, 'yes'], queries: ['q', true, 'q2'] })
    );
    assert.deepStrictEqual(mixed.competitors, ['ok', 'yes']);
    assert.deepStrictEqual(mixed.queries, ['q', 'q2']);

    console.log('suggest-parse.test.ts: all assertions passed');
}

run();
