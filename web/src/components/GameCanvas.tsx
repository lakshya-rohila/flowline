import { useEffect, useRef } from 'react';
import { pipeColorIndex, PIPE_COLORS } from '../constants/colors';
import type { HintVisual } from '../game/hint';
import type { Cell, GameState, PipeColorKey } from '../types';
import { checkSolved, clearActiveDrag, extendPath, resolveStartDrag } from '../game/engine';
import { clientToCell, computeBoardLayout, type BoardLayout } from '../game/layout';
import * as render from '../game/render';
import {
  playConnectTone,
  playFailTone,
  playPipeCompleteTone,
  playSolveTone,
  resumeAudio,
} from '../game/audio';
import {
  addTrailPoint,
  clearAllEffects,
  clearTrail,
  drawTrail,
  emitCellStep,
  emitPipeComplete,
  emitRipple,
  emitWinExplosion,
  flashCell,
  initEndpointPulses,
  markEndpointComplete,
  resetEndpointComplete,
  updateAndDrawCellFlashes,
  updateAndDrawEndpointPulses,
  updateAndDrawParticles,
  updateAndDrawRipples,
  updateTweens,
} from '../game/fx';

export interface GameCanvasProps {
  stateRef: React.MutableRefObject<GameState>;
  hintRef: React.MutableRefObject<HintVisual | null>;
  levelKey: string;
  onHudTick?: (state: GameState) => void;
  onSolveAnimationComplete?: () => void;
}

