import { useCallback, useState } from 'react';
import type { FrameId } from '../shared/types';
import { EditorFramePanel } from './components/EditorFramePanel';
import { EventLogPanel } from './components/EventLogPanel';
import { useMessageBroker } from './hooks/useMessageBroker';
import { loadEditorState } from '../shared/persistence';
import { downloadHtml } from '../shared/exportUtils';
import { useTheme } from '../shared/theme';
import { ArrowRight, Download, Sparkles, Sun, Moon, Terminal } from 'lucide-react';

const FRAME_CONFIG: ReadonlyArray<{ frameId: FrameId; label: string }> = [
  { frameId: 'frame-a', label: 'Frame A' },
  { frameId: 'frame-b', label: 'Frame B' },
];

const cn = (...cls: string[]) => cls.filter(Boolean).join(' ');

const StatChip = ({ label, value, accent, testId }: { label: string, value: string | number, accent?: boolean, testId?: string }) => (
  <div className="chip min-w-[116px]" data-testid={testId}>
    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mono">
      {label}
    </div>
    <div
      className={cn(
        "mono mt-1 text-[15px] font-semibold tabular-nums",
        accent ? "text-accent" : "text-foreground"
      )}
    >
      {value}
    </div>
  </div>
);

const ThemeToggle = ({ theme, setTheme }: { theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) => (
  <button
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    className="chip flex items-center gap-2 hover:text-accent"
    aria-label="Toggle theme"
    data-testid="theme-toggle-button"
  >
    {theme === "dark" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    )}
    <span className="mono text-[11px] uppercase tracking-[0.16em]">
      {theme === "dark" ? "Light" : "Dark"}
    </span>
  </button>
);

export function HostApp() {
  const [theme, setTheme] = useTheme();
  const [recentSyncId, setRecentSyncId] = useState<string | null>(null);

  const handleSyncRelayed = useCallback((syncId: string) => {
    setRecentSyncId(syncId);
  }, []);

  const {
    eventLog,
    readyFrames,
    relayCount,
    clearLog,
    registerIframe,
  } = useMessageBroker({ onSyncRelayed: handleSyncRelayed });

  const editorSrc = useCallback((frameId: FrameId, label: string) => {
    const params = new URLSearchParams({ frameId, label });
    return `/editor.html?${params.toString()}`;
  }, []);

  const handleExportHtml = useCallback(() => {
    const frameAHtml = loadEditorState('frame-a') ?? '';
    const frameBHtml = loadEditorState('frame-b') ?? '';
    const fullDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EduChunks — Exported Editor State</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    .frame { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .frame h2 { margin: 0 0 1rem; font-size: 1.1rem; color: #334155; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
  </style>
</head>
<body>
  <h1>EduChunks — Editor State Export</h1>
  <p>Exported at: ${new Date().toISOString()}</p>
  <hr>
  <div class="frame">
    <h2>Frame A</h2>
    ${frameAHtml}
  </div>
  <div class="frame">
    <h2>Frame B</h2>
    ${frameBHtml}
  </div>
</body>
</html>`;
    downloadHtml(fullDocument, 'editor-state.html');
  }, []);

  return (
    <div className="min-h-screen relative px-6 sm:px-8 lg:px-10 py-4" data-testid="dashboard-root">
      <div className="relative z-10 max-w-[1600px] mx-auto">
          <header className="relative z-10 mb-5 fade-up" data-testid="dashboard-header">
            <div className="flex flex-wrap items-start justify-between gap-8">
            {/* Left: project meta */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[hsl(var(--panel-strong))] px-2 py-1 mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  <Sparkles className="h-3 w-3" />
                  Educhunks Assessment
                </span>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  v0.4.1 · stable
                </span>
              </div>
              <h1 className="text-[28px] sm:text-[34px] leading-[1.05] font-semibold tracking-tight" data-testid="dashboard-title">
                Bidirectional{" "}
                <span className="relative">
                  Rich Text Sync
                  <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-accent/70 rounded-full" />
                </span>
              </h1>
              <div className="flow-arrow flex-wrap">
                <span className="tag">Frame A</span>
                <ArrowRight className="h-3 w-3" />
                <span className="tag text-accent">Host</span>
                <ArrowRight className="h-3 w-3" />
                <span className="tag">Frame B</span>
                <span className="mx-2 opacity-40">·</span>
                <span className="tag">Frame B</span>
                <ArrowRight className="h-3 w-3" />
                <span className="tag text-accent">Host</span>
                <ArrowRight className="h-3 w-3" />
                <span className="tag">Frame A</span>
              </div>
            </div>

            {/* Right: stats + controls */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <StatChip
                  label="Frames Ready"
                  value={`${readyFrames.size} / 2`}
                  accent={readyFrames.size === 2}
                  testId="stat-frames-ready"
                />
                <StatChip label="Relays" value={relayCount} testId="stat-relays" />
                <StatChip
                  label="Last Sync"
                  value={recentSyncId ? recentSyncId.substring(0, 8) : '—'}
                  testId="stat-last-sync"
                />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle theme={theme} setTheme={setTheme} />
                <button
                  className="chip flex items-center gap-2 hover:text-accent"
                  data-testid="export-html-button"
                  onClick={handleExportHtml}
                >
                  <Download className="h-4 w-4" />
                  <span className="mono text-[11px] uppercase tracking-[0.16em]">
                    Export HTML
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* terminal status strip */}
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-[hsl(var(--code-bg))] px-4 py-2 mono text-[12px] text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            <span className="text-accent">$</span>
            <span className="text-foreground">host.connect</span>
            <span>--frames=A,B --relay=ws --rpc=postMessage</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              </span>
              connected · 24ms latency
            </span>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {FRAME_CONFIG.map(({ frameId, label }) => (
            <div className="col-span-12 lg:col-span-4" key={frameId}>
              <EditorFramePanel
                frameId={frameId}
                label={label}
                src={editorSrc(frameId, label)}
                onIframeRef={registerIframe}
              />
            </div>
          ))}
          <div className="col-span-12 lg:col-span-4">
            <EventLogPanel entries={eventLog} onClear={clearLog} />
          </div>
        </main>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>build · {new Date().toISOString().split('T')[0]}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>node v22 · react 19</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>postMessage · structuredClone</span>
          </div>
          <div className="flex items-center gap-3">
            <span>educhunks · assessment</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span className="text-accent">@ E1</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
