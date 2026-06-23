import { useCallback, useState, useRef, useEffect } from 'react';
import type { EventLogEntry } from '../../shared/types';
import { downloadJson } from '../../shared/exportUtils';
import { ChevronRight, Download, Trash2, Filter, Radio, Cpu } from 'lucide-react';

interface EventLogPanelProps {
  entries: EventLogEntry[];
  onClear: () => void;
}

const cn = (...cls: string[]) => cls.filter(Boolean).join(' ');

const LOG_TAG_STYLES: Record<string, string> = {
  BOLD: "text-[hsl(var(--info))] bg-[hsl(var(--info))/0.1] border-[hsl(var(--info))/0.3]",
  ITALIC: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.1] border-[hsl(var(--warning))/0.3]",
  STRIKE: "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1] border-[hsl(var(--destructive))/0.3]",
  RELAY: "text-accent bg-accent/10 border-accent/40",
  SYNC: "text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1] border-[hsl(var(--success))/0.3]",
  READY: "text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1] border-[hsl(var(--success))/0.3]",
  HOST: "text-foreground bg-[hsl(var(--panel-strong))] border-border",
};

function getEntryDetails(entry: EventLogEntry) {
  const timeStr = new Date(entry.timestamp).toISOString().substring(11, 23); // HH:mm:ss.SSS
  let tag = 'SYNC';
  let src = 'host';
  let dst = 'host';
  let msg = entry.summary;

  if (entry.type === 'EDITOR_READY') tag = 'READY';
  else if (entry.type === 'FORMAT_SYNC') {
    const s = entry.summary.toLowerCase();
    if (s.includes('bold')) tag = 'BOLD';
    else if (s.includes('italic')) tag = 'ITALIC';
    else if (s.includes('strike')) tag = 'STRIKE';
    else tag = 'SYNC';
  }

  if (entry.direction === 'inbound') {
    src = entry.frameId ? entry.frameId.replace('frame-', '').toUpperCase() : 'UNKNOWN';
    dst = 'host';
    if (tag === 'READY') msg = `editor ready · ${entry.syncId.substring(0, 8)}`;
    else msg = `sync inbound · ${entry.syncId.substring(0, 8)}`;
  } else {
    tag = 'RELAY';
    src = 'host';
    dst = entry.targetFrameId ? entry.targetFrameId.replace('frame-', '').toUpperCase() : 'ALL';
    msg = `relay → ${dst.toLowerCase()} · ${entry.syncId.substring(0, 8)}`;
  }

  return { timeStr, tag, src, dst, msg };
}

const LogRow = ({ entry, idx }: { entry: EventLogEntry, idx: number }) => {
  const { timeStr, tag, src, dst, msg } = getEntryDetails(entry);
  return (
    <div
      className="log-row flex items-start gap-3 px-4 py-2.5 mono text-[12px]"
      data-testid={`log-row-${idx}`}
    >
      <span className="text-muted-foreground/70 tabular-nums shrink-0">
        {timeStr}
      </span>
      <span
        className={cn(
          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
          LOG_TAG_STYLES[tag] || LOG_TAG_STYLES.HOST
        )}
      >
        {tag}
      </span>
      <span className="shrink-0 text-muted-foreground flex items-center">
        <span className="text-foreground">{src}</span>
        <ChevronRight className="inline h-3 w-3 mx-0.5" />
        <span className="text-foreground">{dst}</span>
      </span>
      <span className="text-muted-foreground/90 truncate" title={entry.summary}>{msg}</span>
    </div>
  );
};

export function EventLogPanel({ entries, onClear }: EventLogPanelProps) {
  const [filter, setFilter] = useState("ALL");
  const filters = ["ALL", "RELAY", "SYNC", "BOLD", "ITALIC", "STRIKE", "READY"];
  
  const handleExport = useCallback(() => {
    downloadJson(entries, 'event-log.json');
  }, [entries]);

  const visible = entries.filter(e => {
    if (filter === "ALL") return true;
    const { tag } = getEntryDetails(e);
    if (filter === 'SYNC' && ['BOLD', 'ITALIC', 'STRIKE'].includes(tag)) return true;
    return tag === filter;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll removed as per user request to start at the top

  return (
    <section
      className="panel grain rounded-2xl overflow-hidden fade-up flex flex-col h-full"
      style={{ height: 'calc(100vh - 252px)', minHeight: '320px' }}
      data-testid="event-log-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-accent" />
          <h3 className="text-[15px] font-semibold tracking-tight">
            Host Event Log
          </h3>
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground rounded border border-border px-1.5 py-0.5">
            live
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="fmt-btn"
            disabled={entries.length === 0}
            onClick={handleExport}
            data-testid="export-log-button"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Log</span>
          </button>
          <button className="fmt-btn" onClick={onClear} data-testid="clear-log-button">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-2.5 overflow-x-auto shrink-0 scrollbar-hide">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`log-filter-${f.toLowerCase()}`}
            className={cn(
              "mono text-[10.5px] uppercase tracking-[0.14em] rounded-full px-2.5 py-1 border transition-colors shrink-0",
              filter === f
                ? "bg-accent/15 border-accent/50 text-accent"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
          {visible.length} events
        </span>
      </div>

      {/* Log content */}
      <div className="relative flex-1 overflow-y-auto scrollbar-hide" ref={scrollRef} data-testid="log-list">
        {visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="rounded-full bg-accent/10 border border-accent/30 p-3">
              <Cpu className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm font-medium">
              No events match the filter.
            </p>
            <p className="mono text-[11px] text-muted-foreground max-w-[260px]">
              Events stream live as the host relays operations between frames.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {visible.map((e, i) => (
              <LogRow entry={e} idx={i} key={e.id} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-2.5 flex items-center justify-between mono text-[11px] text-muted-foreground shrink-0">
        <span>tail -f host.events</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
          streaming
        </span>
      </div>
    </section>
  );
}
