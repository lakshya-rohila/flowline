/**
 * fx.ts — Canvas 2D visual effects engine
 *
 * This replaces what you'd get from Phaser's particle system, tweens, and
 * scene effects — implemented directly in Canvas 2D for zero bundle overhead.
 *
 * Provides:
 *   - Particle system (tap-burst, pipe-complete burst, win explosion, sparks)
 *   - Tween runner (eased property animations)
 *   - Endpoint heartbeat pulse
 *   - Pipe-complete radial ripple
 *   - Active-drag head trail
 *   - Cell fill flash
 */

// ── Easing functions ──────────────────────────────────────────────────────────

export const ease = {
  outCubic:  (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart:  (t: number) => 1 - Math.pow(1 - t, 4),
  outBounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1)       return n1*t*t;
    if (t < 2/d1)       return n1*(t -= 1.5/d1)*t + 0.75;
    if (t < 2.5/d1)     return n1*(t -= 2.25/d1)*t + 0.9375;
    return n1*(t -= 2.625/d1)*t + 0.984375;
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2*Math.PI) / 3) + 1;
  },
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// ── Tween system ──────────────────────────────────────────────────────────────

interface Tween {
  id: number;
  start: number;       // performance.now()
  duration: number;    // ms
  from: number;
  to: number;
  easeFn: (t: number) => number;
  onUpdate: (v: number) => void;
  onComplete?: () => void;
  dead: boolean;
}

let _tweenId = 0;
const _tweens: Tween[] = [];

export function tween(
  from: number, to: number, duration: number,
  onUpdate: (v: number) => void,
  easeFn: (t: number) => number = ease.outCubic,
  onComplete?: () => void,
): number {
  const id = ++_tweenId;
  _tweens.push({ id, start: performance.now(), duration, from, to, easeFn, onUpdate, onComplete, dead: false });
  return id;
}

export function killTween(id: number): void {
  const t = _tweens.find((t) => t.id === id);
  if (t) t.dead = true;
}

export function updateTweens(now: number): void {
  for (let i = _tweens.length - 1; i >= 0; i--) {
    const t = _tweens[i];
    if (t.dead) { _tweens.splice(i, 1); continue; }
    const elapsed = now - t.start;
    const progress = Math.min(1, elapsed / t.duration);
    const v = t.from + (t.to - t.from) * t.easeFn(progress);
    t.onUpdate(v);
    if (progress >= 1) {
      t.onComplete?.();
      t.dead = true;
      _tweens.splice(i, 1);
    }
  }
}

// ── Particle system ───────────────────────────────────────────────────────────

type ParticleShape = 'circle' | 'rect' | 'star' | 'ring';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;       // acceleration (gravity, drag)
  color: string;
  alpha: number;
  alphaDecay: number;
  size: number;
  sizeDecay: number;
  rotation: number;
  rotSpeed: number;
  shape: ParticleShape;
  life: number;                 // 0→1
  lifeSpeed: number;
  blur: number;
}

const _particles: Particle[] = [];

function addParticle(p: Partial<Particle> & { x: number; y: number; color: string }): void {
  _particles.push({
    vx: 0, vy: 0, ax: 0, ay: 0.3,
    alpha: 1, alphaDecay: 0.02,
    size: 4, sizeDecay: 0,
    rotation: 0, rotSpeed: 0,
    shape: 'circle',
    life: 0, lifeSpeed: 0.025,
    blur: 0,
    ...p,
  });
}

