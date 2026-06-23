import type {
  ApplySyncMessage,
  EditorToHostMessage,
  FormatAction,
  FrameId,
  SyncMessage,
} from './types';

/** Allowed origins for postMessage validation (same-origin in dev/prod). */
export const TRUSTED_ORIGINS: readonly string[] = [
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
];

export const FRAME_IDS: readonly FrameId[] = ['frame-a', 'frame-b'];

export const FORMAT_ACTIONS: readonly FormatAction[] = [
  'bold',
  'italic',
  'strikeThrough',
];

export const DEFAULT_EDITOR_HTML =
  '<p>The quick brown fox jumps over the lazy dog.</p>';

export const DEFAULT_FRAME_A_HTML =
  '<p>Quick brown fox jumps <em>over the lazy dog.</em></p><p>This frame relays edits to Frame B via the host.</p>';

export const DEFAULT_FRAME_B_HTML =
  '<p>Frame B mirrors changes <strike>almost</strike> immediately.</p><p>Try toggling Bold, Italic, or Strike.</p>';

export function getDefaultEditorHtml(frameId: FrameId): string {
  if (frameId === 'frame-a') {
    return DEFAULT_FRAME_A_HTML;
  }
  if (frameId === 'frame-b') {
    return DEFAULT_FRAME_B_HTML;
  }
  return DEFAULT_EDITOR_HTML;
}

export const CONTENT_SYNC_DEBOUNCE_MS = 120;

export const SYNC_FLASH_DURATION_MS = 650;

/** Creates a unique sync id for loop prevention and log correlation. */
export function createSyncId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isFormatAction(value: unknown): value is FormatAction {
  return (
    value === 'bold' || value === 'italic' || value === 'strikeThrough'
  );
}

export function isFrameId(value: unknown): value is FrameId {
  return value === 'frame-a' || value === 'frame-b';
}

export function isEditorToHostMessage(value: unknown): value is EditorToHostMessage {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (typeof value.syncId !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'EDITOR_READY':
      return isFrameId(value.frameId);
    case 'FORMAT_SYNC':
      return (
        isFrameId(value.frameId) &&
        isFormatAction(value.action) &&
        typeof value.html === 'string'
      );
    case 'CONTENT_SYNC':
    case 'UNDO_SYNC':
    case 'REDO_SYNC':
      return isFrameId(value.frameId) && typeof value.html === 'string';
    case 'SYNC_ACK':
      return (
        isFrameId(value.frameId) && typeof value.sourceSyncId === 'string'
      );
    default:
      return false;
  }
}

export function isApplySyncMessage(value: unknown): value is ApplySyncMessage {
  return (
    isRecord(value) &&
    value.type === 'APPLY_SYNC' &&
    typeof value.syncId === 'string' &&
    isFrameId(value.sourceFrameId) &&
    typeof value.html === 'string'
  );
}

export function isSyncMessage(value: unknown): value is SyncMessage {
  return isEditorToHostMessage(value) || isApplySyncMessage(value);
}

export function getPeerFrameId(frameId: FrameId): FrameId {
  return frameId === 'frame-a' ? 'frame-b' : 'frame-a';
}

export function buildApplySyncMessage(
  sourceFrameId: FrameId,
  html: string,
  syncId: string,
  action?: FormatAction,
  selection?: { start: number; end: number },
): ApplySyncMessage {
  const message: ApplySyncMessage = {
    type: 'APPLY_SYNC',
    sourceFrameId,
    html,
    syncId,
    timestamp: createTimestamp(),
  };

  if (action) {
    message.action = action;
  }

  if (selection) {
    message.selectionStart = selection.start;
    message.selectionEnd = selection.end;
  }

  return message;
}

export function summarizeMessage(message: SyncMessage): string {
  switch (message.type) {
    case 'EDITOR_READY':
      return `Editor ready (${message.frameId})`;
    case 'FORMAT_SYNC':
      return `Format ${message.action} from ${message.frameId}`;
    case 'CONTENT_SYNC':
      return `Content sync from ${message.frameId}`;
    case 'UNDO_SYNC':
      return `Undo sync from ${message.frameId}`;
    case 'REDO_SYNC':
      return `Redo sync from ${message.frameId}`;
    case 'APPLY_SYNC':
      return `Apply sync from ${message.sourceFrameId}${message.action ? ` (${message.action})` : ''}`;
    case 'SYNC_ACK':
      return `Ack from ${message.frameId}`;
  }
}
