'use client';

import React from 'react';
import { MsqdxTooltip, MsqdxButton, MsqdxIcon } from '@msqdx/react';

export interface InfoTooltipProps {
  /** Tooltip text (use t('info.xxx') for i18n). */
  title: string;
  /** Placement of tooltip. @default 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Accessible label for the icon button. */
  ariaLabel?: string;
}

/**
 * Small info icon button that shows an explanation in a tooltip on hover/focus.
 * Use next to section titles or labels to help users understand the context.
 */
export function InfoTooltip({ title, placement = 'top', ariaLabel = 'Information' }: InfoTooltipProps) {
  return (
    <MsqdxTooltip title={title} placement={placement} arrow brandColor="purple">
      <span>
        <MsqdxButton
          variant="text"
          size="small"
          aria-label={ariaLabel}
          sx={{
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            color: 'var(--color-text-muted-on-light)',
            '&:hover': { color: 'var(--color-theme-accent, var(--color-secondary-dx-purple))' },
          }}
        >
          <MsqdxIcon name="Info" size="sm" />
        </MsqdxButton>
      </span>
    </MsqdxTooltip>
  );
}
