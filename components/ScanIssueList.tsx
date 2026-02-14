import React, { memo, useMemo } from 'react';
import { MsqdxAccordion } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { ScanIssueItem } from './ScanIssueItem';
import type { Issue } from '@/lib/types';

interface ScanIssueListProps {
    issues: Issue[];
    highlightedIndex: number | null;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

export const ScanIssueList = memo(({ issues, highlightedIndex, registerRef }: ScanIssueListProps) => {
    // Memoizing sx to prevent MsqdxAccordion from re-rendering due to new object reference
    const accordionSx = useMemo(() => ({
        display: 'flex',
        flexDirection: 'column',
        gap: `${MSQDX_SPACING.scale.sm}px`,
        background: 'transparent',
        border: 'none'
    }), []);

    return (
        <MsqdxAccordion
            allowMultiple
            size="small"
            borderRadius="md"
            // @ts-ignore - sx type definition might be strict in library but accepts object
            sx={accordionSx}
        >
            {issues.map((issue, idx) => (
                <ScanIssueItem
                    key={`issue-${idx}`}
                    issue={issue}
                    index={idx}
                    isHighlighted={highlightedIndex === idx}
                    registerRef={registerRef}
                />
            ))}
        </MsqdxAccordion>
    );
});
