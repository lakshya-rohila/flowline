import { describe, expect, it } from 'vitest';
import { PACKS } from '../data/levels';
import type { LevelConfig } from '../types';
import { clearActiveDrag, createInitialState, extendPath, resolveStartDrag } from './engine';
import { computeHint } from './hint';

const level = PACKS[0].levels[0]; // b01: 5×5

// 4×4 level — simple enough to construct dead-end scenarios
const small: LevelConfig = {
  id: 'h1',
  size: 4,
  optimalMoves: 3,
  endpoints: [
    { color: 'red', row: 0, col: 0 },
    { color: 'red', row: 3, col: 3 },
    { color: 'blue', row: 0, col: 3 },
    { color: 'blue', row: 3, col: 0 },
  ],
};

describe('hint — fresh board', () => {
  it('suggests a start hint on a fresh level', () => {
    const s = createInitialState(level);
    const h = computeHint(s);
    expect(h).not.toBeNull();
    expect(h!.cells.length).toBeGreaterThanOrEqual(1);
    expect(h!.caption.length).toBeGreaterThan(3);
  });

  it('returns null when already solved', () => {
    const s = createInitialState(level);
    s.solved = true;
    expect(computeHint(s)).toBeNull();
  });

  it('hint color is a valid pipe color from the level', () => {
    const s = createInitialState(level);
    const h = computeHint(s);
    const colors = new Set(level.endpoints.map((e) => e.color));
    expect(colors.has(h!.color)).toBe(true);
  });

  it('hint cells are within grid bounds', () => {
    const s = createInitialState(level);
    const h = computeHint(s);
    for (const c of h!.cells) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(level.size);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(level.size);
    }
  });
});

describe('hint — partial path', () => {
  it('returns a continuation hint when a pipe is partially drawn', () => {
    const s = createInitialState(small);
    // Draw red one cell
    resolveStartDrag(s, { row: 0, col: 0 });
    extendPath(s, { row: 1, col: 0 });
    clearActiveDrag(s);

    const h = computeHint(s);
    expect(h).not.toBeNull();
    // The hint should suggest the next cell (not the start again)
    expect(h!.cells.length).toBeGreaterThanOrEqual(1);
  });

  it('hint cells are adjacent to the current path head or are a restart endpoint', () => {
    const s = createInitialState(small);
    resolveStartDrag(s, { row: 0, col: 0 });
    extendPath(s, { row: 1, col: 0 });
    extendPath(s, { row: 2, col: 0 });
    clearActiveDrag(s);

    const h = computeHint(s);
    expect(h).not.toBeNull();
    // Hint cell should be either adjacent to head or one of the endpoints (for restart hints)
    const head = s.paths[h!.color].cells.slice(-1)[0];
    const isEndpoint = small.endpoints.some(
      (e) => e.row === h!.cells[0].row && e.col === h!.cells[0].col,
    );
    const isAdjacent =
      head &&
      Math.abs(head.row - h!.cells[0].row) + Math.abs(head.col - h!.cells[0].col) <= 1;
    expect(isEndpoint || isAdjacent).toBe(true);
  });
});

describe('hint — does not suggest already-occupied own cells', () => {
  it('hint next cell is not already in the pipe path', () => {
    const s = createInitialState(small);
    resolveStartDrag(s, { row: 0, col: 0 });
    extendPath(s, { row: 0, col: 1 });
    extendPath(s, { row: 0, col: 2 });
    clearActiveDrag(s);

    const h = computeHint(s);
    if (h && h.color === 'red') {
      const redCells = new Set(s.paths.red.cells.map((c) => `${c.row},${c.col}`));
      for (const hc of h.cells) {
        // The first cell may be an endpoint (restart case), but should NOT be a mid-path cell
        const isRedEndpoint = small.endpoints.some(
          (e) => e.color === 'red' && e.row === hc.row && e.col === hc.col,
        );
        if (!isRedEndpoint) {
          expect(redCells.has(`${hc.row},${hc.col}`)).toBe(false);
        }
      }
    }
  });
});

describe('hint — does not suggest foreign endpoint dots', () => {
  it('hint cell is never an occupied foreign endpoint dot', () => {
    const s = createInitialState(small);
    const h = computeHint(s);
    if (h) {
      for (const hc of h.cells) {
        const dot = small.endpoints.find((e) => e.row === hc.row && e.col === hc.col);
        if (dot) {
          // If it's a dot, it must be for the same color as the hint
          expect(dot.color).toBe(h.color);
        }
      }
    }
  });
});

describe('hint — expiry', () => {
  it('has a positive expiresAt timestamp', () => {
    const s = createInitialState(level);
    const h = computeHint(s);
    expect(h!.expiresAt).toBeGreaterThan(performance.now());
  });
});
