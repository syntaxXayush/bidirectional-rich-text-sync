import React from 'react';
import type { FormatAction, FormatState } from '../../shared/types';
import { Bold, Italic, Strikethrough } from 'lucide-react';

interface ToolbarProps {
  formatState: FormatState;
  onFormat: (action: FormatAction) => void;
}

const TOOLBAR_ITEMS: ReadonlyArray<{
  action: FormatAction;
  label: string;
  icon: React.ElementType;
}> = [
  { action: 'bold', label: 'Bold', icon: Bold },
  { action: 'italic', label: 'Italic', icon: Italic },
  { action: 'strikeThrough', label: 'Strikethrough', icon: Strikethrough },
];

export function Toolbar({ formatState, onFormat }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2.5" role="toolbar" aria-label="Text formatting">
      {TOOLBAR_ITEMS.map(({ action, label, icon: Icon }) => {
        const isActive = formatState[action];
        return (
          <button
            key={action}
            type="button"
            className="fmt-btn"
            data-active={isActive ? "true" : "false"}
            aria-pressed={isActive}
            title={label}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onFormat(action)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
