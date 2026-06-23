import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Layers, Hash, Activity, CircleDot } from 'lucide-react';
import type {
  ApplySyncMessage,
  FormatAction,
  FormatState,
  FrameId,
} from '../../shared/types';
import {
  CONTENT_SYNC_DEBOUNCE_MS,
  DEFAULT_EDITOR_HTML,
  SYNC_FLASH_DURATION_MS,
  createSyncId,
  createTimestamp,
  getDefaultEditorHtml,
  isApplySyncMessage,
} from '../../shared/protocol';
import { isTrustedOrigin } from '../../shared/originValidation';
import {
  getSelectionCharacterOffsets,
  normalizeEditorHtml,
  setSelectionByCharacterOffset,
} from '../../shared/selectionUtils';
import { loadEditorState, saveEditorState } from '../../shared/persistence';
import { Toolbar } from './Toolbar';

/** Maps Ctrl/Cmd keyboard shortcuts to format actions. */
const SHORTCUT_TO_FORMAT: Readonly<Record<string, FormatAction>> = {
  b: 'bold',
  i: 'italic',
};

interface RichTextEditorProps {
  frameId: FrameId;
  label: string;
}

const EMPTY_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  strikeThrough: false,
};

export function RichTextEditor({ frameId, label }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdateRef = useRef(false);
  const lastAppliedSyncIdRef = useRef<string | null>(null);
  const contentDebounceRef = useRef<number | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isUndoRedoRef = useRef(false);

  const [formatState, setFormatState] = useState<FormatState>(EMPTY_FORMAT_STATE);
  const [syncFlash, setSyncFlash] = useState(false);

  const postToHost = useCallback(
    (payload: Record<string, unknown>) => {
      window.parent.postMessage(
        {
          ...payload,
          syncId: payload.syncId ?? createSyncId(),
          timestamp: createTimestamp(),
        },
        window.location.origin,
      );
    },
    [],
  );

  const readHtml = useCallback((): string => {
    return editorRef.current?.innerHTML ?? DEFAULT_EDITOR_HTML;
  }, []);

  const pushUndoSnapshot = useCallback((html: string) => {
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] === html) {
      return;
    }
    stack.push(html);
    if (stack.length > 100) {
      stack.shift();
    }
    redoStackRef.current = [];
  }, []);

  const refreshFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });
  }, []);

  const broadcastContentSync = useCallback(() => {
    if (isRemoteUpdateRef.current || isUndoRedoRef.current) {
      return;
    }

    const html = readHtml();
    saveEditorState(frameId, html);
    postToHost({
      type: 'CONTENT_SYNC',
      frameId,
      html,
      syncId: createSyncId(),
    });
  }, [frameId, postToHost, readHtml]);

  const scheduleContentSync = useCallback(() => {
    if (contentDebounceRef.current !== null) {
      window.clearTimeout(contentDebounceRef.current);
    }

    contentDebounceRef.current = window.setTimeout(() => {
      contentDebounceRef.current = null;
      broadcastContentSync();
    }, CONTENT_SYNC_DEBOUNCE_MS);
  }, [broadcastContentSync]);

  const applyRemoteHtml = useCallback(
    (message: ApplySyncMessage) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      // Loop prevention: skip if we already applied this sync id.
      if (lastAppliedSyncIdRef.current === message.syncId) {
        return;
      }

      const currentHtml = editor.innerHTML;
      if (normalizeEditorHtml(currentHtml) === normalizeEditorHtml(message.html)) {
        lastAppliedSyncIdRef.current = message.syncId;
        return;
      }

      isRemoteUpdateRef.current = true;
      lastAppliedSyncIdRef.current = message.syncId;

      pushUndoSnapshot(currentHtml);
      editor.innerHTML = message.html;
      saveEditorState(frameId, message.html);

      if (
        typeof message.selectionStart === 'number' &&
        typeof message.selectionEnd === 'number'
      ) {
        setSelectionByCharacterOffset(
          editor,
          message.selectionStart,
          message.selectionEnd,
        );
      }

      refreshFormatState();
      setSyncFlash(true);
      window.setTimeout(() => setSyncFlash(false), SYNC_FLASH_DURATION_MS);

      postToHost({
        type: 'SYNC_ACK',
        frameId,
        sourceSyncId: message.syncId,
        syncId: createSyncId(),
      });

      // Release the remote guard after the browser finishes applying DOM updates.
      requestAnimationFrame(() => {
        isRemoteUpdateRef.current = false;
      });
    },
    [frameId, postToHost, pushUndoSnapshot, refreshFormatState],
  );

  const [chars, setChars] = useState(0);

  const updateChars = useCallback(() => {
    if (editorRef.current) {
      setChars(editorRef.current.innerText.length || 0);
    }
  }, []);

  const handleFormat = useCallback(
    (action: FormatAction) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      editor.focus();
      pushUndoSnapshot(readHtml());

      // execCommand remains the most portable API for contenteditable formatting.
      document.execCommand(action, false);

      refreshFormatState();
      updateChars();

      if (isRemoteUpdateRef.current) {
        return;
      }

      const html = readHtml();
      saveEditorState(frameId, html);
      const selection = getSelectionCharacterOffsets(editor);

      postToHost({
        type: 'FORMAT_SYNC',
        frameId,
        action,
        html,
        syncId: createSyncId(),
        ...(selection
          ? { selectionStart: selection.start, selectionEnd: selection.end }
          : {}),
      });
    },
    [frameId, postToHost, pushUndoSnapshot, readHtml, refreshFormatState, updateChars],
  );

  const handleInput = useCallback(() => {
    updateChars();
    if (isRemoteUpdateRef.current || isUndoRedoRef.current) {
      return;
    }

    pushUndoSnapshot(readHtml());
    scheduleContentSync();
    refreshFormatState();
  }, [
    pushUndoSnapshot,
    readHtml,
    refreshFormatState,
    scheduleContentSync,
    updateChars
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const isMeta = event.ctrlKey || event.metaKey;
      if (!isMeta) {
        return;
      }

      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        const previous = undoStackRef.current.pop();
        if (!previous) {
          return;
        }

        isUndoRedoRef.current = true;
        redoStackRef.current.push(readHtml());
        editor.innerHTML = previous;
        saveEditorState(frameId, previous);
        refreshFormatState();
        updateChars();

        postToHost({
          type: 'UNDO_SYNC',
          frameId,
          html: previous,
          syncId: createSyncId(),
        });

        isUndoRedoRef.current = false;
        return;
      }

      if (event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        const next = redoStackRef.current.pop();
        if (!next) {
          return;
        }

        isUndoRedoRef.current = true;
        undoStackRef.current.push(readHtml());
        editor.innerHTML = next;
        saveEditorState(frameId, next);
        refreshFormatState();
        updateChars();

        postToHost({
          type: 'REDO_SYNC',
          frameId,
          html: next,
          syncId: createSyncId(),
        });

        isUndoRedoRef.current = false;
        return;
      }

      // Intercept Ctrl+B / Ctrl+I so formatting syncs to the peer frame.
      const shortcutAction = SHORTCUT_TO_FORMAT[event.key.toLowerCase()];
      if (shortcutAction) {
        pushUndoSnapshot(readHtml());
        setTimeout(() => {
          refreshFormatState();
          updateChars();
          const html = readHtml();
          saveEditorState(frameId, html);
          const selection = getSelectionCharacterOffsets(editor);
          postToHost({
            type: 'FORMAT_SYNC',
            frameId,
            action: shortcutAction,
            html,
            syncId: createSyncId(),
            ...(selection
              ? { selectionStart: selection.start, selectionEnd: selection.end }
              : {}),
          });
        }, 0);
      }
    },
    [frameId, postToHost, readHtml, refreshFormatState, updateChars],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    // Restore persisted content or fall back to frame-specific default.
    const persisted = loadEditorState(frameId);
    const initialHtml = persisted ?? getDefaultEditorHtml(frameId);
    editor.innerHTML = initialHtml;
    pushUndoSnapshot(initialHtml);
    updateChars();

    postToHost({
      type: 'EDITOR_READY',
      frameId,
      syncId: createSyncId(),
    });
  }, [frameId, postToHost, pushUndoSnapshot, updateChars]);

  useEffect(() => {
    const handleSelectionChange = () => refreshFormatState();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, [refreshFormatState]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOrigin(event.origin)) {
        return;
      }

      if (!isApplySyncMessage(event.data)) {
        return;
      }

      applyRemoteHtml(event.data);
      updateChars();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyRemoteHtml, updateChars]);

  useEffect(
    () => () => {
      if (contentDebounceRef.current !== null) {
        window.clearTimeout(contentDebounceRef.current);
      }
    },
    [],
  );

  const cn = (...cls: string[]) => cls.filter(Boolean).join(' ');
  const accent = frameId === 'frame-a';

  return (
    <section
      className={cn(
        "flex flex-col h-full",
        syncFlash ? "ring-1 ring-inset ring-accent/80" : ""
      )}
      style={{ height: '100vh' }}
      data-testid={`frame-${frameId}-panel`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--destructive))/0.7]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--warning))/0.8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))/0.8]" />
          </div>
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            iframe.{frameId.replace('frame-', '')}.tsx
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 mono text-[11px] uppercase tracking-[0.16em]">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
            </span>
            <span className="text-[hsl(var(--success))]">Ready</span>
          </span>
          <button
            className="rounded-md border border-border p-1 text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
            aria-label="Maximize"
            data-testid={`frame-${frameId}-maximize`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between px-5 pt-4.5">
        <div className="flex items-center gap-2">
          <Layers
            className={cn(
              "h-4 w-4",
              accent ? "text-accent" : "text-muted-foreground"
            )}
          />
          <h3 className="text-[15px] font-semibold tracking-tight">
            {label}
          </h3>
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            origin: sandbox.local
          </span>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          rev · 7c2a
        </span>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3.5">
        <Toolbar formatState={formatState} onFormat={handleFormat} />
      </div>

      {/* Content area with line numbers */}
      <div className="relative mx-4 mb-4 flex-1 min-h-0 rounded-xl border border-border bg-[hsl(var(--code-bg))] overflow-hidden flex">
        <div className="w-11 shrink-0 border-r border-border bg-[hsl(var(--panel-strong))/0.5] flex flex-col pt-4 pr-2 select-none pointer-events-none">
          <div className="mono text-[11px] text-muted-foreground/70 text-right leading-[1.7]">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div
          ref={editorRef}
          className="editor-content flex-1 min-h-0 pl-5 pr-5 py-4 overflow-y-auto"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={refreshFormatState}
          onKeyUp={refreshFormatState}
          data-placeholder={`// type or paste rich text into ${label}…`}
          data-testid={`frame-${frameId}-editor`}
        />
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3 mono text-[11px] text-muted-foreground mt-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> chars{" "}
            <span className="text-foreground tabular-nums">{chars}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> bytes{" "}
            <span className="text-foreground tabular-nums">
              {Math.max(chars * 1.4 | 0, 0)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CircleDot className="h-3 w-3 text-accent" />
          <span>UTF-8 · LF · rich-text</span>
        </div>
      </div>
    </section>
  );
}
