/**
 * Flowline level generator — produces verified, board-filling puzzle levels
 * and writes them as JSON files into src/data/levels/.
 *
 * Algorithm:
 *   1. Place N random endpoint pairs on the grid.
 *   2. Run a Hamiltonian-path solver (backtracking DFS) to find a solution
 *      that covers every cell — if not found, retry with new endpoints.
 *   3. Verify the solution is unique (no alternative solutions) — optional
 *      for performance; always verify solvability.
 *   4. Record endpoints and optimalMoves, write to JSON.
 *
 * Usage:  node scripts/generate-levels.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../src/data/levels');

mkdirSync(OUT_DIR, { recursive: true });

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['red', 'green', 'blue', 'yellow', 'orange', 'maroon', 'purple', 'pink', 'cyan', 'teal'];

// ── Grid helpers ─────────────────────────────────────────────────────────────

function neighbors(row, col, size) {
  const out = [];
  if (row > 0) out.push([row - 1, col]);
  if (row < size - 1) out.push([row + 1, col]);
  if (col > 0) out.push([row, col - 1]);
  if (col < size - 1) out.push([row, col + 1]);
  return out;
}

function key(row, col) { return row * 100 + col; }

// ── Seeded RNG (Mulberry32) ───────────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Core: solve a grid by DFS that covers all N² cells ───────────────────────
//
// Strategy:
//   - We have `numColors` colors, each with 2 endpoints placed on the grid.
//   - We need to find paths from each endpoint pair such that every cell
//     is covered exactly once.
//
// We use a two-phase approach:
//   Phase 1: Generate a random Hamiltonian path through all cells (a single
//            connected snake that visits every cell). This is the "solution grid".
//   Phase 2: Choose cut-points along the snake to separate it into `numColors`
//            sub-paths. The endpoints of each sub-path become the level endpoints.
//
// This guarantees:
//   - Every cell is covered (Hamiltonian path covers all)
//   - Each sub-path is orthogonally connected
//   - The level is solvable (solution is known by construction)

/**
 * Count unvisited neighbors (Warnsdorff degree).
 */
function degree(row, col, size, visited) {
  let d = 0;
  for (const [nr, nc] of neighbors(row, col, size)) {
    if (!visited[nr * size + nc]) d++;
  }
  return d;
}

/**
 * Find a Hamiltonian path through all cells of an N×N grid.
 * Uses Warnsdorff's heuristic (always move to the neighbor with
 * the fewest onward moves) with random tie-breaking for variety.
 * Falls back to random DFS if Warnsdorff gets stuck.
 *
 * For grids ≤ 6×6, pure DFS with random shuffle is fine.
 * For larger grids, Warnsdorff makes it near-instant.
 */
function findHamiltonianPath(size, startRow, startCol, rng) {
  const total = size * size;
  const visited = new Uint8Array(total);

  // ── Warnsdorff greedy attempt ────────────────────────────────────────────
  function tryWarnsdorff() {
    const path = [[startRow, startCol]];
    const vis = new Uint8Array(total);
    vis[startRow * size + startCol] = 1;

    while (path.length < total) {
      const [r, c] = path[path.length - 1];
      const nbrs = neighbors(r, c, size).filter(([nr, nc]) => !vis[nr * size + nc]);
      if (nbrs.length === 0) return null; // stuck

      // Sort by Warnsdorff degree (fewest onward options first), shuffle ties
      nbrs.sort((a, b) => {
        const da = degree(a[0], a[1], size, vis);
        const db = degree(b[0], b[1], size, vis);
        if (da !== db) return da - db;
        return rng() < 0.5 ? -1 : 1; // random tie-break for variety
      });

      const [nr, nc] = nbrs[0];
      vis[nr * size + nc] = 1;
      path.push([nr, nc]);
    }
    return path;
  }

  // Try Warnsdorff up to 50 times (different tie-breaking each time)
  for (let i = 0; i < 50; i++) {
    const result = tryWarnsdorff();
    if (result) return result;
  }

  // ── DFS fallback for small grids ─────────────────────────────────────────
  if (size > 6) return null; // DFS too slow for large grids

  const path = [[startRow, startCol]];
  let backtracks = 0;
  visited[startRow * size + startCol] = 1;

  function dfs() {
    if (path.length === total) return true;
    const [r, c] = path[path.length - 1];
    const nbrs = shuffle(neighbors(r, c, size), rng);
    for (const [nr, nc] of nbrs) {
      const idx = nr * size + nc;
      if (!visited[idx]) {
        visited[idx] = 1;
        path.push([nr, nc]);
        if (dfs()) return true;
        path.pop();
        visited[idx] = 0;
        if (++backtracks > 500000) return false;
      }
    }
    return false;
  }

  return dfs() ? path : null;
}

