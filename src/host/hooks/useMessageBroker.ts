import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorToHostMessage, EventLogEntry, FrameId } from '../../shared/types';
import {
  buildApplySyncMessage,
  createSyncId,
  createTimestamp,
  getPeerFrameId,
  isEditorToHostMessage,
  summarizeMessage,
} from '../../shared/protocol';
import { isTrustedOrigin } from '../../shared/originValidation';
import { loadEventLog, saveEventLog } from '../../shared/persistence';

interface UseMessageBrokerOptions {
  onSyncRelayed?: (syncId: string) => void;
}

interface UseMessageBrokerResult {
  eventLog: EventLogEntry[];
  readyFrames: Set<FrameId>;
  relayCount: number;
  clearLog: () => void;
  registerIframe: (frameId: FrameId, element: HTMLIFrameElement | null) => void;
}

const MAX_LOG_ENTRIES = 200;

/**
 * Host-side message broker: validates, logs, and relays editor messages.
 * The host never mutates editor DOM — it only routes postMessage traffic.
 */
export function useMessageBroker(
  options: UseMessageBrokerOptions = {},
): UseMessageBrokerResult {
  const iframeRefs = useRef<Map<FrameId, HTMLIFrameElement>>(new Map());
  const processedSyncIdsRef = useRef<Set<string>>(new Set());
  const onSyncRelayedRef = useRef(options.onSyncRelayed);
  onSyncRelayedRef.current = options.onSyncRelayed;

  const [eventLog, setEventLog] = useState<EventLogEntry[]>(() => loadEventLog() ?? []);
  const [readyFrames, setReadyFrames] = useState<Set<FrameId>>(new Set());
  const [relayCount, setRelayCount] = useState(0);

  const appendLog = useCallback(
    (entry: Omit<EventLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => {
      setEventLog((previous) => {
        const next: EventLogEntry[] = [
          ...previous,
          {
            ...entry,
            id: createSyncId(),
            timestamp: entry.timestamp ?? createTimestamp(),
          },
        ];
        const capped = next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
        saveEventLog(capped);
        return capped;
      });
    },
    [],
  );

  const registerIframe = useCallback(
    (frameId: FrameId, element: HTMLIFrameElement | null) => {
      if (element) {
        iframeRefs.current.set(frameId, element);
      } else {
        iframeRefs.current.delete(frameId);
      }
    },
    [],
  );

  const relayToPeer = useCallback(
    (sourceFrameId: FrameId, message: EditorToHostMessage) => {
      const peerFrameId = getPeerFrameId(sourceFrameId);
      const peerIframe = iframeRefs.current.get(peerFrameId);

      if (!peerIframe?.contentWindow) {
        appendLog({
          direction: 'relay',
          frameId: 'host',
          targetFrameId: peerFrameId,
          type: message.type,
          syncId: message.syncId,
          summary: `Relay skipped — ${peerFrameId} not ready`,
        });
        return;
      }

      // Dedupe: prevent relay storms if duplicate messages arrive.
      if (processedSyncIdsRef.current.has(message.syncId)) {
        return;
      }
      processedSyncIdsRef.current.add(message.syncId);
      if (processedSyncIdsRef.current.size > 500) {
        processedSyncIdsRef.current.clear();
      }

      const html =
        message.type === 'FORMAT_SYNC' ||
        message.type === 'CONTENT_SYNC' ||
        message.type === 'UNDO_SYNC' ||
        message.type === 'REDO_SYNC'
          ? message.html
          : '';

      const selection =
        message.type === 'FORMAT_SYNC' &&
        typeof message.selectionStart === 'number' &&
        typeof message.selectionEnd === 'number'
          ? { start: message.selectionStart, end: message.selectionEnd }
          : undefined;

      const applyMessage = buildApplySyncMessage(
        sourceFrameId,
        html,
        message.syncId,
        message.type === 'FORMAT_SYNC' ? message.action : undefined,
        selection,
      );

      peerIframe.contentWindow.postMessage(applyMessage, window.location.origin);

      setRelayCount((count) => count + 1);
      onSyncRelayedRef.current?.(message.syncId);

      appendLog({
        direction: 'relay',
        frameId: sourceFrameId,
        targetFrameId: peerFrameId,
        type: message.type,
        syncId: message.syncId,
        summary: summarizeMessage(message),
      });
    },
    [appendLog],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOrigin(event.origin)) {
        return;
      }

      if (!isEditorToHostMessage(event.data)) {
        return;
      }

      const message = event.data;

      appendLog({
        direction: 'inbound',
        frameId: message.frameId,
        type: message.type,
        syncId: message.syncId,
        summary: summarizeMessage(message),
      });

      if (message.type === 'EDITOR_READY') {
        setReadyFrames((previous) => new Set(previous).add(message.frameId));
        return;
      }

      if (
        message.type === 'FORMAT_SYNC' ||
        message.type === 'CONTENT_SYNC' ||
        message.type === 'UNDO_SYNC' ||
        message.type === 'REDO_SYNC'
      ) {
        relayToPeer(message.frameId, message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appendLog, relayToPeer]);

  const clearLog = useCallback(() => {
    setEventLog([]);
    saveEventLog([]);
  }, []);

  return {
    eventLog,
    readyFrames,
    relayCount,
    clearLog,
    registerIframe,
  };
}
