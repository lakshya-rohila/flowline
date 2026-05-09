import { useEffect, useRef, useState } from 'react';
import logoHorizontal from '../assets/game-assets/flowline-logo-horizontal.svg';
import neonPanel from '../assets/game-assets/flowline-neon-bg-panel.png';

interface Props {
  onPlay: () => void;
  onHowToPlay: () => void;
}

// ── Animated canvas: pipes drawing themselves across a mini 5×5 grid ─────────

interface PipePath {
  color: string;
  cells: [number, number][];
}

// Verified non-overlapping 5×5 board (all 25 cells, all paths orthogonally connected)
// Grid layout:
//  row0: R  R  R  R  R
//  row1: B  G  G  G  R
//  row2: B  G  Y  Y  R
//  row3: B  G  Y  O  R
//  row4: B  B  O  O  R
const FINAL_PATHS: PipePath[] = [
  {
    color: '#FF3B3B', // red: top row → right column
    cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],
  },
  {
    color: '#3B9EFF', // blue: left column → bottom
    cells: [[1,0],[2,0],[3,0],[4,0],[4,1]],
  },
  {
    color: '#2ECC71', // green: row-1 right → down-left snake
    cells: [[1,3],[1,2],[1,1],[2,1],[3,1]],
  },
  {
    color: '#FFD700', // yellow: middle block
    cells: [[2,3],[2,2],[3,2]],
  },
  {
    color: '#FF8C00', // orange: bottom-right corner
    cells: [[3,3],[4,3],[4,2]],
  },
];



function AnimatedBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE = 220;
    canvas.width  = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width  = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    const N    = 5;
    const PAD  = 12;
    const cell = (SIZE - PAD * 2) / N;

    function cc(r: number, c: number): [number, number] {
      return [PAD + c * cell + cell / 2, PAD + r * cell + cell / 2];
    }

    const totalCells = FINAL_PATHS.reduce((s, p) => s + p.cells.length, 0);

    function draw(elapsed: number) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Grid background ────────────────────────────────────────────────
      ctx.fillStyle = '#101018';
      ctx.beginPath();
      ctx.roundRect(PAD / 2, PAD / 2, SIZE - PAD, SIZE - PAD, 12);
      ctx.fill();

      ctx.strokeStyle = '#1c1c2a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        const x = PAD + i * cell;
        const y = PAD + i * cell;
        ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, PAD + N * cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + N * cell, y); ctx.stroke();
      }

      // ── Animate path drawing ───────────────────────────────────────────
      // Loop: 2.8s draw + 0.8s pause
      const DRAW_MS  = 2800;
      const PAUSE_MS = 800;
      const CYCLE    = DRAW_MS + PAUSE_MS;
      const t        = elapsed % CYCLE;
      const progress = Math.min(t / DRAW_MS, 1) * totalCells;

      let drawn = 0;
      for (const path of FINAL_PATHS) {
        const pathProg = Math.max(0, Math.min(path.cells.length, progress - drawn));
        drawn += path.cells.length;
        if (pathProg < 0.01) continue;

        ctx.strokeStyle = path.color;
        ctx.lineWidth   = cell * 0.42;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.shadowColor = path.color;
        ctx.shadowBlur  = 6;

        const whole = Math.floor(pathProg);
        const frac  = pathProg - whole;

        ctx.beginPath();
        for (let i = 0; i < Math.min(whole, path.cells.length); i++) {
          const [x, y] = cc(path.cells[i][0], path.cells[i][1]);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        if (whole > 0 && whole < path.cells.length && frac > 0) {
          const [x1, y1] = cc(path.cells[whole - 1][0], path.cells[whole - 1][1]);
          const [x2, y2] = cc(path.cells[whole][0],     path.cells[whole][1]);
          ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── Endpoint dots (always visible) ────────────────────────────────
      for (const path of FINAL_PATHS) {
        for (let ei = 0; ei < 2; ei++) {
          const cell_idx = ei === 0 ? 0 : path.cells.length - 1;
          const [r, c]   = path.cells[cell_idx];
          const [x, y]   = cc(r, c);
          const rad       = cell * 0.31;

          // Glow
          const grd = ctx.createRadialGradient(x, y, 0, x, y, rad * 2);
          grd.addColorStop(0, path.color + '55');
          grd.addColorStop(1, path.color + '00');
          ctx.beginPath(); ctx.arc(x, y, rad * 2, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();

          // Dot
          ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fillStyle = path.color; ctx.fill();

          // Specular
          ctx.beginPath();
          ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
        }
      }
    }

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      draw(ts - start);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} className="splash-board" aria-hidden />;
}

// ── Main splash screen ────────────────────────────────────────────────────────

export function LandingScreen({ onPlay, onHowToPlay }: Props) {
  const [phase, setPhase] = useState(0);
  // phase 0 = hidden, 1 = logo in, 2 = board in, 3 = pills in, 4 = CTA in

  useEffect(() => {
    // Stagger each section with a short delay for a cinematic entrance
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 420),
      setTimeout(() => setPhase(3), 750),
      setTimeout(() => setPhase(4), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="splash"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(7,7,12,.55) 0%, rgba(7,7,12,.97) 100%), url(${neonPanel})` }}
    >
      {/* Ambient blobs */}
      <div className="splash-blob splash-blob--tl" aria-hidden />
      <div className="splash-blob splash-blob--br" aria-hidden />

      <div className="splash-inner">

        {/* ── Logo ── */}
        <div className={`splash-logo-wrap splash-enter ${phase >= 1 ? 'splash-enter--in' : ''}`}>
          <img src={logoHorizontal} alt="FLOWLINE" className="splash-logo" />
          <p className="splash-tagline">connect · fill · solve</p>
        </div>

        {/* ── Animated board ── */}
        <div className={`splash-board-wrap splash-enter ${phase >= 2 ? 'splash-enter--in' : ''}`}
             style={{ transitionDelay: '0.05s' }}>
          <AnimatedBoard />
        </div>

        {/* ── Pills ── */}
        <div className={`splash-pills splash-enter ${phase >= 3 ? 'splash-enter--in' : ''}`}
             style={{ transitionDelay: '0.04s' }}>
          {['12 pipe colors', 'BFS hints', 'Undo anytime', 'Best scores'].map((p) => (
            <span key={p} className="splash-pill">{p}</span>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className={`splash-cta splash-enter ${phase >= 4 ? 'splash-enter--in' : ''}`}
             style={{ transitionDelay: '0.06s' }}>
          <button
            type="button"
            className="splash-btn splash-btn--primary"
            onClick={onPlay}
          >
            PLAY NOW
          </button>
          <button
            type="button"
            className="splash-btn splash-btn--ghost"
            onClick={onHowToPlay}
          >
            HOW TO PLAY
          </button>
        </div>

      </div>
    </div>
  );
}
