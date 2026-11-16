// CAUSEWAY — sound. Every effect is synthesized with WebAudio, no audio
// files, no network. The context is created lazily on the first user
// gesture (browsers block audio before that) and every call is guarded,
// so a missing AudioContext can never break the game.

let ctx = null;
let muted = false;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch (_) {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freqA, freqB, dur, type, vol, when = 0) {
  if (!ctx || muted || !master) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    if (freqB !== freqA) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (_) {}
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted || !master) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  } catch (_) {}
}

export const sfx = {
  // Lantern flare: a bright whoosh upward.
  flare() {
    noiseBurst(0.28, 0.5, 2600);
    tone(320, 980, 0.22, 'sine', 0.22);
  },
  // Flame transferred into a brazier: a warm two-note chime.
  relight() {
    tone(523, 523, 0.14, 'triangle', 0.25);
    tone(784, 784, 0.2, 'triangle', 0.22, 0.09);
  },
  // Wraith banished: a soft pop as the smoke tears.
  banish() {
    tone(180, 60, 0.16, 'sawtooth', 0.12);
    noiseBurst(0.12, 0.25, 900);
  },
  // Wraith hiss when one latches onto a brazier.
  hiss() {
    noiseBurst(0.5, 0.16, 1400);
  },
  // Keeper hurt: a low thud.
  hurt() {
    tone(140, 55, 0.3, 'square', 0.2);
  },
  // A brazier goes dark: a cold sigh downward.
  snuffed() {
    tone(300, 90, 0.5, 'sine', 0.2);
  },
  // Dawn breaks between nights: a rising arpeggio.
  dawn() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.35, 'triangle', 0.2, i * 0.11));
  },
  // Victory at the seventh dawn: a full major arpeggio, twice.
  victory() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, f, 0.4, 'triangle', 0.2, i * 0.12));
  },
  // Defeat: a slow low drone.
  defeat() {
    tone(110, 55, 1.4, 'sawtooth', 0.16);
    tone(165, 82, 1.4, 'sine', 0.14, 0.1);
  },
  // UI confirm.
  confirm() {
    tone(660, 660, 0.08, 'triangle', 0.18);
  },
};