export function updateAndDrawParticles(ctx: CanvasRenderingContext2D): void {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.life += p.lifeSpeed;
    if (p.life >= 1) { _particles.splice(i, 1); continue; }

    p.vx += p.ax;
    p.vy += p.ay;
    p.x  += p.vx;
    p.y  += p.vy;
    p.rotation += p.rotSpeed;
    p.size = Math.max(0, p.size - p.sizeDecay);
    p.alpha = Math.max(0, p.alpha - p.alphaDecay);

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (p.blur > 0) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = p.blur;
    }

    switch (p.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'rect':
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        break;
      case 'star': {
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a1 = (Math.PI * 2 * j) / 5 - Math.PI / 2;
          const a2 = a1 + Math.PI / 5;
          if (j === 0) ctx.moveTo(Math.cos(a1)*p.size, Math.sin(a1)*p.size);
          else         ctx.lineTo(Math.cos(a1)*p.size, Math.sin(a1)*p.size);
          ctx.lineTo(Math.cos(a2)*p.size*0.4, Math.sin(a2)*p.size*0.4);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'ring':
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

// ── Burst emitters ────────────────────────────────────────────────────────────

/** Small pop when the drag head enters a new cell */
export function emitCellStep(cx: number, cy: number, color: string): void {
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 1.2;
    addParticle({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ay: 0.06,
      color,
      alpha: 0.7,
      alphaDecay: 0.06,
      size: 2 + Math.random() * 2,
      sizeDecay: 0.08,
      shape: 'circle',
      lifeSpeed: 0.08,
      blur: 4,
    });
  }
}

/** Satisfying radial burst when a pipe path completes */
export function emitPipeComplete(cx: number, cy: number, color: string): void {
  // Main burst: 18 particles in all directions
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18;
    const speed = 2 + Math.random() * 4;
    const shapes: ParticleShape[] = ['circle', 'rect', 'star'];
    addParticle({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ay: 0.15,
      color,
      alpha: 1,
      alphaDecay: 0.022,
      size: 3 + Math.random() * 5,
      sizeDecay: 0.05,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      lifeSpeed: 0.025,
      blur: 8,
    });
  }

  // Ring ripple: 6 expanding rings
  for (let i = 0; i < 6; i++) {
    const delay = i * 40;
    setTimeout(() => {
      addParticle({
        x: cx, y: cy,
        vx: 0, vy: 0,
        ay: 0, ax: 0,
        color,
        alpha: 0.6,
        alphaDecay: 0.04,
        size: 4 + i * 3,
        sizeDecay: -1.8,   // growing
        shape: 'ring',
        lifeSpeed: 0.05,
        blur: 0,
      });
    }, delay);
  }

  // Sparkle stars above the burst
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI;
    addParticle({
      x: cx, y: cy,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      ay: 0.08,
      color: '#FFD700',
      alpha: 1,
      alphaDecay: 0.03,
      size: 4 + Math.random() * 4,
      sizeDecay: 0.04,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      shape: 'star',
      lifeSpeed: 0.03,
      blur: 6,
    });
  }
}

/** Massive win explosion from grid center */
export function emitWinExplosion(cx: number, cy: number, colors: string[]): void {
  const COUNT = 80;
  for (let i = 0; i < COUNT; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 2 + Math.random() * 10;
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const shapes: ParticleShape[] = ['circle', 'rect', 'star', 'rect'];
    addParticle({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // bias upward
      ay: 0.18,
      color,
      alpha: 1,
      alphaDecay: 0.008 + Math.random() * 0.008,
      size: 4 + Math.random() * 9,
      sizeDecay: 0.02,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      lifeSpeed: 0.012,
      blur: 6,
    });
  }

  // Secondary delayed wave
  setTimeout(() => {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      addParticle({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ay: 0.14,
        color: '#FFD700',
        alpha: 0.9,
        alphaDecay: 0.012,
        size: 3 + Math.random() * 7,
        sizeDecay: 0.03,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() < 0.5 ? 'star' : 'circle',
        lifeSpeed: 0.015,
        blur: 10,
      });
    }
  }, 200);
}

// ── Endpoint heartbeat pulse ──────────────────────────────────────────────────

interface EndpointPulse {
  row: number; col: number;
  phase: number;       // 0→2π oscillating
  complete: boolean;   // draws a wider glow when complete
}

const _endpointPulses = new Map<string, EndpointPulse>();

export function initEndpointPulses(endpoints: { row: number; col: number; color: string }[]): void {
  _endpointPulses.clear();
  endpoints.forEach((ep) => {
    const key = `${ep.row},${ep.col}`;
    _endpointPulses.set(key, {
      row: ep.row, col: ep.col,
      phase: Math.random() * Math.PI * 2,
      complete: false,
    });
  });
}

export function markEndpointComplete(row: number, col: number): void {
  const key = `${row},${col}`;
  const p = _endpointPulses.get(key);
  if (p) p.complete = true;
}

export function resetEndpointComplete(): void {
  _endpointPulses.forEach((p) => { p.complete = false; });
}

