import type { EventLogEntry } from './types';

const STORAGE_PREFIX = 'educhunks-';

function key(suffix: string): string {
  return `${STORAGE_PREFIX}${suffix}`;
}

/* ------------------------------------------------------------------ */
/*  Editor HTML                                                       */
/* ------------------------------------------------------------------ */

export function saveEditorState(frameId: string, html: string): void {
  try {
    localStorage.setItem(key(`editor-${frameId}`), html);
  } catch {
    // Storage full or unavailable — silently degrade.
  }
}

export function loadEditorState(frameId: string): string | null {
  try {
    return localStorage.getItem(key(`editor-${frameId}`));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Event Log                                                         */
/* ------------------------------------------------------------------ */

export function saveEventLog(entries: EventLogEntry[]): void {
  try {
    // Only persist the most recent 100 entries to avoid hitting quota.
    localStorage.setItem(key('event-log'), JSON.stringify(entries.slice(0, 100)));
  } catch {
    // Silently degrade.
  }
}

export function loadEventLog(): EventLogEntry[] | null {
  try {
    const raw = localStorage.getItem(key('event-log'));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as EventLogEntry[];
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Housekeeping                                                      */
/* ------------------------------------------------------------------ */

export function clearPersistedState(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently degrade.
  }
}
