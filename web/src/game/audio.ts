// ── Web Audio engine ──────────────────────────────────────────────────────────
// All sound effects synthesised entirely with the Web Audio API.
// No external files, no downloads required.

const PIPE_FREQS = [261, 294, 329, 349, 392, 440, 494, 523, 587, 659, 698, 784];

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  void ctx?.resume();
}

// ── Helper: create a gain node connected to destination ──────────────────────

function masterGain(ctx: AudioContext, volume = 0.18): GainNode {
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(ctx.destination);
  return g;
}

// ── Helper: play a single pitched note ───────────────────────────────────────

function playNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  attackVol = 0.15,
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(attackVol, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

// ── Cell step tone (pipe dragging) ───────────────────────────────────────────

export function playConnectTone(colorIndex: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  const freq = PIPE_FREQS[((colorIndex % PIPE_FREQS.length) + PIPE_FREQS.length) % PIPE_FREQS.length];
  const g = masterGain(ctx, 0.09);
  playNote(ctx, g, freq, ctx.currentTime, 0.13, 'sine', 0.12);
}

// ── Win fanfare — rich ascending arpeggio with harmonics ─────────────────────
//
// Structure:
//   beat 0.00s  C5  (523 Hz) — sine + sub-octave
//   beat 0.10s  E5  (659 Hz)
//   beat 0.20s  G5  (784 Hz)
//   beat 0.30s  C6 (1046 Hz) — longer, with shimmer
//   beat 0.45s  G6 (1568 Hz) — final high sparkle
//   Underneath: a soft pad chord that fades in/out

export function playSolveTone(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const master = masterGain(ctx, 0.22);
  const t0 = ctx.currentTime;

  // ── Arpeggio melody ────────────────────────────────────────────────────────
  const melody: [number, number, number][] = [
    [523,  0.00, 0.28],  // C5
    [659,  0.10, 0.28],  // E5
    [784,  0.20, 0.28],  // G5
    [1046, 0.30, 0.45],  // C6
    [1568, 0.50, 0.55],  // G6 sparkle
  ];

  for (const [freq, offset, dur] of melody) {
    playNote(ctx, master, freq, t0 + offset, dur, 'sine', 0.18);
    // Harmonic shimmer (one octave down, very quiet)
    playNote(ctx, master, freq / 2, t0 + offset, dur * 0.7, 'triangle', 0.04);
  }

  // ── Soft pad chord (C-E-G) ─────────────────────────────────────────────────
  const padGain = ctx.createGain();
  padGain.connect(ctx.destination);
  padGain.gain.setValueAtTime(0, t0);
  padGain.gain.linearRampToValueAtTime(0.06, t0 + 0.2);
  padGain.gain.linearRampToValueAtTime(0.06, t0 + 0.7);
  padGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);

  for (const freq of [261, 329, 392]) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    osc.connect(padGain);
    osc.start(t0);
    osc.stop(t0 + 1.2);
  }

  // ── Percussive "pop" at beat 0 ─────────────────────────────────────────────
  const popGain = ctx.createGain();
  popGain.connect(ctx.destination);
  popGain.gain.setValueAtTime(0.12, t0);
  popGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);

  const popOsc = ctx.createOscillator();
  popOsc.type = 'square';
  popOsc.frequency.setValueAtTime(880, t0);
  popOsc.frequency.exponentialRampToValueAtTime(220, t0 + 0.06);
  popOsc.connect(popGain);
  popOsc.start(t0);
  popOsc.stop(t0 + 0.09);
}

// ── Fail / incomplete tone ────────────────────────────────────────────────────
//
// A short descending "bloop" — communicates "not done yet" without being harsh.
// Two descending notes with a slight wobble.

export function playFailTone(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const master = masterGain(ctx, 0.16);
  const t0 = ctx.currentTime;

  // Descending two-note motif
  const notes: [number, number, number][] = [
    [523, 0.00, 0.18],  // C5
    [392, 0.14, 0.26],  // G4 (lower)
    [330, 0.28, 0.30],  // E4 (even lower, fades)
  ];

  for (const [freq, offset, dur] of notes) {
    playNote(ctx, master, freq, t0 + offset, dur, 'sine', 0.14);
    // Low thud for weight
    playNote(ctx, master, freq * 0.5, t0 + offset, dur * 0.5, 'triangle', 0.05);
  }

  // Subtle vibrato on the last note using LFO
  const lfo  = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.setValueAtTime(6, t0 + 0.28);
  lfoG.gain.setValueAtTime(8, t0 + 0.28);
  lfo.connect(lfoG);

  const modOsc  = ctx.createOscillator();
  const modGain = ctx.createGain();
  modOsc.type = 'sine';
  modOsc.frequency.setValueAtTime(330, t0 + 0.28);
  lfoG.connect(modOsc.frequency);
  modOsc.connect(modGain);
  modGain.connect(master);
  modGain.gain.setValueAtTime(0.07, t0 + 0.28);
  modGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.58);

  lfo.start(t0 + 0.28);
  lfo.stop(t0 + 0.6);
  modOsc.start(t0 + 0.28);
  modOsc.stop(t0 + 0.6);
}

// ── Pipe completion "snap" tone ───────────────────────────────────────────────
// A satisfying click/snap when a pipe is completed (both endpoints connected).

export function playPipeCompleteTone(colorIndex: number): void {
  const ctx = getCtx();
  if (!ctx) return;

  const freq = PIPE_FREQS[((colorIndex % PIPE_FREQS.length) + PIPE_FREQS.length) % PIPE_FREQS.length];
  const t0   = ctx.currentTime;
  const g    = masterGain(ctx, 0.14);

  // Main tone — bright sine with fast attack
  playNote(ctx, g, freq * 2, t0, 0.22, 'sine', 0.18);
  // Harmony — third above
  playNote(ctx, g, freq * 2.5, t0 + 0.02, 0.18, 'sine', 0.09);
  // Click transient
  const clickG = ctx.createGain();
  clickG.gain.setValueAtTime(0.2, t0);
  clickG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
  clickG.connect(ctx.destination);
  const noise = ctx.createOscillator();
  noise.type  = 'square';
  noise.frequency.setValueAtTime(freq * 4, t0);
  noise.connect(clickG);
  noise.start(t0);
  noise.stop(t0 + 0.05);
}