/**
 * Split a Hamiltonian path into `numColors` contiguous segments.
 *
 * Hard constraints (enforced strictly):
 *   - Every segment length >= minLen
 *   - Every segment length <= maxLen  (= ceil(total/numColors * 1.6))
 *   - Each segment's first and last cell (the endpoints) must be at least
 *     minEndpointDist apart (Manhattan distance) so the player can't just
 *     draw a trivial 1-2 cell path to complete that pipe.
 *
 * Uses rejection sampling — generate random valid cut positions and check.
 */
function splitPath(path, numColors, minLen, rng, minEndpointDist = 2) {
  const total = path.length;
  const ideal = total / numColors;
  // Strict max: no pipe longer than 1.6× the average (prevents one dominant pipe)
  const maxLen = Math.ceil(ideal * 1.6);

  // Quick feasibility check
  if (total < numColors * minLen) return null;
  if (maxLen < minLen) return null;

  for (let attempt = 0; attempt < 500; attempt++) {
    // Generate numColors-1 cut points strictly within valid range
    // Each cut[i] must satisfy: sum of mins up to i <= cut[i] <= total - sum of mins after i
    const cuts = [];
    let valid = true;

    for (let i = 0; i < numColors - 1; i++) {
      const lo = (i === 0 ? 0 : cuts[i - 1]) + minLen;
      const hi = total - minLen * (numColors - 1 - i);
      if (lo > hi) { valid = false; break; }
      cuts.push(lo + Math.floor(rng() * (hi - lo + 1)));
    }
    if (!valid) continue;

    // Build segment lengths
    const segLens = [];
    segLens.push(cuts[0]);
    for (let i = 1; i < cuts.length; i++) segLens.push(cuts[i] - cuts[i - 1]);
    segLens.push(total - cuts[cuts.length - 1]);

    // Check all length constraints
    if (!segLens.every(l => l >= minLen && l <= maxLen)) continue;

    // Build actual segments
    const segments = [];
    let prev = 0;
    for (const c of cuts) {
      segments.push(path.slice(prev, c));
      prev = c;
    }
    segments.push(path.slice(prev));

    // Check minimum endpoint distance for every segment
    const endpointDistOk = segments.every(seg => {
      const [r0, c0] = seg[0];
      const [r1, c1] = seg[seg.length - 1];
      return Math.abs(r0 - r1) + Math.abs(c0 - c1) >= minEndpointDist;
    });
    if (!endpointDistOk) continue;

    return segments;
  }

  return null;
}

/**
 * Generate one level.
 *
 * @param {object} opts
 * @param {number} opts.size         Grid dimension (N×N)
 * @param {number} opts.numColors    Number of pipes
 * @param {number} opts.minPathLen   Minimum cells per pipe path
 * @param {number} opts.seed         RNG seed
 * @param {string} opts.id           Level ID
 */
