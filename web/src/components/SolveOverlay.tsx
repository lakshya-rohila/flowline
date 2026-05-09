import { getLevelRecord } from '../game/storage';
import type { LevelConfig } from '../types';

function starLabel(moves: number, optimal: number): string {
  if (moves <= optimal) return '★ ★ ★';
  if (moves <= Math.ceil(optimal * 1.45)) return '★ ★ ☆';
  return '★ ☆ ☆';
}

export interface SolveOverlayProps {
  open: boolean;
  level: LevelConfig;
  moves: number;
  elapsedMs: number;
  onNext: () => void;
  onMenu: () => void;
}

export function SolveOverlay({ open, level, moves, elapsedMs, onNext, onMenu }: SolveOverlayProps) {
  if (!open) return null;

  const prev = getLevelRecord(level.id);
  const s = Math.floor(elapsedMs / 1000);

  return (
    <div className="solve-overlay" role="dialog" aria-modal="true" aria-label="Level complete">
      <div className="solve-card">
        <div className="solve-stars">{starLabel(moves, level.optimalMoves)}</div>
        <div className="solve-heading">SOLVED</div>
        <div className="solve-stats">
          <div>
            MOVES: {moves}
            {prev && prev.moves !== moves ? (
              <span className="solve-stats__sub"> · best {prev.moves}</span>
            ) : null}
          </div>
          <div>
            TIME: {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
          </div>
        </div>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          NEXT LEVEL
        </button>
        <button type="button" className="btn btn--ghost" onClick={onMenu}>
          MENU
        </button>
      </div>
    </div>
  );
}
