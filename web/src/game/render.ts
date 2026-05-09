import { PIPE_COLORS, UI_COLORS } from '../constants/colors';
import type { GameState, PipeColorKey } from '../types';
import { getEndpointColorAt } from './engine';
import type { BoardLayout } from './layout';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawGrid(ctx: CanvasRenderingContext2D, state: GameState, layout: BoardLayout) {
  const { width, height, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_SIZE, CELL_SIZE } = layout;
  const n = state.level.size;

  // Background
  ctx.fillStyle = UI_COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  // Grid background with subtle inner shadow
  ctx.save();
  ctx.fillStyle = UI_COLORS.gridBg;
  roundRectPath(ctx, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_SIZE, GRID_SIZE, 12);
  ctx.fill();

  // Subtle inner glow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, GRID_ORIGIN_X + 1, GRID_ORIGIN_Y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 11);
  ctx.stroke();
  ctx.restore();

  // Cell borders - visible and refined
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  for (let r = 1; r < n; r++) {
    const y = GRID_ORIGIN_Y + r * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(GRID_ORIGIN_X + 1, y);
    ctx.lineTo(GRID_ORIGIN_X + GRID_SIZE - 1, y);
    ctx.stroke();
  }
  for (let c = 1; c < n; c++) {
    const x = GRID_ORIGIN_X + c * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, GRID_ORIGIN_Y + 1);
    ctx.lineTo(x, GRID_ORIGIN_Y + GRID_SIZE - 1);
    ctx.stroke();
  }

  // Add subtle grid highlight on intersections for premium feel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      const x = GRID_ORIGIN_X + c * CELL_SIZE;
      const y = GRID_ORIGIN_Y + r * CELL_SIZE;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer border - premium double-stroke effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_SIZE, GRID_SIZE, 14);
  ctx.stroke();

  // Inner accent border for depth
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.08)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, GRID_ORIGIN_X + 2, GRID_ORIGIN_Y + 2, GRID_SIZE - 4, GRID_SIZE - 4, 12);
  ctx.stroke();
}

/**
 * Draw every pipe as a polyline through ALL cell centers in path.cells order.
 * This is the only correct rendering approach — never skip intermediate cells.
 */
