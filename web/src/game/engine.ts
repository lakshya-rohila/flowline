import type { Cell, GameSnapshot, GameState, LevelConfig, PathData, PipeColorKey } from '../types';

export function coordKey(c: Cell): string {
  return `${c.row},${c.col}`;
}

export function coordEquals(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function getEndpointColorAt(level: LevelConfig, coord: Cell): PipeColorKey | null {
  const hit = level.endpoints.find((e) => e.row === coord.row && e.col === coord.col);
  return hit ? hit.color : null;
}

export function indexInPath(path: PathData, coord: Cell): number {
  return path.cells.findIndex((c) => c.row === coord.row && c.col === coord.col);
}

function emptyGrid(n: number): (PipeColorKey | null)[][] {
  return Array.from({ length: n }, () => Array<PipeColorKey | null>(n).fill(null));
}

export function rebuildGrid(state: GameState): void {
  const n = state.level.size;
  state.grid = emptyGrid(n);
  for (const color of Object.keys(state.paths)) {
    for (const cell of state.paths[color].cells) {
      state.grid[cell.row][cell.col] = color as PipeColorKey;
    }
  }
}

/** Erase every cell of `color` from the grid and reset its path to empty. */
export function clearPath(state: GameState, color: PipeColorKey): void {
  const path = state.paths[color];
  for (const cell of path.cells) {
    if (state.grid[cell.row][cell.col] === color) {
      state.grid[cell.row][cell.col] = null;
    }
  }
  path.cells = [];
  path.complete = false;
}

function initPaths(level: LevelConfig): Record<string, PathData> {
  const paths: Record<string, PathData> = {};
  for (const ep of level.endpoints) {
    if (!paths[ep.color]) {
      paths[ep.color] = { cells: [], complete: false };
    }
  }
  return paths;
}

export function createInitialState(level: LevelConfig): GameState {
  return {
    level,
    paths: initPaths(level),
    grid: emptyGrid(level.size),
    activeColor: null,
    activeHead: null,
    moves: 0,
    startTime: null,
    elapsedMs: 0,
    solved: false,
    allConnected: false,
    filledPercent: 0,
    history: [],
    solveAnimProgress: 0,
  };
}

export function pushSnapshot(state: GameState): void {
  const snap: GameSnapshot = {
    paths: JSON.parse(JSON.stringify(state.paths)),
    grid: JSON.parse(JSON.stringify(state.grid)),
    activeColor: state.activeColor,
    activeHead: state.activeHead ? { ...state.activeHead } : null,
    moves: state.moves,
    startTime: state.startTime,
    elapsedMs: state.elapsedMs,
    solved: state.solved,
    allConnected: state.allConnected,
    filledPercent: state.filledPercent,
    solveAnimProgress: state.solveAnimProgress,
  };
  state.history.push(snap);
  if (state.history.length > 20) state.history.shift();
}

export function applyUndo(state: GameState): void {
  if (state.history.length === 0) return;
  const prev = state.history.pop()!;
  state.paths = JSON.parse(JSON.stringify(prev.paths));
  state.grid = JSON.parse(JSON.stringify(prev.grid));
  state.activeColor = prev.activeColor;
  state.activeHead = prev.activeHead ? { ...prev.activeHead } : null;
  state.moves = prev.moves;
  state.startTime = prev.startTime;
  state.elapsedMs = prev.elapsedMs;
  state.solved = prev.solved;
  state.allConnected = prev.allConnected;
  state.filledPercent = prev.filledPercent;
  state.solveAnimProgress = prev.solveAnimProgress;
}

/**
 * Erase `fromCoord` and everything after it from the given color's path.
 * Directly nulls grid cells instead of calling rebuildGrid (faster).
 */
export function erasePathFrom(state: GameState, color: PipeColorKey, fromCoord: Cell): void {
  const path = state.paths[color];
  const idx = indexInPath(path, fromCoord);
  if (idx === -1) return;
  // Remove fromCoord and everything after, null them in grid
  const removed = path.cells.splice(idx);
  for (const c of removed) {
    if (state.grid[c.row][c.col] === color) {
      state.grid[c.row][c.col] = null;
    }
  }
  path.complete = false;
}

export function isCompletePath(level: LevelConfig, color: PipeColorKey, cells: Cell[]): boolean {
  const eps = level.endpoints.filter((e) => e.color === color);
  if (eps.length !== 2) return false;
  if (cells.length < 2) return false;
  const first = cells[0];
  const last = cells[cells.length - 1];
  return (
    (coordEquals(first, eps[0]) && coordEquals(last, eps[1])) ||
    (coordEquals(first, eps[1]) && coordEquals(last, eps[0]))
  );
}

/**
 * Recount filled cells and update filledPercent + allConnected + solved.
 * Called after EVERY grid mutation — the single source of truth.
 */
export function syncState(state: GameState): void {
  const n = state.level.size;
  const total = n * n;

  // Double-scan the grid directly (don't trust incremental counts)
  let filled = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (state.grid[r][c] !== null) filled++;
    }
  }
  state.filledPercent = Math.round((filled / total) * 100);

  // allConnected: every pipe has both endpoints joined
  const allConnected = Object.values(state.paths).every((p) => p.complete);
  state.allConnected = allConnected;

  // solved: all connected AND every cell filled
  if (allConnected && filled === total) {
    state.solved = true;
  }
}

