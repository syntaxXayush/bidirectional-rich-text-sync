/** Unique identifier for each editor iframe instance. */
export type FrameId = 'frame-a' | 'frame-b';

/** Format actions supported by the toolbar and sync protocol. */
export type FormatAction = 'bold' | 'italic' | 'strikeThrough';

/** All message types exchanged between editor frames and the host broker. */
export type MessageType =
  | 'EDITOR_READY'
  | 'FORMAT_SYNC'
  | 'CONTENT_SYNC'
  | 'UNDO_SYNC'
  | 'REDO_SYNC'
  | 'APPLY_SYNC'
  | 'SYNC_ACK';

/** Base fields present on every postMessage payload. */
export interface MessageEnvelope {
  type: MessageType;
  /** Monotonic id used for loop prevention and event log correlation. */
  syncId: string;
  /** ISO timestamp for host-side logging. */
  timestamp?: string;
}

/** Editor → Host: frame is mounted and ready to receive relayed messages. */
export interface EditorReadyMessage extends MessageEnvelope {
  type: 'EDITOR_READY';
  frameId: FrameId;
}

/**
 * Editor → Host: user applied formatting; includes full document snapshot.
 * Matches the assignment payload contract.
 */
export interface FormatSyncMessage extends MessageEnvelope {
  type: 'FORMAT_SYNC';
  frameId: FrameId;
  action: FormatAction;
  html: string;
  /** Optional cursor offsets for cursor preservation (bonus). */
  selectionStart?: number;
  selectionEnd?: number;
}

/** Editor → Host: plain text input changed (bonus feature). */
export interface ContentSyncMessage extends MessageEnvelope {
  type: 'CONTENT_SYNC';
  frameId: FrameId;
  html: string;
}

/** Editor → Host: undo/redo stack changed (bonus feature). */
export interface UndoSyncMessage extends MessageEnvelope {
  type: 'UNDO_SYNC';
  frameId: FrameId;
  html: string;
}

export interface RedoSyncMessage extends MessageEnvelope {
  type: 'REDO_SYNC';
  frameId: FrameId;
  html: string;
}

/**
 * Host → Editor: apply remote state without re-broadcasting.
 * Optional selection offsets enable cursor preservation (bonus).
 */
export interface ApplySyncMessage extends MessageEnvelope {
  type: 'APPLY_SYNC';
  sourceFrameId: FrameId;
  html: string;
  action?: FormatAction;
  selectionStart?: number;
  selectionEnd?: number;
}

/** Editor → Host: confirms remote apply completed (optional telemetry). */
export interface SyncAckMessage extends MessageEnvelope {
  type: 'SYNC_ACK';
  frameId: FrameId;
  sourceSyncId: string;
}

export type EditorToHostMessage =
  | EditorReadyMessage
  | FormatSyncMessage
  | ContentSyncMessage
  | UndoSyncMessage
  | RedoSyncMessage
  | SyncAckMessage;

export type HostToEditorMessage = ApplySyncMessage;

export type SyncMessage = EditorToHostMessage | HostToEditorMessage;

/** Toolbar button active state derived from queryCommandState. */
export interface FormatState {
  bold: boolean;
  italic: boolean;
  strikeThrough: boolean;
}

/** Single entry in the host event log panel. */
export interface EventLogEntry {
  id: string;
  direction: 'inbound' | 'outbound' | 'relay';
  frameId: FrameId | 'host';
  targetFrameId?: FrameId;
  type: MessageType;
  syncId: string;
  timestamp: string;
  summary: string;
}

/** Props passed to iframe via URL query string. */
export interface EditorFrameConfig {
  frameId: FrameId;
  label: string;
}
