const FREQS = [261, 294, 329, 349, 392, 440, 494, 523, 587, 659, 698, 784];

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  void ctx?.resume();
}

export function playConnectTone(colorIndex: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = FREQS[((colorIndex % FREQS.length) + FREQS.length) % FREQS.length];
  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

export function playSolveTone(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
