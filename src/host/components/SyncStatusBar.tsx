import type { FrameId } from '../../shared/types';

interface SyncStatusBarProps {
  readyFrames: Set<FrameId>;
  relayCount: number;
  recentSyncId: string | null;
}

export function SyncStatusBar({
  readyFrames,
  relayCount,
  recentSyncId,
}: SyncStatusBarProps) {
  return (
    <div className="sync-status">
      <div className="sync-status__item">
        <span className="sync-status__label">Frames ready</span>
        <strong>{readyFrames.size} / 2</strong>
      </div>
      <div className="sync-status__item">
        <span className="sync-status__label">Relays</span>
        <strong>{relayCount}</strong>
      </div>
      <div className="sync-status__item">
        <span className="sync-status__label">Last sync</span>
        <strong>{recentSyncId ? recentSyncId.slice(0, 8) : '—'}</strong>
      </div>
    </div>
  );
}
