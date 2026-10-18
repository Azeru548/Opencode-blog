// =====================================================================
//  MARBLE MILL — score.
//
//  Synthesised from scratch (no samples, no downloads). Everything is
//  built so the 12 s file is seamless: tone frequencies are exact integer
//  multiples of 1/dur, and every percussive hit has decayed to silence
//  before the end, so sample[N-1] flows into sample[0].
//
//    node tools/score.cjs            -> out/score.wav
// =====================================================================
const fs = require('fs');
const path = require('path');

const SR = 48000;
const DUR = 12;
const N = SR * DUR;
const OUT = path.join(__dirname, '..', 'out', 'score.wav');

const L = new Float32Array(N);
const R = new Float32Array(N);

function rnd(seed) {
  let a = seed >>> 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- a tiny resonant band-pass, for the mechanical hits
function biquad(x, f, q, kind) {
  const w0 = 2 * Math.PI * f / SR, alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const y = (b0 / a0) * x[i] + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = kind === 'bp' ? y : y;
  }
  return out;
}

// ---- add a mono source into the stereo field
function add(t0, src, pan, gain) {
  const i0 = Math.round(t0 * SR);
  const gl = gain * Math.sqrt((1 - pan) / 2) * Math.SQRT2;
  const gr = gain * Math.sqrt((1 + pan) / 2) * Math.SQRT2;
  for (let i = 0; i < src.length; i++) {
    const j = i0 + i;
    if (j < 0) continue;
    const k = j % N;               // wrap => loop-safe
    L[k] += src[i] * gl;
    R[k] += src[i] * gr;
  }
}

// =====================================================================
//  1. the machine's bed: a low hum, exact multiples of 1/12 Hz
// =====================================================================
(function hum() {
  const buf = new Float32Array(N);
  const partials = [[60, 0.16], [90, 0.10], [120, 0.09], [180, 0.05], [240, 0.028], [300, 0.016]];
  for (const [f, a] of partials) {
    const ph = (f * 2 * Math.PI) / SR;
    for (let i = 0; i < N; i++) buf[i] += Math.sin(ph * i) * a;
  }
  // slow breathing so it never sits still
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    buf[i] *= 0.82 + 0.18 * Math.sin((2 * Math.PI / DUR) * 3 * t - 1.0);
  }
  add(0, buf, 0, 0.55);
})();

// =====================================================================
//  2. a clock tick every 0.5 s (24 of them in the loop)
// =====================================================================
(function ticks() {
  const r = rnd(4242);
  const len = Math.round(0.035 * SR);
  const click = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    click[i] = (r() * 2 - 1) * Math.exp(-t * 190);
  }
  let seg = [];
  for (let k = 0; k < 24; k++) {
    const g = k % 2 === 0 ? 0.075 : 0.045;
    add(k * 0.5, click, 0, g);
  }
  void seg;
})();

// =====================================================================
//  3. mechanical impacts, parked on the animation's own event times
// =====================================================================
function impact(t0, { f = 260, q = 5, dur = 0.55, gain = 0.5, pan = 0, body = 70 }) {
  const len = Math.round(dur * SR);
  const raw = new Float32Array(len);
  const r = rnd(Math.round(t0 * 1000) + 7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (5.6 / dur)) * (1 - Math.exp(-t * 900));
    raw[i] = (r() * 2 - 1) * env;
  }
  const bp = biquad(raw, f, q, 'bp');
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    out[i] = bp[i] + raw[i] * 0.25 * Math.exp(-t * 30);

    // a low body thump under it
    out[i] += Math.sin(2 * Math.PI * body * t) * Math.exp(-t * (5.0 / dur)) * 0.5;
  }
  add(t0, out, pan, gain);
}

impact(1.20, { f: 320, q: 6, dur: 0.45, gain: 0.34, pan: -0.45 });  // cup tips
impact(1.42, { f: 520, q: 4, dur: 0.35, gain: 0.30, pan: -0.40 });  // release gate clacks
impact(3.90, { f: 240, q: 5, dur: 0.55, gain: 0.46, pan: 0.35 });   // marble hits the trapdoor
impact(4.10, { f: 150, q: 4, dur: 0.70, gain: 0.40, pan: 0.30 });   // trapdoor slams open
impact(5.80, { f: 300, q: 6, dur: 0.60, gain: 0.50, pan: 0.55 });   // paddle snap
impact(7.40, { f: 210, q: 5, dur: 0.85, gain: 0.52, pan: -0.50 });  // marble lands in the cup
impact(0.02, { f: 260, q: 5, dur: 0.40, gain: 0.20, pan: -0.50 });  // (loop seam tick)