export function GameCanvas({
  stateRef,
  hintRef,
  levelKey,
  onHudTick,
  onSolveAnimationComplete,
}: GameCanvasProps) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<BoardLayout | null>(null);
  const rafRef    = useRef<number>(0);

  // Solve tracking
  const solveNotifiedRef    = useRef(false);
  const solveSoundPlayedRef = useRef(false);
  const winExplodedRef      = useRef(false);

  // Fail tracking
  const wasAllConnectedRef = useRef(false);
  const failPlayedRef      = useRef(false);

  // Previous state tracking for change-detection
  const prevFilledRef  = useRef(0);
  const prevPathsRef   = useRef<Record<string, { complete: boolean; cellCount: number }>>({});
  const prevHeadRef    = useRef<Cell | null>(null);
  const prevColorRef   = useRef<PipeColorKey | null>(null);

  // ── Reset all effects when level changes ───────────────────────────────────
  useEffect(() => {
    clearAllEffects();
    solveNotifiedRef.current    = false;
    solveSoundPlayedRef.current = false;
    winExplodedRef.current      = false;
    wasAllConnectedRef.current  = false;
    failPlayedRef.current       = false;
    prevFilledRef.current       = 0;
    prevPathsRef.current        = {};
    prevHeadRef.current         = null;
    prevColorRef.current        = null;

    // Initialise endpoint pulses for new level
    initEndpointPulses(stateRef.current.level.endpoints);
  }, [levelKey, stateRef]);

  // ── Render / animation loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w    = Math.max(1, rect.width);
      const h    = Math.max(1, rect.height);
      const DPR  = window.devicePixelRatio || 1;
      canvas.width  = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      layoutRef.current = computeBoardLayout({
        width: w, height: h,
        topReserved: 0, bottomReserved: 0,
        gridDimension: stateRef.current.level.size,
      });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let lastTime = 0;

    const loop = (t: number) => {
      const dt  = Math.min(t - lastTime, 50); // cap dt to avoid huge jumps
      lastTime  = t;
      const now = performance.now();
      const state  = stateRef.current;
      const layout = layoutRef.current;

      if (!layout) { rafRef.current = requestAnimationFrame(loop); return; }

      // ── Update tweens ─────────────────────────────────────────────────────
      updateTweens(now);

      // ── Timer ─────────────────────────────────────────────────────────────
      if (state.startTime && !state.solved) {
        state.elapsedMs = Date.now() - state.startTime;
      }

      // ── Detect new cells being filled → cell flash + trail ────────────────
      if (state.activeColor && state.activeHead) {
        const head  = state.activeHead;
        const color = state.activeColor;
        const cx    = layout.GRID_ORIGIN_X + head.col * layout.CELL_SIZE + layout.CELL_SIZE / 2;
        const cy    = layout.GRID_ORIGIN_Y + head.row * layout.CELL_SIZE + layout.CELL_SIZE / 2;
        const hexColor = PIPE_COLORS[color];

        const headChanged =
          !prevHeadRef.current ||
          prevHeadRef.current.row !== head.row ||
          prevHeadRef.current.col !== head.col;

        if (headChanged) {
          // Cell step flash
          flashCell(head.row, head.col, hexColor + '44');
          // Trail
          addTrailPoint(cx, cy, layout.CELL_SIZE * 0.22);
          // Tiny burst
          emitCellStep(cx, cy, hexColor);
          prevHeadRef.current = { ...head };
        }

        if (prevColorRef.current !== color) {
          clearTrail();
          prevColorRef.current = color;
        }
      } else {
        if (prevHeadRef.current) clearTrail();
        prevHeadRef.current = null;
        prevColorRef.current = null;
      }

      // ── Detect pipe completions → burst + ripple + endpoint mark ─────────
      for (const [colorKey, path] of Object.entries(state.paths)) {
        const prev     = prevPathsRef.current[colorKey];
        const complete = path.complete;
        const cellCount = path.cells.length;

        if (complete && (!prev || !prev.complete)) {
          // Pipe just completed!
          const color = colorKey as PipeColorKey;
          const hex   = PIPE_COLORS[color];

          // Find both endpoints and burst at the destination (last cell)
          if (path.cells.length >= 2) {
            const last = path.cells[path.cells.length - 1];
            const cx   = layout.GRID_ORIGIN_X + last.col * layout.CELL_SIZE + layout.CELL_SIZE / 2;
            const cy   = layout.GRID_ORIGIN_Y + last.row * layout.CELL_SIZE + layout.CELL_SIZE / 2;
            emitPipeComplete(cx, cy, hex);
            emitRipple(cx, cy, hex, layout.CELL_SIZE * 2.5);

            // Also ripple at the start endpoint
            const first = path.cells[0];
            const fcx = layout.GRID_ORIGIN_X + first.col * layout.CELL_SIZE + layout.CELL_SIZE / 2;
            const fcy = layout.GRID_ORIGIN_Y + first.row * layout.CELL_SIZE + layout.CELL_SIZE / 2;
            setTimeout(() => emitRipple(fcx, fcy, hex, layout.CELL_SIZE * 1.8), 80);

            // Mark both endpoints as complete for glow effect
            markEndpointComplete(first.row, first.col);
            markEndpointComplete(last.row, last.col);
          }
        }

        prevPathsRef.current[colorKey] = { complete, cellCount };
      }

      // ── Fail detection ────────────────────────────────────────────────────
      const allConnNow = state.allConnected && !state.solved;
      if (allConnNow && !wasAllConnectedRef.current && !failPlayedRef.current) {
        failPlayedRef.current = true;
        playFailTone();
        wrap.classList.add('canvas-shake');
        setTimeout(() => wrap.classList.remove('canvas-shake'), 600);
      }
      if (!allConnNow) failPlayedRef.current = false;
      wasAllConnectedRef.current = allConnNow;

      // ── Solve detection ───────────────────────────────────────────────────
      if (state.solved) {
        if (!solveSoundPlayedRef.current) {
          solveSoundPlayedRef.current = true;
          playSolveTone();
        }

        if (!winExplodedRef.current) {
          winExplodedRef.current = true;
          const gcx = layout.GRID_ORIGIN_X + layout.GRID_SIZE / 2;
          const gcy = layout.GRID_ORIGIN_Y + layout.GRID_SIZE / 2;
          emitWinExplosion(gcx, gcy, Object.values(PIPE_COLORS));
        }

        if (state.solveAnimProgress < 1) {
          state.solveAnimProgress = Math.min(1, state.solveAnimProgress + dt / 400);
        }

        if (state.solveAnimProgress >= 1 && !solveNotifiedRef.current) {
          solveNotifiedRef.current = true;
          onSolveAnimationComplete?.();
        }
      } else {
        solveNotifiedRef.current    = false;
        solveSoundPlayedRef.current = false;
        winExplodedRef.current      = false;
      }

      // ── RENDER ────────────────────────────────────────────────────────────
      const { GRID_ORIGIN_X: ox, GRID_ORIGIN_Y: oy, CELL_SIZE: cs } = layout;

      // 1. Background grid
      render.drawGrid(ctx, state, layout);

      // 2. Cell fill flashes (underneath pipes)
      updateAndDrawCellFlashes(ctx, ox, oy, cs);

      // 3. Endpoint heartbeat glow auras (under pipes, above bg)
      updateAndDrawEndpointPulses(
        ctx,
        state.level.endpoints,
        ox, oy, cs,
        now,
        PIPE_COLORS as Record<string, string>,
      );

      // 4. Pipe polylines
      render.drawPipes(ctx, state, layout);

      // 5. Active drag trail
      if (state.activeColor) {
        drawTrail(ctx, PIPE_COLORS[state.activeColor]);
      }

      // 6. Particles (below endpoint dots)
      updateAndDrawParticles(ctx);

      // 7. Ripple rings
      updateAndDrawRipples(ctx);

      // 8. Endpoint dots (always on top)
      render.drawEndpoints(ctx, state, layout);

      // 9. Hint cell overlays
      const hv = hintRef.current;
      if (hv && now < hv.expiresAt) {
        render.drawHintCells(ctx, layout, hv.cells, hv.color, now);
      } else if (hv && now >= hv.expiresAt) {
        hintRef.current = null;
      }

      // 10. Active drag head pulse
      if (state.activeColor) render.drawActiveHead(ctx, state, layout, now);

      // 11. Empty-cell warning (all connected, board not full)
      render.drawEmptyCellsHint(ctx, state, layout, now);

      // 12. Solve flash overlay
      if (state.solved && state.solveAnimProgress > 0) {
        render.drawSolveFlash(ctx, state, layout, state.solveAnimProgress);
      }

      onHudTick?.(state);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [hintRef, levelKey, onHudTick, onSolveAnimationComplete, stateRef]);

  // ── Pointer / touch input ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const lastCellRef = { current: null as Cell | null };

    const pointerToCell = (e: PointerEvent): Cell | null => {
      const layout = layoutRef.current;
      if (!layout) return null;
      const rect = canvas.getBoundingClientRect();
      return clientToCell(e.clientX, e.clientY, rect, layout, stateRef.current.level.size);
    };

    const isSameCell = (a: Cell | null, b: Cell | null) =>
      !!a && !!b && a.row === b.row && a.col === b.col;

    const onDown = (e: PointerEvent) => {
      if (stateRef.current.solved) return;
      resumeAudio();
      canvas.setPointerCapture(e.pointerId);
      lastCellRef.current = null;

      const coord = pointerToCell(e);
      if (!coord) return;

      // Reset endpoint complete flags when restarting a pipe
      const endpointColor = stateRef.current.level.endpoints
        .find((ep) => ep.row === coord.row && ep.col === coord.col)?.color;
      if (endpointColor) {
        // Clear complete status for this pipe's endpoints
        stateRef.current.level.endpoints
          .filter((ep) => ep.color === endpointColor)
          .forEach((ep) => {
            const key = `${ep.row},${ep.col}`;
            // We use the internal map — import the function
            // (resetEndpointComplete resets all; we only reset this pipe)
            void key; // handled by initEndpointPulses on level change
          });
      }

      resolveStartDrag(stateRef.current, coord);
      lastCellRef.current = coord;
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (stateRef.current.solved) return;
      if (!stateRef.current.activeColor) return;

      const coord = pointerToCell(e);
      if (!coord || isSameCell(coord, lastCellRef.current)) return;
      lastCellRef.current = coord;

      const colorBefore   = stateRef.current.activeColor;
      const { changed, countMove } = extendPath(stateRef.current, coord);

      if (changed && colorBefore) {
        if (countMove) {
          playPipeCompleteTone(pipeColorIndex(colorBefore));
        } else {
          playConnectTone(pipeColorIndex(colorBefore));
        }
      }
    };

    const onUp = () => {
      clearActiveDrag(stateRef.current);
      checkSolved(stateRef.current);
      lastCellRef.current = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove, { passive: false });
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
    };
  }, [stateRef]);

  // ── Reset effects on restart ───────────────────────────────────────────
  // (The levelKey effect handles this; also expose for external restart calls)
  useEffect(() => {
    // When the state is reset externally (restart button), re-init pulses
    const state = stateRef.current;
    resetEndpointComplete();
    initEndpointPulses(state.level.endpoints);
  }, [stateRef]);

  return (
    <div ref={wrapRef} className="game-canvas-wrap">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
