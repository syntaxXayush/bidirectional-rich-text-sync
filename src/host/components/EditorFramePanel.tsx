import { useEffect, useRef } from 'react';
import type { FrameId } from '../../shared/types';

interface EditorFramePanelProps {
  frameId: FrameId;
  label: string;
  src: string;
  onIframeRef: (frameId: FrameId, element: HTMLIFrameElement | null) => void;
}

export function EditorFramePanel({
  frameId,
  label,
  src,
  onIframeRef,
}: EditorFramePanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    onIframeRef(frameId, iframeRef.current);
    return () => onIframeRef(frameId, null);
  }, [frameId, onIframeRef]);

  return (
    <iframe
      ref={iframeRef}
      className="panel grain rounded-2xl overflow-hidden fade-up w-full border-0 bg-transparent block"
      style={{
        height: 'calc(100vh - 252px)',
        minHeight: '320px',
        colorScheme: 'light dark',
      }}
      title={`${label} rich text editor`}
      src={src}
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}
