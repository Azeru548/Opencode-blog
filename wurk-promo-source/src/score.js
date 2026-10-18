  // SCORE BODY — wurk-promo v4 (voiced). Groove under the build, a soft tick on
  // every insert cut (so the lens changes are heard, not just seen), rush hits,
  // silence 26.75-28.5 (the voice's own pause too), payoff stab at 28.5, flat
  // tail over the lockup. Windows follow the voice clock.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 26.75, ['D3', 'A3', 'Fs4'], 0.032, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  for (let b = 0; b < 76; b++) pluck(4.25 + b * E8, nz(b % 4 === 0 ? 'D4' : 'A4'), 0.13, b % 2 ? 0.1 : -0.1, 0.5, 2600, 0.3);
  for (let i = 0; i < 4; i++) noiseHit(23.25 + i * BEAT, 0.09, 'bandpass', 3000 + i * 500, 2, 0.22, 0);
  pad(28.5, 36.3, ['D3', 'G3', 'D4', 'Fs4'], 0.055, { cut: 800, att: 0.02, rel: 0.4 });
  to = 's';
  // insert tick on every wide->close cut, plus the two stamp payoffs
  for (const c of [2.0, 6.25, 9.75, 13.0, 16.5, 20.75, 32.5]) noiseHit(c, 0.028, 'highpass', 6200, 1, 0.05, 0);
  noiseHit(cu.stamp, 0.06, 'bandpass', 1800, 1.4, 0.16, 0);
  noiseHit(cu.seal, 0.06, 'bandpass', 1600, 1.4, 0.16, 0);
  noiseHit(cu.plan, 0.05, 'highpass', 5000, 1, 0.05, 0);
  sweep(3.6, 4.25, 0.012, 2400, 500, 0);
  chime(28.5, [660, 880, 1320], 0.3, 0);
  noiseHit(28.5, 0.14, 'lowpass', 500, 1, 0.3, 0);