export function updateAndDrawEndpointPulses(
  ctx: CanvasRenderingContext2D,
  endpoints: { row: number; col: number; color: string }[],
  ox: number, oy: number, cellSize: number,
  now: number,
  colors: Record<string, string>,
): void {
  for (const ep of endpoints) {
    const key = `${ep.row},${ep.col}`;
    let pulse = _endpointPulses.get(key);
    if (!pulse) continue;

    // Heartbeat: fast rise, slow fall — two-beat rhythm
    pulse.phase = (now / 900) * Math.PI * 2;
    const beat = Math.sin(pulse.phase);
    const scale = pulse.complete
      ? 1 + Math.abs(Math.sin(now / 400)) * 0.18   // steady glow when done
      : 1 + Math.max(0, beat) * 0.12;               // heartbeat

    const cx  = ox + ep.col * cellSize + cellSize / 2;
    const cy  = oy + ep.row * cellSize + cellSize / 2;
    const col = colors[ep.color] ?? '#fff';
    const r   = cellSize * 0.36 * scale;

    // Outer glow ring (larger when complete)
    const glowRadius = pulse.complete ? r * 2.2 : r * 1.6;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, glowRadius);
    grd.addColorStop(0, col + (pulse.complete ? '55' : '33'));
    grd.addColorStop(1, col + '00');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Main dot (the actual endpoint circle is drawn by render.ts on top)
    // We only draw the glow aura here
    if (pulse.complete) {
      // Completion shimmer: rotating arc
      const shimmerAngle = (now / 600) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, shimmerAngle, shimmerAngle + Math.PI * 0.8);
      ctx.strokeStyle = col + 'aa';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Grid cell fill flash ──────────────────────────────────────────────────────

interface CellFlash {
  row: number; col: number;
  color: string;
  alpha: number;
}

const _cellFlashes: CellFlash[] = [];

export function flashCell(row: number, col: number, color: string): void {
  // Remove existing flash for this cell
  const idx = _cellFlashes.findIndex((f) => f.row === row && f.col === col);
  if (idx !== -1) _cellFlashes.splice(idx, 1);
  _cellFlashes.push({ row, col, color, alpha: 0.7 });
}

export function updateAndDrawCellFlashes(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, cellSize: number,
): void {
  for (let i = _cellFlashes.length - 1; i >= 0; i--) {
    const f = _cellFlashes[i];
    f.alpha -= 0.04;
    if (f.alpha <= 0) { _cellFlashes.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    const pad = cellSize * 0.1;
    ctx.fillRect(
      ox + f.col * cellSize + pad,
      oy + f.row * cellSize + pad,
      cellSize - pad * 2,
      cellSize - pad * 2,
    );
    ctx.restore();
  }
}

// ── Active drag trail ─────────────────────────────────────────────────────────

interface TrailPoint {
  x: number; y: number;
  alpha: number;
  size: number;
}

const _trail: TrailPoint[] = [];
const MAX_TRAIL = 12;

export function addTrailPoint(x: number, y: number, size: number): void {
  _trail.push({ x, y, alpha: 0.45, size });
  if (_trail.length > MAX_TRAIL) _trail.shift();
}

export function clearTrail(): void {
  _trail.length = 0;
}

export function drawTrail(ctx: CanvasRenderingContext2D, color: string): void {
  for (let i = 0; i < _trail.length; i++) {
    const p = _trail[i];
    const ratio = i / _trail.length;
    p.alpha = Math.max(0, p.alpha - 0.018);

    ctx.save();
    ctx.globalAlpha = p.alpha * ratio;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Ripple rings ──────────────────────────────────────────────────────────────

interface Ripple {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

const _ripples: Ripple[] = [];

export function emitRipple(x: number, y: number, color: string, maxRadius: number): void {
  _ripples.push({ x, y, radius: 0, maxRadius, alpha: 0.9, color, lineWidth: 3 });
}

export function updateAndDrawRipples(ctx: CanvasRenderingContext2D): void {
  for (let i = _ripples.length - 1; i >= 0; i--) {
    const r = _ripples[i];
    r.radius += (r.maxRadius - r.radius) * 0.12;
    r.alpha  -= 0.03;
    r.lineWidth = Math.max(0.5, r.lineWidth - 0.06);

    if (r.alpha <= 0) { _ripples.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha  = r.alpha;
    ctx.strokeStyle  = r.color;
    ctx.lineWidth    = r.lineWidth;
    ctx.shadowColor  = r.color;
    ctx.shadowBlur   = 8;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Utility: clear all effects (on level restart) ─────────────────────────────

export function clearAllEffects(): void {
  _particles.length  = 0;
  _cellFlashes.length = 0;
  _ripples.length    = 0;
  _trail.length      = 0;
  _tweens.length     = 0;
  _endpointPulses.clear();
}
