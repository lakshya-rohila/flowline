import { useEffect, useRef } from 'react';
import { pipeColorIndex } from '../constants/colors';
import type { HintVisual } from '../game/hint';
import type { Cell, GameState } from '../types';
import { checkSolved, clearActiveDrag, extendPath, resolveStartDrag } from '../game/engine';
import { clientToCell, computeBoardLayout, type BoardLayout } from '../game/layout';
import * as render from '../game/render';
import { playConnectTone, playSolveTone, resumeAudio } from '../game/audio';

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<BoardLayout | null>(null);
  const rafRef = useRef<number>(0);
  // Track whether we've already fired the solve notification for this level
  const solveNotifiedRef = useRef(false);
  const solveSoundPlayedRef = useRef(false);

  // ── Render / animation loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset solve tracking whenever the level changes
    solveNotifiedRef.current = false;
    solveSoundPlayedRef.current = false;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const DPR = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      layoutRef.current = computeBoardLayout({
        width: w,
        height: h,
        topReserved: 0,
        bottomReserved: 0,
        gridDimension: stateRef.current.level.size,
      });
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    resize();

    let lastTime = 0;
    const loop = (t: number) => {
      const dt = t - lastTime;
      lastTime = t;
      const state = stateRef.current;
      const layout = layoutRef.current;
      if (!layout) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Timer ──────────────────────────────────────────────────────────────
      if (state.startTime && !state.solved) {
        state.elapsedMs = Date.now() - state.startTime;
      }

      // ── Solve detection: react the moment state.solved flips to true ───────
      if (state.solved) {
        // Play sound once (immediately, don't wait for animation)
        if (!solveSoundPlayedRef.current) {
          solveSoundPlayedRef.current = true;
          playSolveTone();
        }

        // Advance solve flash animation 0→1 over 350ms
        if (state.solveAnimProgress < 1) {
          state.solveAnimProgress = Math.min(1, state.solveAnimProgress + dt / 350);
        }

        // Fire the overlay callback ONCE when animation completes
        if (state.solveAnimProgress >= 1 && !solveNotifiedRef.current) {
          solveNotifiedRef.current = true;
          onSolveAnimationComplete?.();
        }
      } else {
        // Not solved — reset tracking so it's ready for next solve
        solveNotifiedRef.current = false;
        solveSoundPlayedRef.current = false;
      }

      // ── Render order ───────────────────────────────────────────────────────
      const nowMs = performance.now();

      // 1. Grid background + cell borders
      render.drawGrid(ctx, state, layout);
      // 2. Pipe polylines (below endpoints)
      render.drawPipes(ctx, state, layout);
      // 3. Endpoint dots (always on top of pipes)
      render.drawEndpoints(ctx, state, layout);
      // 4. Hint cell overlays
      const hv = hintRef.current;
      if (hv && nowMs < hv.expiresAt) {
        render.drawHintCells(ctx, layout, hv.cells, hv.color, nowMs);
      } else if (hv && nowMs >= hv.expiresAt) {
        hintRef.current = null;
      }
      // 5. Active drag head pulse
      if (state.activeColor) render.drawActiveHead(ctx, state, layout, nowMs);
      // 6. Empty-cell warning when all pipes connected but board not full
      render.drawEmptyCellsHint(ctx, state, layout, nowMs);
      // 7. Solve flash overlay
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

    const isSameCell = (a: Cell | null, b: Cell | null): boolean => {
      if (!a || !b) return false;
      return a.row === b.row && a.col === b.col;
    };

    const onDown = (e: PointerEvent) => {
      if (stateRef.current.solved) return;
      resumeAudio();
      canvas.setPointerCapture(e.pointerId);
      lastCellRef.current = null;

      const coord = pointerToCell(e);
      if (!coord) return;

      resolveStartDrag(stateRef.current, coord);
      lastCellRef.current = coord;
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (stateRef.current.solved) return;
      if (!stateRef.current.activeColor) return;

      const coord = pointerToCell(e);
      if (!coord) return;
      if (isSameCell(coord, lastCellRef.current)) return;
      lastCellRef.current = coord;

      const colorBefore = stateRef.current.activeColor;
      const { changed } = extendPath(stateRef.current, coord);

      if (changed && colorBefore) {
        playConnectTone(pipeColorIndex(colorBefore));
      }
    };

    const onUp = () => {
      clearActiveDrag(stateRef.current);
      // Run a final solve check in case the last cell was placed
      // and we finger-lifted before the next pointermove fired
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

  return (
    <div ref={wrapRef} className="game-canvas-wrap">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
