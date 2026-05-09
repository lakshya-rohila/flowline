import { useEffect, useRef, useState } from 'react';

interface Props {
  onPlay: () => void;
  onHowToPlay: () => void;
}

// Animated mini-grid demo — draws a small solved board to show off the game
function MiniBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio ?? 1, 3);
    const SIZE = 200;
    canvas.width = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    const GRID = 5;
    const PAD = 10;
    const cellSize = (SIZE - PAD * 2) / GRID;

    // Non-overlapping 5×5 board paths
    const BOARD_PATHS: Array<{
      color: string;
      dots: [[number, number], [number, number]];
      cells: [number, number][];
    }> = [
      {
        color: '#FF3B3B',
        dots: [
          [0, 0],
          [4, 4],
        ],
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
          [0, 4],
          [1, 4],
          [2, 4],
          [3, 4],
          [4, 4],
        ],
      },
      {
        color: '#3B9EFF',
        dots: [
          [1, 0],
          [3, 0],
        ],
        cells: [
          [1, 0],
          [2, 0],
          [3, 0],
        ],
      },
      {
        color: '#2ECC71',
        dots: [
          [1, 1],
          [4, 0],
        ],
        cells: [
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [4, 0],
        ],
      },
      {
        color: '#FFD700',
        dots: [
          [1, 2],
          [4, 3],
        ],
        cells: [
          [1, 2],
          [1, 3],
          [2, 3],
          [3, 3],
          [4, 3],
        ],
      },
      {
        color: '#FF8C00',
        dots: [
          [2, 2],
          [4, 2],
        ],
        cells: [
          [2, 2],
          [3, 2],
          [4, 2],
        ],
      },
    ];

    function cellCenter(r: number, c: number): [number, number] {
      return [PAD + c * cellSize + cellSize / 2, PAD + r * cellSize + cellSize / 2];
    }

    function drawFrame(t: number) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Background
      ctx.fillStyle = '#101018';
      const R = 12;
      ctx.beginPath();
      ctx.roundRect(PAD / 2, PAD / 2, SIZE - PAD, SIZE - PAD, R);
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = '#1c1c2a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID; i++) {
        const x = PAD + i * cellSize;
        const y = PAD + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, PAD);
        ctx.lineTo(x, PAD + GRID * cellSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(PAD + GRID * cellSize, y);
        ctx.stroke();
      }

      // Animate: draw paths progressively
      const ANIM_DURATION = 2200;
      const PAUSE = 800;
      const totalCells = BOARD_PATHS.reduce((s, p) => s + p.cells.length, 0);
      const progress = ((t % (ANIM_DURATION + PAUSE)) / ANIM_DURATION) * totalCells;

      let drawn = 0;
      for (const path of BOARD_PATHS) {
        const pathProgress = Math.max(0, Math.min(path.cells.length, progress - drawn));
        drawn += path.cells.length;

        if (pathProgress < 1) continue;

        ctx.strokeStyle = path.color;
        ctx.lineWidth = cellSize * 0.38;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawCount = Math.floor(pathProgress);
        const subFrac = pathProgress - drawCount;

        ctx.beginPath();
        for (let i = 0; i < drawCount && i < path.cells.length; i++) {
          const [cr, cc] = path.cells[i];
          const [x, y] = cellCenter(cr, cc);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Smooth last segment interpolation
        if (drawCount < path.cells.length && subFrac > 0) {
          const [r1, c1] = path.cells[drawCount - 1];
          const [r2, c2] = path.cells[drawCount];
          const [x1, y1] = cellCenter(r1, c1);
          const [x2, y2] = cellCenter(r2, c2);
          ctx.lineTo(x1 + (x2 - x1) * subFrac, y1 + (y2 - y1) * subFrac);
        }
        ctx.stroke();
      }

      // Draw endpoints (always visible)
      for (const path of BOARD_PATHS) {
        for (const [r, c] of path.dots) {
          const [x, y] = cellCenter(r, c);
          const rad = cellSize * 0.3;

          // Glow
          const grd = ctx.createRadialGradient(x, y, 0, x, y, rad * 1.8);
          grd.addColorStop(0, path.color + '55');
          grd.addColorStop(1, path.color + '00');
          ctx.beginPath();
          ctx.arc(x, y, rad * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Dot
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fillStyle = path.color;
          ctx.fill();

          // Highlight
          ctx.beginPath();
          ctx.arc(x - rad * 0.28, y - rad * 0.28, rad * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fill();
        }
      }
    }

    function loop(ts: number) {
      if (!startRef.current) startRef.current = ts;
      drawFrame(ts - startRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} className="landing-mini-board" aria-hidden />;
}

export function LandingScreen({ onPlay, onHowToPlay }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay to trigger CSS entrance animation
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`landing ${visible ? 'landing--visible' : ''}`}>
      {/* Background glow blobs */}
      <div className="landing-blob landing-blob--a" aria-hidden />
      <div className="landing-blob landing-blob--b" aria-hidden />

      <div className="landing-inner">
        {/* Logo */}
        <div className="landing-logo-wrap">
          <span className="landing-logo">FLOWLINE</span>
          <span className="landing-logo-sub">PUZZLE</span>
        </div>

        {/* Mini animated board */}
        <div className="landing-board-wrap">
          <MiniBoard />
          <div className="landing-board-caption">connect · fill · solve</div>
        </div>

        {/* Feature pills */}
        <div className="landing-pills">
          <span className="landing-pill">12 colors</span>
          <span className="landing-pill">BFS hints</span>
          <span className="landing-pill">Undo / Redo</span>
          <span className="landing-pill">Best scores</span>
        </div>

        {/* CTA */}
        <div className="landing-cta">
          <button type="button" className="landing-btn landing-btn--primary" onClick={onPlay}>
            PLAY NOW
          </button>
          <button type="button" className="landing-btn landing-btn--ghost" onClick={onHowToPlay}>
            HOW TO PLAY
          </button>
        </div>
      </div>
    </div>
  );
}
