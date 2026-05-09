import type { Cell, GameState, LevelConfig, PipeColorKey } from '../types';
import { coordEquals, getEndpointColorAt } from './engine';

const MAX_HINTS_PER_LEVEL = 5;

export interface HintVisual {
  color: PipeColorKey;
  cells: Cell[];
  caption: string;
  /** performance.now() + duration */
  expiresAt: number;
}

function key(c: Cell): string {
  return `${c.row},${c.col}`;
}

function neighbors(c: Cell, n: number): Cell[] {
  const out: Cell[] = [];
  if (c.row > 0) out.push({ row: c.row - 1, col: c.col });
  if (c.row + 1 < n) out.push({ row: c.row + 1, col: c.col });
  if (c.col > 0) out.push({ row: c.row, col: c.col - 1 });
  if (c.col + 1 < n) out.push({ row: c.row, col: c.col + 1 });
  return out;
}

function endpointsFor(level: LevelConfig, color: PipeColorKey): [Cell, Cell] {
  const eps = level.endpoints.filter((e) => e.color === color);
  return [
    { row: eps[0].row, col: eps[0].col },
    { row: eps[1].row, col: eps[1].col },
  ];
}


/**
 * Whether `color` may step into `cell` during BFS toward `goal`.
 *
 * FIX — The old canEnterForPipe treated any cell already occupied by `color` as
 * passable. That is correct for re-routing (you can traverse your own cells) but
 * the BFS also uses the live grid which may have the pipe's own cells on it.
 * When BFS starts from the current path head, cells already in the path appear
 * occupied by `color` in the grid — but we must NOT step back through them (that
 * would imply the hint tells the player to loop, which is invalid).
 *
 * The fix: pass the set of cells currently in the pipe's path as an exclusion set
 * for the BFS, so BFS only enters empty cells, foreign-pipe cells (which will be
 * overwritten), and the goal cell.
 *
 * Also clarified: at the goal, we allow entry even if occupied by a foreign color
 * — because the user will erase that foreign path on arrival. We do NOT allow entry
 * at a foreign endpoint dot (even if it is empty) except at the goal.
 */
function canEnterForPipe(
  level: LevelConfig,
  grid: (PipeColorKey | null)[][],
  color: PipeColorKey,
  cell: Cell,
  goal: Cell,
  ownPathSet: Set<string>,
): boolean {
  const k = key(cell);

  // Never re-enter our own existing path cells (avoids loops in hints)
  if (ownPathSet.has(k)) return false;

  const atGoal = coordEquals(cell, goal);
  const occ = grid[cell.row][cell.col];

  if (atGoal) {
    // At goal: allow if empty or occupied by our own color or the goal is the other endpoint
    // Also allow if a foreign path is there (we'd erase it) — but NOT a foreign endpoint dot
    const dot = getEndpointColorAt(level, cell);
    if (dot && dot !== color) return false; // foreign endpoint dot: never enter
    return true;
  }

  // Not at goal:
  if (occ === color) return false; // already in own path (covered by ownPathSet but double-guard)
  if (occ !== null) {
    // Occupied by a foreign pipe — we can enter (BFS will count this as a candidate
    // route; the engine will erase the foreign path when actually played)
    // BUT only if it's not a foreign endpoint dot
    const dot = getEndpointColorAt(level, cell);
    if (dot && dot !== color) return false;
    return true;
  }

  // Cell is empty — block if it's a foreign endpoint dot
  const dot = getEndpointColorAt(level, cell);
  if (dot && dot !== color) return false;

  return true;
}

/**
 * BFS shortest path from `start` to `goal` for `color`.
 *
 * FIX — pass `ownPathCells` so the BFS won't step through cells already in the
 * pipe's current path (prevents circular/loop hints).
 */
function shortestPath(
  level: LevelConfig,
  grid: (PipeColorKey | null)[][],
  color: PipeColorKey,
  start: Cell,
  goal: Cell,
  ownPathCells: Cell[],
): Cell[] | null {
  const n = level.size;
  // Build exclusion set from own path, but do NOT exclude the start itself
  const ownPathSet = new Set(ownPathCells.map(key));
  ownPathSet.delete(key(start)); // start must be reachable

  const q: Cell[] = [start];
  const prev = new Map<string, Cell | null>();
  prev.set(key(start), null);

  while (q.length) {
    const cur = q.shift()!;
    if (coordEquals(cur, goal)) {
      const out: Cell[] = [];
      let x: Cell | null = cur;
      while (x !== null) {
        out.push(x);
        const p = prev.get(key(x));
        if (p === undefined) break;
        x = p;
      }
      out.reverse();
      return out;
    }
    for (const nb of neighbors(cur, n)) {
      const nk = key(nb);
      if (prev.has(nk)) continue;
      if (!canEnterForPipe(level, grid, color, nb, goal, ownPathSet)) continue;
      prev.set(nk, cur);
      q.push(nb);
    }
  }
  return null;
}

