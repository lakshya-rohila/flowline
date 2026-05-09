import { useEffect, useRef, useState } from 'react';
import { getLevelRecord } from '../game/storage';
import type { LevelConfig } from '../types';

// ── Pipe colors for confetti ──────────────────────────────────────────────────
const BURST_COLORS = [
  '#FF3B3B','#2ECC71','#3B9EFF','#FFD700',
  '#FF8C00','#A855F7','#FF69B4','#00CED1',
];

// ── Particle types ────────────────────────────────────────────────────────────
type ParticleShape = 'rect' | 'circle' | 'star' | 'pipe';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rot: number; rotV: number;
  shape: ParticleShape;
  life: number; decay: number;
  wobble: number; wobbleSpeed: number;
}

// ── Full-screen confetti canvas ───────────────────────────────────────────────

function ConfettiCanvas({ active, stars }: { active: boolean; stars: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const psRef     = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) { psRef.current = []; return; }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    // Burst count scales with stars
    const COUNT = stars === 3 ? 160 : stars === 2 ? 100 : 60;

    // Spawn from multiple origins for a fuller effect
    const origins = [
      { x: W * 0.2, y: -20 },
      { x: W * 0.5, y: -20 },
      { x: W * 0.8, y: -20 },
      { x: -20,     y: H * 0.3 },
      { x: W + 20,  y: H * 0.3 },
    ];

    const shapes: ParticleShape[] = ['rect', 'rect', 'circle', 'star', 'pipe'];

    psRef.current = Array.from({ length: COUNT }, (_, i) => {
      const orig  = origins[i % origins.length];
      const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      const angle = (Math.random() * 120 + 30) * (Math.PI / 180); // downward spread
      const speed = 4 + Math.random() * 8;
      const dir   = orig.x < 0 ? 1 : orig.x > W ? -1 : (Math.random() - 0.5) * 2;
      return {
        x: orig.x + (Math.random() - 0.5) * 60,
        y: orig.y,
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed,
        color,
        size: 5 + Math.random() * 9,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.18,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        life: 1,
        decay: 0.005 + Math.random() * 0.007,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.05,
      };
    });

    function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
      const pts = 5;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const a = (Math.PI / pts) * i - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
        else ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
    }

    let lastT = 0;
    function loop(t: number) {
      const dt = Math.min((t - lastT) / 16, 3);
      lastT = t;
      ctx.clearRect(0, 0, W, H);

      psRef.current = psRef.current.filter((p) => p.life > 0);

      for (const p of psRef.current) {
        p.wobble += p.wobbleSpeed * dt;
        p.x  += (p.vx + Math.sin(p.wobble) * 0.8) * dt;
        p.y  += p.vy * dt;
        p.vy += 0.18 * dt; // gravity
        p.vx *= 0.992;
        p.rot += p.rotV * dt;
        p.life -= p.decay * dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 4;

        switch (p.shape) {
          case 'rect':
            ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.55);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'star':
            drawStar(ctx, 0, 0, p.size / 2);
            break;
          case 'pipe':
            // Mini pipe segment — a rounded rect
            ctx.beginPath();
            ctx.roundRect(-p.size / 2, -p.size / 4.5, p.size, p.size / 2.5, 3);
            ctx.fill();
            break;
        }
        ctx.restore();
      }

      if (psRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ctx.clearRect(0, 0, W, H); };
  }, [active, stars]);

  return (
    <canvas
      ref={canvasRef}
      className="win-confetti"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 195, width: '100%', height: '100%' }}
      aria-hidden
    />
  );
}

// ── Stars animation ───────────────────────────────────────────────────────────

function AnimatedStars({ count }: { count: number }) {
  return (
    <div className="win-stars" aria-label={`${count} out of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`win-star ${i <= count ? 'win-star--on' : 'win-star--dim'}`}
          style={{ animationDelay: `${0.3 + (i - 1) * 0.18}s` }}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Coin badge ────────────────────────────────────────────────────────────────

function CoinBadge({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <div className="win-coins" aria-label={`Earned ${amount} coins`}>
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22" aria-hidden>
        <circle cx="11" cy="11" r="10" fill="#FFD700" stroke="#B8860B" strokeWidth="1.4"/>
        <text x="11" y="15.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7B5200">₣</text>
      </svg>
      <span className="win-coins__label">+{amount}</span>
      <span className="win-coins__sub">coins earned</span>
    </div>
  );
}

// ── Main SolveSheet ───────────────────────────────────────────────────────────

export interface SolveSheetProps {
  open: boolean;
  level: LevelConfig;
  moves: number;
  elapsedMs: number;
  coinsEarned?: number;
  stars?: number;
  onNext: () => void;
  onMenu: () => void;
}

export function SolveSheet({
  open, level, moves, elapsedMs,
  coinsEarned = 0, stars = 1,
  onNext, onMenu,
}: SolveSheetProps) {
  const [mounted,  setMounted]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two-frame delay → triggers CSS spring transition
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setVisible(true);
          // Confetti fires 120ms after sheet starts rising
          setTimeout(() => setConfetti(true), 120);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setVisible(false);
      setConfetti(false);
      const t = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  const prev      = getLevelRecord(level.id);
  const s         = Math.floor(elapsedMs / 1000);
  const timeStr   = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isBest    = !prev || moves <= prev.moves;

  const starLabels = ['', '⭐', '⭐⭐', '⭐⭐⭐'];
  const headings   = ['', 'GOOD JOB', 'GREAT!', 'PERFECT!'];
  const colors     = ['', '#FFD700', '#2ECC71', '#5EEAD4'];

  return (
    <>
      {/* Full-screen confetti */}
      <ConfettiCanvas active={confetti} stars={stars} />

      {/* Backdrop */}
      <div
        className={`win-backdrop ${visible ? 'win-backdrop--in' : ''}`}
        onClick={onMenu}
        aria-hidden
      />

      {/* Bottom sheet */}
      <div
        className={`win-sheet ${visible ? 'win-sheet--in' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Level complete"
        style={{ '--win-accent': colors[stars] } as React.CSSProperties}
      >
        {/* Drag handle */}
        <div className="win-handle" aria-hidden />

        {/* Glowing top border accent */}
        <div className="win-accent-line" aria-hidden />

        {/* ── Trophy / heading ── */}
        <div className="win-heading-row">
          <div className="win-trophy" aria-hidden>
            {stars === 3 ? '🏆' : stars === 2 ? '🥈' : '🥉'}
          </div>
          <div>
            <p className="win-eyebrow">{starLabels[stars]}</p>
            <h2 className="win-title" style={{ color: colors[stars] }}>
              {headings[stars]}
            </h2>
          </div>
        </div>

        {/* Stars */}
        <AnimatedStars count={stars} />

        {/* Coin reward */}
        {coinsEarned > 0 && (
          <CoinBadge amount={coinsEarned} />
        )}

        {/* Stats grid */}
        <div className="win-stats">
          <div className="win-stat">
            <span className="win-stat__label">MOVES</span>
            <span className="win-stat__val">{moves}</span>
            {isBest && <span className="win-stat__badge">BEST</span>}
          </div>
          <div className="win-stat">
            <span className="win-stat__label">TIME</span>
            <span className="win-stat__val">{timeStr}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat__label">OPTIMAL</span>
            <span className="win-stat__val">{level.optimalMoves}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="win-actions">
          <button
            type="button"
            className="win-btn win-btn--primary"
            onClick={onNext}
          >
            NEXT LEVEL →
          </button>
          <button
            type="button"
            className="win-btn win-btn--ghost"
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