// =====================================================================
//  4. the marble rolling: filtered noise gated to the travel phases
// =====================================================================
(function roll() {
  const r = rnd(99991);
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = r() * 2 - 1;
  const lp = biquad(buf, 900, 0.9, 'bp');
  // speed envelope, mirrored from S_KEYS
  const keys = [
    [1.20, 0], [1.55, 0.35], [2.00, 0.55], [3.55, 0.75], [3.90, 0.5],
    [4.45, 0.6], [5.45, 0.85], [5.85, 0.5], [6.2, 0.8], [7.20, 0.95], [7.40, 0]
  ];
  function env(t) {
    if (t <= keys[0][0] || t >= keys[keys.length - 1][0]) return 0;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
        const u = (t - t0) / (t1 - t0);
        const s = u * u * (3 - 2 * u);
        return v0 + (v1 - v0) * s;
      }
    }
    return 0;
  }
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const e = env(t);
    // a slight tremble so it sounds like a rolling ball, not a hiss
    out[i] = lp[i] * e * (0.6 + 0.4 * Math.sin(2 * Math.PI * 27 * t));
  }
  add(0, out, 0, 0.30);
})();

// =====================================================================
//  5. the lift: a rising, purposeful swell while the wheel brings it home
// =====================================================================
(function lift() {
  const len = Math.round(4.6 * SR);
  const buf = new Float32Array(len);
  const r = rnd(5150);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const u = t / 4.6;
    // rising swell, and fully resolved by the end of the file
    const e = Math.sin(Math.PI * Math.min(1, u)) ** 1.6;
    const f = 150 + 190 * u;
    buf[i] = (Math.sin(2 * Math.PI * f * t) * 0.6 + (r() * 2 - 1) * 0.16) * e;
  }
  add(7.40, buf, 0, 0.22);
})();

// =====================================================================
//  6. a gentle music-box motif, one note per 0.5 s
// =====================================================================
(function musicbox() {
  const C4 = 261.6256;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
  const semis = (n) => C4 * Math.pow(2, n / 12);
  const motif = [0, 4, 7, 4, 9, 7, 4, 2, 0, 2, 4, 7, 5, 2, 4, 0, 2, 5, 9, 7, 4, 2, 0, 4];
  for (let k = 0; k < 24; k++) {
    const deg = motif[k];
    const idx = ((deg % scale.length) + scale.length) % scale.length;
    const f = semis(scale[idx]);
    const dur = 0.9;
    const len = Math.round(dur * SR);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.exp(-t * 6.2) * (1 - Math.exp(-t * 1500));
      buf[i] = (
        Math.sin(2 * Math.PI * f * t) * 0.6 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.22 +
        Math.sin(2 * Math.PI * f * 3.01 * t) * 0.10 +
        Math.sin(2 * Math.PI * f * 5.02 * t) * 0.045
      ) * env;
    }
    const g = k % 6 === 0 ? 0.20 : (k % 2 === 0 ? 0.15 : 0.11);
    add(k * 0.5, buf, (k % 3 - 1) * 0.22, g);
  }
})();

// =====================================================================
//  normalise + write 16-bit stereo WAV
// =====================================================================
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? 0.89 / peak : 1;
let rms = 0;
for (let i = 0; i < N; i++) {
  L[i] *= g; R[i] *= g;
  rms += L[i] * L[i] + R[i] * R[i];
}
rms = Math.sqrt(rms / (2 * N));

const bytes = 44 + N * 4;
const buf = Buffer.alloc(bytes);
buf.write('RIFF', 0); buf.writeUInt32LE(bytes - 8, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), o); o += 2;
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), o); o += 2;
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);

// loop-seam report: how far the last sample is from the first
const seam = Math.abs(L[N - 1] - L[0]) + Math.abs(R[N - 1] - R[0]);
console.log('wrote', path.relative(path.join(__dirname, '..'), OUT));
console.log('  duration :', DUR, 's');
console.log('  peak     :', (peak * g).toFixed(4), '(target 0.89)');
console.log('  rms      :', rms.toFixed(4), '->', (20 * Math.log10(rms)).toFixed(1), 'dBFS');
console.log('  loop seam:', seam.toFixed(6), '(0 = perfectly continuous)');