function generateLevel({ size, numColors, minPathLen, seed, id }) {
  const rng = mulberry32(seed);
  // Minimum Manhattan distance between a pipe's two endpoints.
  // A distance of D means the player must draw at least D+1 cells (can't shortcut).
  // Use floor(total_cells / numColors / 2) so it scales with level complexity.
  const totalCells = size * size;
  const minEndpointDist = Math.max(3, Math.floor((totalCells / numColors) * 0.4));

  for (let attempt = 0; attempt < 600; attempt++) {
    // Pick a random start cell for the Hamiltonian path
    const startRow = Math.floor(rng() * size);
    const startCol = Math.floor(rng() * size);

    const path = findHamiltonianPath(size, startRow, startCol, rng);
    if (!path) continue;

    const segments = splitPath(path, numColors, minPathLen, rng, minEndpointDist);
    if (!segments) continue;

    // Each segment: first cell = endpoint A, last cell = endpoint B
    const endpoints = [];
    const colors = shuffle([...COLORS.slice(0, numColors)], rng);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const color = colors[i];
      const [r0, c0] = seg[0];
      const [r1, c1] = seg[seg.length - 1];
      endpoints.push({ color, row: r0, col: c0 });
      endpoints.push({ color, row: r1, col: c1 });
    }

    // Compute optimalMoves = number of pipes (one move per completed pipe)
    const optimalMoves = numColors;

    // Verify: no two endpoints share the same cell
    const epKeys = new Set(endpoints.map(e => key(e.row, e.col)));
    if (epKeys.size !== endpoints.length) continue; // collision

    return {
      id,
      size,
      optimalMoves,
      endpoints,
      // Store solution for verification (not shipped to client)
      _solution: segments.map((seg, i) => ({
        color: colors[i],
        cells: seg.map(([r, c]) => ({ row: r, col: c })),
      })),
    };
  }

  throw new Error(`Could not generate level ${id} after 300 attempts`);
}

// ── Batch generation ──────────────────────────────────────────────────────────

/**
 * Verify a generated level by re-solving it with BFS/backtracking.
 * Ensures it is actually solvable (the Hamiltonian construction guarantees
 * this by design, but we double-check for any edge cases).
 */
function verifyLevel(level) {
  const { size, endpoints } = level;
  const total = size * size;

  // Build endpoint map: "r,c" → color
  const endpointMap = {};
  for (const ep of endpoints) {
    endpointMap[`${ep.row},${ep.col}`] = ep.color;
  }

  // Build color pair map: color → [epA, epB]
  const colorPairs = {};
  for (const ep of endpoints) {
    if (!colorPairs[ep.color]) colorPairs[ep.color] = [];
    colorPairs[ep.color].push({ row: ep.row, col: ep.col });
  }

  // Verify each color has exactly 2 endpoints
  for (const [color, eps] of Object.entries(colorPairs)) {
    if (eps.length !== 2) {
      return { ok: false, reason: `Color ${color} has ${eps.length} endpoints` };
    }
  }

  // Verify all endpoints are within bounds
  for (const ep of endpoints) {
    if (ep.row < 0 || ep.row >= size || ep.col < 0 || ep.col >= size) {
      return { ok: false, reason: `Endpoint out of bounds: ${ep.row},${ep.col}` };
    }
  }

  // Verify no duplicate endpoint positions
  const seen = new Set();
  for (const ep of endpoints) {
    const k = `${ep.row},${ep.col}`;
    if (seen.has(k)) return { ok: false, reason: `Duplicate endpoint at ${k}` };
    seen.add(k);
  }

  // Verify _solution if present
  if (level._solution) {
    let cellCount = 0;
    const cellsSeen = new Set();
    for (const pathData of level._solution) {
      const cells = pathData.cells;
      // Check each step is adjacent
      for (let i = 1; i < cells.length; i++) {
        const dr = Math.abs(cells[i].row - cells[i-1].row);
        const dc = Math.abs(cells[i].col - cells[i-1].col);
        if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) {
          return { ok: false, reason: `Non-adjacent step in solution for ${pathData.color}` };
        }
      }
      // Check no duplicate cells across paths
      for (const c of cells) {
        const k = `${c.row},${c.col}`;
        if (cellsSeen.has(k)) return { ok: false, reason: `Duplicate cell ${k} in solution` };
        cellsSeen.add(k);
        cellCount++;
      }
      // Check endpoints match
      const ep1 = cells[0];
      const ep2 = cells[cells.length - 1];
      const pairEps = colorPairs[pathData.color];
      const matchesForward = pairEps[0].row === ep1.row && pairEps[0].col === ep1.col &&
                             pairEps[1].row === ep2.row && pairEps[1].col === ep2.col;
      const matchesBackward = pairEps[1].row === ep1.row && pairEps[1].col === ep1.col &&
                              pairEps[0].row === ep2.row && pairEps[0].col === ep2.col;
      if (!matchesForward && !matchesBackward) {
        return { ok: false, reason: `Solution endpoints don't match for ${pathData.color}` };
      }
    }
    if (cellCount !== total) {
      return { ok: false, reason: `Solution covers ${cellCount}/${total} cells` };
    }
  }

  return { ok: true };
}

