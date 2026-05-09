import { useEffect, useRef, useState } from 'react';
import { getLevelRecord } from '../game/storage';
import type { LevelConfig } from '../types';

// ── Confetti particle canvas ──────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#FF3B3B', '#2ECC71', '#3B9EFF', '#FFD700',
  '#FF8C00', '#9B59B6', '#FF69B4', '#00CED1',
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  rotV: number;
  shape: 'rect' | 'circle';
  life: number; // 1→0
  decay: number;
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    // Spawn burst of confetti from top
    const COUNT = 80;
    particlesRef.current = Array.from({ length: COUNT }, () => {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      return {
        x: W * 0.1 + Math.random() * W * 0.8,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 5,
        color,
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        shape: Math.random() < 0.6 ? 'rect' : 'circle',
        life: 1,
        decay: 0.008 + Math.random() * 0.006,
      };
    });

    let lastT = 0;
    function loop(t: number) {
      const dt = Math.min((t - lastT) / 16, 3);
      lastT = t;
      ctx.clearRect(0, 0, W, H);

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.15 * dt; // gravity
        p.vx *= 0.99;
        p.rot += p.rotV * dt;
        p.life -= p.decay * dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="solve-sheet__confetti" aria-hidden />;
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ moves, optimal }: { moves: number; optimal: number }) {
  const stars = moves <= optimal ? 3 : moves <= Math.ceil(optimal * 1.5) ? 2 : 1;
  return (
    <div className="solve-sheet__stars" aria-label={`${stars} out of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`solve-sheet__star ${i <= stars ? 'solve-sheet__star--on' : 'solve-sheet__star--off'}`}
          style={{ animationDelay: `${(i - 1) * 0.12}s` }}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="solve-sheet__stat">
      <span className="solve-sheet__stat-label">{label}</span>
      <span className="solve-sheet__stat-value">
        {value}
        {sub && <span className="solve-sheet__stat-sub"> {sub}</span>}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface SolveSheetProps {
  open: boolean;
  level: LevelConfig;
  moves: number;
  elapsedMs: number;
  onNext: () => void;
  onMenu: () => void;
}

export function SolveSheet({ open, level, moves, elapsedMs, onNext, onMenu }: SolveSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Mount first, then trigger visible (CSS transition)
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two rAF delay to let mount complete before animation
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 420);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  const prev = getLevelRecord(level.id);
  const s = Math.floor(elapsedMs / 1000);
  const timeStr = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isBestMoves = !prev || moves <= prev.moves;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`solve-sheet__backdrop ${visible ? 'solve-sheet__backdrop--visible' : ''}`}
        onClick={onMenu}
        aria-hidden
      />

      {/* Confetti (rendered over everything) */}
      <div className="solve-sheet__confetti-wrap" aria-hidden>
        <ConfettiCanvas active={visible} />
      </div>

      {/* Bottom sheet */}
      <div
        className={`solve-sheet ${visible ? 'solve-sheet--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Level complete"
      >
        {/* Drag handle */}
        <div className="solve-sheet__handle" aria-hidden />

        {/* Header */}
        <div className="solve-sheet__header">
          <div className="solve-sheet__badge">SOLVED</div>
          <StarRating moves={moves} optimal={level.optimalMoves} />
        </div>

        {/* Stats */}
        <div className="solve-sheet__stats">
          <StatRow
            label="MOVES"
            value={String(moves)}
            sub={isBestMoves ? '· new best!' : prev ? `· best ${prev.moves}` : undefined}
          />
          <StatRow label="TIME" value={timeStr} />
          <StatRow label="OPTIMAL" value={String(level.optimalMoves)} />
        </div>

        {/* Actions */}
        <div className="solve-sheet__actions">
          <button
            type="button"
            className="solve-sheet__btn solve-sheet__btn--primary"
            onClick={onNext}
          >
            NEXT LEVEL
          </button>
          <button
            type="button"
            className="solve-sheet__btn solve-sheet__btn--ghost"
            onClick={onMenu}
          >
            MENU
          </button>
        </div>

        {/* Safe area spacer */}
        <div className="solve-sheet__safe" />
      </div>
    </>
  );
}
