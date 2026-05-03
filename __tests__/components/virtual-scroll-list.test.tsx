import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VirtualScrollList } from '@/components/VirtualScrollList';

describe('VirtualScrollList', () => {
    it('emits every list item in markup when virtualize is false', () => {
        const html = renderToStaticMarkup(
            <VirtualScrollList
                items={['a', 'b', 'c']}
                maxHeight={200}
                virtualize={false}
                getItemKey={(x) => x}
                renderItem={(x) => <span data-testid={`row-${x}`}>{x}</span>}
            />
        );
        expect(html).toContain('row-a');
        expect(html).toContain('row-b');
        expect(html).toContain('row-c');
    });
});