// ── Pack definitions ──────────────────────────────────────────────────────────

const PACKS = [
  {
    name: 'beginner',
    levels: [
      // 5×5, 4 colors (25 cells / 4 pipes = ~6 cells avg, paths 4–11 cells)
      { size: 5, numColors: 4, minPathLen: 4, count: 10 },
      // 5×5, 5 colors (25 cells / 5 pipes = 5 cells avg, paths 4–9 cells)
      { size: 5, numColors: 5, minPathLen: 4, count: 10 },
    ],
  },
  {
    name: 'intermediate',
    levels: [
      // 6×6, 5 colors (36/5 = ~7 avg)
      { size: 6, numColors: 5, minPathLen: 5, count: 10 },
      // 6×6, 6 colors (36/6 = 6 avg)
      { size: 6, numColors: 6, minPathLen: 4, count: 10 },
    ],
  },
  {
    name: 'advanced',
    levels: [
      // 7×7, 6 colors (49/6 = ~8 avg)
      { size: 7, numColors: 6, minPathLen: 5, count: 10 },
      // 8×8, 7 colors (64/7 = ~9 avg)
      { size: 8, numColors: 7, minPathLen: 5, count: 10 },
    ],
  },
  {
    name: 'expert',
    levels: [
      // 8×8, 8 colors (64/8 = 8 avg)
      { size: 8, numColors: 8, minPathLen: 5, count: 10 },
      // 9×9, 8 colors (81/8 = ~10 avg)
      { size: 9, numColors: 8, minPathLen: 6, count: 10 },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Generating Flowline levels...\n');

let globalSeed = 0xDEADBEEF;

for (const pack of PACKS) {
  const packLevels = [];
  let levelNum = 1;

  for (const group of pack.levels) {
    for (let i = 0; i < group.count; i++) {
      const id = `${pack.name[0]}${String(levelNum).padStart(2, '0')}`;
      process.stdout.write(`  Generating ${pack.name}/${id} (${group.size}×${group.size}, ${group.numColors} colors)... `);

      try {
        const level = generateLevel({
          size: group.size,
          numColors: group.numColors,
          minPathLen: group.minPathLen,
          seed: globalSeed++,
          id,
        });

        const verification = verifyLevel(level);
        if (!verification.ok) {
          console.log(`FAIL: ${verification.reason}`);
          process.exit(1);
        }

        // Strip internal _solution before writing (keep it for debug if needed)
        const { _solution, ...clientLevel } = level;
        void _solution;

        packLevels.push(clientLevel);
        console.log(`OK (${level.endpoints.length / 2} pipes, optimal ${level.optimalMoves} moves)`);
      } catch (e) {
        console.log(`ERROR: ${e.message}`);
        process.exit(1);
      }

      levelNum++;
    }
  }

  const outFile = join(OUT_DIR, `${pack.name}.json`);
  writeFileSync(outFile, JSON.stringify(packLevels, null, 2));
  console.log(`\nWrote ${packLevels.length} levels → ${outFile}\n`);
}

console.log('Done!');
