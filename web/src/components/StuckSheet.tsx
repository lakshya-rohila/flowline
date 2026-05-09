import { useEffect, useState } from 'react';

export interface StuckSheetProps {
  open: boolean;
  moves: number;
  filledPercent: number;
  onTryAgain: () => void;
  onMenu: () => void;
}

export function StuckSheet({ open, moves, filledPercent, onTryAgain, onMenu }: StuckSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`stuck-backdrop ${visible ? 'stuck-backdrop--in' : ''}`}
        onClick={onMenu}
        aria-hidden
      />

      {/* Bottom sheet */}
      <div
        className={`stuck-sheet ${visible ? 'stuck-sheet--in' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Puzzle stuck"
      >
        {/* Drag handle */}
        <div className="stuck-handle" aria-hidden />

        {/* Icon */}
        <div className="stuck-icon" aria-hidden>
          <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
            <circle cx="32" cy="32" r="28" stroke="#FF8C00" strokeWidth="3" strokeDasharray="4 4"/>
            <path d="M32 20v16M32 44v2" stroke="#FF8C00" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Heading */}
        <h2 className="stuck-title">Stuck?</h2>
        <p className="stuck-desc">
          All pipes are connected, but you need to fill every cell on the board!
        </p>

        {/* Stats */}
        <div className="stuck-stats">
          <div className="stuck-stat">
            <span className="stuck-stat-label">FILLED</span>
            <span className="stuck-stat-value">{filledPercent}%</span>
          </div>
          <div className="stuck-stat">
            <span className="stuck-stat-label">MOVES</span>
            <span className="stuck-stat-value">{moves}</span>
          </div>
        </div>

        {/* Hint box */}
        <div className="stuck-hint">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16" aria-hidden>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 7v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="8" cy="4.5" r="0.8" fill="currentColor"/>
          </svg>
          <span>Try different paths to maximize board coverage</span>
        </div>

        {/* Actions */}
        <div className="stuck-actions">
          <button
            type="button"
            className="stuck-btn stuck-btn--primary"
            onClick={onTryAgain}
          >
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
              <path d="M3 10a7 7 0 1 0 1-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TRY AGAIN
          </button>
          <button
            type="button"
            className="stuck-btn stuck-btn--ghost"
            onClick={onMenu}
          >
            MENU
          </button>
        </div>

        {/* Safe area */}
        <div style={{ height: 'max(12px, env(safe-area-inset-bottom, 0))' }} />
      </div>
    </>
  );
}
