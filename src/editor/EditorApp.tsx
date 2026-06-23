import { useMemo } from 'react';
import type { FrameId } from '../shared/types';
import { RichTextEditor } from './components/RichTextEditor';
import { useTheme } from '../shared/theme';

function parseFrameId(search: string): FrameId {
  const params = new URLSearchParams(search);
  const frameId = params.get('frameId');
  if (frameId === 'frame-a' || frameId === 'frame-b') {
    return frameId;
  }
  return 'frame-a';
}

function parseLabel(search: string, frameId: FrameId): string {
  const params = new URLSearchParams(search);
  return params.get('label') ?? (frameId === 'frame-a' ? 'Frame A' : 'Frame B');
}

export function EditorApp() {
  useTheme(); // Initializes theme listener and applies dark class to <html>
  
  const frameId = useMemo(
    () => parseFrameId(window.location.search),
    [],
  );
  const label = useMemo(
    () => parseLabel(window.location.search, frameId),
    [frameId],
  );

  return (
    <div className="h-full w-full bg-transparent p-0 m-0">
      <RichTextEditor frameId={frameId} label={label} />
    </div>
  );
}