/**
 * Determine which endpoint to route toward from the current path head.
 *
 * FIX — When the path has cells, we always want to route toward the endpoint
 * the path is NOT currently anchored at. If the head IS an endpoint, we aim for
 * the other. Otherwise we pick whichever endpoint is reachable and closest.
 */
function pickGoal(state: GameState, color: PipeColorKey, pathCells: Cell[]): Cell {
  const [a, b] = endpointsFor(state.level, color);
  const head = pathCells[pathCells.length - 1];

  // If path has a definite start endpoint, route toward the other one
  const startDot = getEndpointColorAt(state.level, pathCells[0]);
  if (startDot === color) {
    // Started from endpoint a or b — aim for the other
    if (coordEquals(pathCells[0], a)) return b;
    return a;
  }

  // Path was started mid-cell (e.g. after trimming) — pick closer reachable endpoint
  const pa = shortestPath(state.level, state.grid, color, head, a, pathCells);
  const pb = shortestPath(state.level, state.grid, color, head, b, pathCells);
  const la = pa ? pa.length : Infinity;
  const lb = pb ? pb.length : Infinity;
  return la <= lb ? a : b;
}

export function getMaxHintsPerLevel(): number {
  return MAX_HINTS_PER_LEVEL;
}

/**
 * Suggest the next 1–2 cells the player should draw for the most-stuck pipe.
 *
 * FIX — The old code sorted by path length (shortest first) and only considered
 * pipes with `cells.length === 0` as "not started". A pipe with a partial path that
 * is going the wrong direction was still fed into the BFS but the BFS would fail or
 * return a path that doubled back, producing a bad hint.
 *
 * New strategy:
 *  1. For each incomplete pipe compute BFS from its current head to its goal.
 *  2. If no path found from the current head, try from each bare endpoint instead
 *     (the player may need to restart that pipe from scratch).
 *  3. Rank by BFS path length (most stuck = shortest remaining path wins).
 *  4. Return the first cell(s) of the best path.
 */
export function computeHint(state: GameState): HintVisual | null {
  if (state.solved) return null;

  interface Candidate {
    color: PipeColorKey;
    hintCells: Cell[];
    caption: string;
    pathLen: number;
    needsRestart: boolean;
  }

  const candidates: Candidate[] = [];

  for (const [c, p] of Object.entries(state.paths)) {
    const color = c as PipeColorKey;
    if (p.complete) continue;

    const [ea, eb] = endpointsFor(state.level, color);

    if (p.cells.length === 0) {
      // Pipe not started at all — suggest starting from whichever endpoint gives
      // the shorter path to the other
      const pathFromA = shortestPath(state.level, state.grid, color, ea, eb, []);
      const pathFromB = shortestPath(state.level, state.grid, color, eb, ea, []);

      if (!pathFromA && !pathFromB) continue;

      const useA = !pathFromB || (pathFromA && pathFromA.length <= pathFromB.length);
      const bestPath = useA ? pathFromA! : pathFromB!;
      const startDot = useA ? ea : eb;

      candidates.push({
        color,
        hintCells: [startDot, bestPath[1]],
        caption: 'Start here — tap the glowing dot and drag.',
        pathLen: bestPath.length,
        needsRestart: false,
      });
      continue;
    }

    // Pipe has cells — try BFS from current head toward correct goal
    const goal = pickGoal(state, color, p.cells);
    const head = p.cells[p.cells.length - 1];
    const sp = shortestPath(state.level, state.grid, color, head, goal, p.cells);

    if (sp && sp.length >= 2) {
      candidates.push({
        color,
        hintCells: [sp[1]],
        caption: 'Continue this color toward the pulse.',
        pathLen: sp.length,
        needsRestart: false,
      });
      continue;
    }

    // BFS from head failed — the current partial path is dead-ended.
    // Suggest restarting from the nearest endpoint.
    const fromA = shortestPath(state.level, state.grid, color, ea, eb, []);
    const fromB = shortestPath(state.level, state.grid, color, eb, ea, []);

    if (!fromA && !fromB) continue;

    const useA = !fromB || (fromA && fromA.length <= fromB.length);
    const bestPath = useA ? fromA! : fromB!;
    const startDot = useA ? ea : eb;

    candidates.push({
      color,
      hintCells: [startDot, bestPath[1]],
      caption: "This path is stuck — restart from the glowing dot.",
      pathLen: bestPath.length,
      needsRestart: true,
    });
  }

  if (candidates.length === 0) return null;

  // Pick the candidate with the shortest remaining path length
  // (most urgently needs help) — but prefer non-restart hints
  candidates.sort((x, y) => {
    if (x.needsRestart !== y.needsRestart) return x.needsRestart ? 1 : -1;
    return x.pathLen - y.pathLen;
  });

  const best = candidates[0];
  return {
    color: best.color,
    cells: best.hintCells,
    caption: best.caption,
    expiresAt: performance.now() + 4500,
  };
}
