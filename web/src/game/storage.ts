const STORAGE_KEY = 'flowline_progress_v2';

export interface LevelRecord {
  moves: number;
  timeMs: number;
  ts: number;
}

export type ProgressMap = Record<string, LevelRecord>;

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export function saveLevelRecord(levelId: string, moves: number, timeMs: number): void {
  const data = loadProgress();
  const prev = data[levelId];
  const next = { moves, timeMs, ts: Date.now() };
  if (!prev || moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs)) {
    data[levelId] = next;
  } else {
    data[levelId] = { ...prev, ts: Date.now() };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLevelRecord(levelId: string): LevelRecord | null {
  return loadProgress()[levelId] ?? null;
}

export function isLevelCompleted(levelId: string): boolean {
  return !!getLevelRecord(levelId);
}