// Keep old name as alias for compatibility
export function updateFilledPercent(state: GameState): void {
  syncState(state);
}

export function checkSolved(state: GameState): void {
  syncState(state);
}

/**
 * Begin a new drag gesture from `coord`.
 */
export function resolveStartDrag(state: GameState, coord: Cell): boolean {
  const endpointColor = getEndpointColorAt(state.level, coord);
  if (endpointColor) {
    pushSnapshot(state);
    clearPath(state, endpointColor);
    state.paths[endpointColor].cells = [{ ...coord }];
    state.grid[coord.row][coord.col] = endpointColor;
    state.activeColor = endpointColor;
    state.activeHead = { ...coord };
    state.solved = false;
    state.solveAnimProgress = 0;
    syncState(state);
    return true;
  }

  const occupant = state.grid[coord.row][coord.col];
  if (occupant) {
    pushSnapshot(state);
    const path = state.paths[occupant];
    const idx = indexInPath(path, coord);
    if (idx === -1) return false;
    const removed = path.cells.splice(idx + 1);
    for (const c of removed) {
      if (state.grid[c.row][c.col] === occupant) state.grid[c.row][c.col] = null;
    }
    path.complete = false;
    state.activeColor = occupant;
    state.activeHead = { ...coord };
    state.solved = false;
    state.solveAnimProgress = 0;
    syncState(state);
    return true;
  }

  return false;
}

/**
 * Extend the active path to `coord`.
 */
export function extendPath(state: GameState, coord: Cell): { changed: boolean; countMove: boolean } {
  const color = state.activeColor;
  const head = state.activeHead;
  if (!color || !head) return { changed: false, countMove: false };
  if (coordEquals(coord, head)) return { changed: false, countMove: false };
  if (!isAdjacent(head, coord)) return { changed: false, countMove: false };

  const path = state.paths[color];

  // ── Backtrack: re-entered own path ────────────────────────────────────────
  const idxSelf = indexInPath(path, coord);
  if (idxSelf !== -1) {
    const removed = path.cells.splice(idxSelf + 1);
    for (const c of removed) {
      if (state.grid[c.row][c.col] === color) state.grid[c.row][c.col] = null;
    }
    path.complete = false;
    state.activeHead = { ...coord };
    syncState(state);
    return { changed: true, countMove: false };
  }

  // ── Block entry into a foreign endpoint dot ───────────────────────────────
  const dotColor = getEndpointColorAt(state.level, coord);
  if (dotColor && dotColor !== color) {
    return { changed: false, countMove: false };
  }

  // ── Erase a foreign path if it occupies this cell ─────────────────────────
  const occupant = state.grid[coord.row][coord.col];
  if (occupant !== null && occupant !== color) {
    erasePathFrom(state, occupant, coord);
  }

  // ── Append cell ───────────────────────────────────────────────────────────
  path.cells.push({ ...coord });
  state.grid[coord.row][coord.col] = color;
  state.activeHead = { ...coord };

  if (!state.startTime) state.startTime = Date.now();

  // ── Check completion ──────────────────────────────────────────────────────
  if (isCompletePath(state.level, color, path.cells)) {
    path.complete = true;
    state.activeColor = null;
    state.activeHead = null;
    state.moves += 1;
    syncState(state); // updates solved, allConnected, filledPercent
    return { changed: true, countMove: true };
  }

  path.complete = false;
  syncState(state); // always sync after every mutation
  return { changed: true, countMove: false };
}

export function clearActiveDrag(state: GameState): void {
  state.activeColor = null;
  state.activeHead = null;
  // syncState not needed — no grid change
}

export function restartLevel(state: GameState): void {
  const level = state.level;
  Object.assign(state, createInitialState(level));
}