export function drawPipes(ctx: CanvasRenderingContext2D, state: GameState, layout: BoardLayout) {
  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, CELL_SIZE } = layout;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const color of Object.keys(state.paths)) {
    const cells = state.paths[color].cells;
    if (cells.length === 0) continue;

    ctx.strokeStyle = PIPE_COLORS[color as PipeColorKey];
    ctx.lineWidth = CELL_SIZE * 0.42;

    if (cells.length === 1) {
      // Single-cell path (just the start dot) — draw a stub cap circle so the
      // endpoint dot isn't bare when the pipe has just been started
      const cx = GRID_ORIGIN_X + cells[0].col * CELL_SIZE + CELL_SIZE / 2;
      const cy = GRID_ORIGIN_Y + cells[0].row * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_SIZE * 0.21, 0, Math.PI * 2);
      ctx.fillStyle = PIPE_COLORS[color as PipeColorKey];
      ctx.fill();
      continue;
    }

    // ── Polyline through every cell center in order ────────────────────────
    ctx.beginPath();
    for (let i = 0; i < cells.length; i++) {
      const cx = GRID_ORIGIN_X + cells[i].col * CELL_SIZE + CELL_SIZE / 2;
      const cy = GRID_ORIGIN_Y + cells[i].row * CELL_SIZE + CELL_SIZE / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

/**
 * Draw endpoint dots on top of pipes so they are always visible.
 */
export function drawEndpoints(ctx: CanvasRenderingContext2D, state: GameState, layout: BoardLayout) {
  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, CELL_SIZE } = layout;
  for (const ep of state.level.endpoints) {
    const cx = GRID_ORIGIN_X + ep.col * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_ORIGIN_Y + ep.row * CELL_SIZE + CELL_SIZE / 2;
    const col = PIPE_COLORS[ep.color];

    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL_SIZE * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner highlight — drawn without shadow so it reads cleanly
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.arc(cx - CELL_SIZE * 0.07, cy - CELL_SIZE * 0.07, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw pulsing dashed-circle hint indicators.
 *
 * BUG FIX: The old code called ctx.setLineDash inside ctx.save/restore but did NOT
 * call ctx.setLineDash([]) to reset before ctx.restore(). Canvas state inside save()
 * blocks includes lineDash, so ctx.restore() DOES reset it — but only if save() was
 * called before setLineDash. The existing code called save() first then setLineDash,
 * so restore() should correctly undo it. However the `ctx.lineWidth = 3` was set
 * OUTSIDE the per-cell loop but inside save, and globalAlpha was set inside the loop
 * without being reset. Made all state assignments explicit inside save/restore scope.
 */
export function drawHintCells(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  cells: { row: number; col: number }[],
  color: PipeColorKey,
  now: number,
) {
  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, CELL_SIZE } = layout;
  const pulse = 0.45 + 0.45 * Math.sin(now / 280);
  const stroke = PIPE_COLORS[color];

  for (const c of cells) {
    const cx = GRID_ORIGIN_X + c.col * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_ORIGIN_Y + c.row * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, pulse));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -(now / 60) % 11; // animated march
    ctx.beginPath();
    ctx.arc(cx, cy, CELL_SIZE * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/**
 * Draw a pulsing circle at the current drag head.
 *
 * BUG FIX: When the head is sitting on an endpoint dot (drag just started or
 * is about to complete), drawing the head circle ON TOP of the endpoint dot
 * creates a visual artifact — the endpoint glow is partially covered by a
 * slightly transparent blob of the same color. Skip rendering when the head
 * is on any endpoint.
 */
export function drawActiveHead(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  layout: BoardLayout,
  now: number,
) {
  if (!state.activeColor || !state.activeHead) return;

  // Skip if the head is sitting on an endpoint dot
  if (getEndpointColorAt(state.level, state.activeHead)) return;

  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, CELL_SIZE } = layout;
  const h = state.activeHead;
  const cx = GRID_ORIGIN_X + h.col * CELL_SIZE + CELL_SIZE / 2;
  const cy = GRID_ORIGIN_Y + h.row * CELL_SIZE + CELL_SIZE / 2;
  const scale = 1 + Math.sin(now / 300) * 0.12;
  const col = PIPE_COLORS[state.activeColor];

  ctx.save();
  ctx.fillStyle = `${col}CC`;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL_SIZE * 0.28 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a subtle pulsing highlight on every empty cell when all pipes are
 * connected but the board is not yet 100% filled. This tells the player
 * "you haven't filled everything yet" without being harsh.
 */
export function drawEmptyCellsHint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  layout: BoardLayout,
  now: number,
) {
  // Only show when all pipes complete but board not fully filled
  const allComplete = Object.values(state.paths).every((p) => p.complete);
  if (!allComplete || state.filledPercent >= 100 || state.solved) return;

  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, CELL_SIZE } = layout;
  const n = state.level.size;

  // Slow, gentle pulse
  const alpha = 0.12 + 0.1 * Math.sin(now / 400);

  ctx.save();
  ctx.fillStyle = `rgba(248, 113, 113, ${alpha})`; // soft red
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (state.grid[r][c] === null) {
        const x = GRID_ORIGIN_X + c * CELL_SIZE + 2;
        const y = GRID_ORIGIN_Y + r * CELL_SIZE + 2;
        ctx.fillRect(x, y, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }
  }
  ctx.restore();
}

/**
 * White flash overlay clipped to the grid area only.
 *
 * FIX: Previously filled the entire canvas. Now clips to the grid rect so the
 * flash doesn't bleed into the HUD chrome around the board.
 */
export function drawSolveFlash(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  layout: BoardLayout,
  animProgress: number,
) {
  if (animProgress <= 0) return;
  const a = Math.sin(animProgress * Math.PI) * 0.38;
  if (a <= 0) return;
  const { GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_SIZE } = layout;
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillRect(GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_SIZE, GRID_SIZE);
  ctx.restore();
}
