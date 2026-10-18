// =====================================================================
//  MARBLE MILL  —  a clockwork machine, authored in code.
//
//  ONE marble runs a closed circuit. Every part is driven by the same
//  gear train, so the whole thing reads as one machine, and the marble
//  returns to its exact starting pose at t = DUR — a seamless loop.
//
//  Determinism: frame(t) is a pure function of t. No Date, no runtime
//  randomness (grain uses a fixed seed), no async work. seek(t) draws.
//
//   0.0 -> 1.2   marble rides the bucket wheel; cup tips into the hopper
//   1.2 -> 3.6   hopper -> RAMP A across the top (knocks the pinwheel)
//   3.7 -> 4.4   TRAPDOOR FLAP tips and drops the marble through
//   4.4 -> 5.5   the slide down to the right
//   5.5 -> 5.8   PADDLE catches, tips, and sends it back left
//   5.8 -> 7.4   RAMP C across the middle, curving into the cup
//   7.4 -> 12.0  bucket wheel lifts it home   ==   t = 0
// =====================================================================
(function () {
  'use strict';

  const W = 1920, H = 1080;
  const DUR = 12;
  const FPS = 30;
  const DEBUG = /(^|[#&])debug/.test(location.hash + location.search);

  // ---------------------------------------------------------------- palette
  const C = {
    paper:  '#EFE6DA',
    paper2: '#DFD2C0',
    ink:    '#161B22',
    ink2:   '#2E3742',
    cream:  '#FCF7EF',
    red:    '#DF5A34',
    amber:  '#E9A03C',
    teal:   '#2F9A8C',
    blue:   '#3F6FA8',
    steel:  '#9AA6B2',
    steel2: '#7C8894',
    wood:   '#C98F5A',
    wood2:  '#A97444'
  };

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, u) => a + (b - a) * u;

  const EASE = {
    linear:    u => u,
    in:        u => u * u * u,
    out:       u => 1 - Math.pow(1 - u, 3),
    inOut:     u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    inQuad:    u => u * u,
    outQuad:   u => 1 - (1 - u) * (1 - u),
    outBack:   u => { const c1 = 1.35, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
    outSpring: u => { if (u >= 1) return 1; return 1 - Math.pow(2, -8 * u) * Math.cos((u * 8 - 0.5) * Math.PI * 1.1); }
  };

  function track(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    const last = keys.length - 1;
    if (t >= keys[last][0]) return keys[last][1];
    for (let i = 1; i <= last; i++) {
      if (t <= keys[i][0]) {
        const t0 = keys[i - 1][0], v0 = keys[i - 1][1];
        const t1 = keys[i][0], v1 = keys[i][1], e = keys[i][2];
        const span = t1 - t0;
        const u = span <= 0 ? 1 : (t - t0) / span;
        return lerp(v0, v1, (EASE[e] || EASE.inOut)(clamp(u, 0, 1)));
      }
    }
    return keys[last][1];
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- geometry
  const WHEEL  = { x: 400, y: 560, r: 235 };
  const GEAR   = { x: 238, y: 844, r: 86, teeth: 14 };          // drive gear
  const PIN    = { x: 109, y: 844, r: 43, teeth: 7  };          // pinion
  const FLAP   = { hx: 1292, hy: 452, len: 128, rest: 0.759 };  // trapdoor
  const PADDLE = { hx: 1610, hy: 690, len: 150, rest: -0.227 }; // tipping lever
  const DECK   = 930;                                           // machine deck height
  const PINW   = { x: 1180, y: 368 };

  // The marble's route: authored so every drawn chute follows it exactly.
  const ROUTE = [
    [472, 337], [486, 326], [506, 314], [528, 310], [552, 322], [575, 340],
    [700, 370], [860, 396], [1020, 414], [1160, 427], [1250, 432],
    [1292, 452], [1330, 486], [1372, 528], [1408, 566], [1444, 608],
    [1480, 648], [1516, 676], [1546, 700],
    [1522, 726], [1470, 748],
    [1300, 760], [1120, 772], [940, 782], [760, 790], [606, 798],
    [520, 804], [462, 808], [424, 803], [404, 795]
  ];

  const CUM = [0];
  for (let i = 1; i < ROUTE.length; i++) {
    CUM.push(CUM[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
  }
  const TOTAL = CUM[CUM.length - 1];
  const F = i => CUM[i] / TOTAL;     // fraction at a route index

  function routeAt(s) {
    s = clamp(s, 0, TOTAL);
    let i = 1;
    while (i < CUM.length - 1 && CUM[i] < s) i++;
    const seg = CUM[i] - CUM[i - 1] || 1;
    const u = (s - CUM[i - 1]) / seg;
    return [lerp(ROUTE[i - 1][0], ROUTE[i][0], u), lerp(ROUTE[i - 1][1], ROUTE[i][1], u)];
  }

  // ---------------------------------------------------------------- timeline
  const RIDE_OUT = 7.4;   // marble back in the cup from here on

  const WHEEL_KEYS = [[0, 270, 'linear'], [0.5, 272, 'inOut'], [1.2, 288, 'out'], [RIDE_OUT, 450, 'linear'], [12, 630, 'inOut']];
  const TIP_KEYS   = [[0, 0, 'linear'], [0.40, 0, 'linear'], [1.05, -1.02, 'out'], [1.35, -1.02, 'linear'], [2.3, 0, 'outSpring']];

  // arc-length fraction of the route, at the moments the marble is there
  const S_KEYS = [
    [1.20, 0.0000, 'linear'],
    [1.55, F(5),    'out'],
    [2.00, F(6),    'in'],
    [3.55, F(10),   'linear'],
    [3.85, F(12),   'out'],
    [4.45, F(13),   'linear'],
    [5.45, F(18),   'in'],
    [5.85, F(20),   'out'],
    [7.20, F(26),   'linear'],
    [7.40, 1.0000,  'out']
  ];

  const FLAP_KEYS   = [[0, 0, 'linear'], [3.70, 0, 'linear'], [4.00, 0.62, 'out'], [4.75, 0.30, 'inOut'], [5.6, 0, 'outSpring']];
  const PADDLE_KEYS = [[0, 0, 'linear'], [5.45, 0, 'linear'], [5.80, -0.42, 'out'], [6.45, -0.20, 'inOut'], [7.3, 0, 'outSpring']];
  const GATE_KEYS   = [[0, 0, 'linear'], [1.05, 0, 'linear'], [1.42, 0.95, 'out'], [2.3, 1.05, 'linear'], [3.2, 0, 'outSpring']];
  const PIN_KEYS    = [[0, 0, 'linear'], [3.35, 0, 'linear'], [4.30, Math.PI * 4, 'out'], [6.0, Math.PI * 5.4, 'out'], [8.6, Math.PI * 6, 'out']];

  // impacts, for the little shockwave rings
  const RINGS = [
    { t0: 1.42, x: 578, y: 344, r: 26, r1: 96, dur: 0.60, hue: C.amber },
    { t0: 3.90, x: 1330, y: 486, r: 22, r1: 84, dur: 0.55, hue: C.amber },
    { t0: 5.80, x: 1524, y: 700, r: 24, r1: 96, dur: 0.65, hue: C.teal },
    { t0: 7.40, x: 404, y: 795, r: 28, r1: 110, dur: 0.70, hue: C.amber }
  ];

  function state(t) {
    const theta = track(t, WHEEL_KEYS) * Math.PI / 180;
    const riding = (t >= RIDE_OUT || t <= 1.2);
    let mx, my;
    if (riding) {
      mx = WHEEL.x + WHEEL.r * Math.cos(theta);
      my = WHEEL.y + WHEEL.r * Math.sin(theta);
    } else {
      const p = routeAt(track(t, S_KEYS) * TOTAL);
      mx = p[0]; my = p[1];
    }
    // squash on the hard landings
    let squash = 1;
    for (const k of [[1.42, 0.20], [5.80, 0.22], [7.40, 0.26]]) {
      const d = t - k[0];
      if (d >= 0 && d < 0.30) squash = Math.min(squash, 1 - k[1] * (1 - d / 0.30));
    }
    return {
      t, theta, riding, mx, my, squash,
      cupTilt: track(t, TIP_KEYS),
      flap:    track(t, FLAP_KEYS),
      paddle:  track(t, PADDLE_KEYS),
      gate:    track(t, GATE_KEYS),
      pinwheel: track(t, PIN_KEYS),
      gearA: -(t / DUR) * Math.PI * 2,
      pinA:  (t / DUR) * Math.PI * 4,
      belt:   t / DUR,
      gauge:  (t / DUR) * Math.PI * 2
    };
  }

  // ---------------------------------------------------------------- draw kit
  function ink(ctx, w) {
    ctx.lineWidth = w; ctx.strokeStyle = C.ink;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function shadow(ctx, blur, alpha, dy) {
    ctx.shadowColor = 'rgba(22,27,34,' + alpha + ')';
    ctx.shadowBlur = blur; ctx.shadowOffsetY = dy || 0;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function gearPath(ctx, x, y, r, teeth, ang) {
    ctx.beginPath();
    const inner = r * 0.87, root = r * 0.74;
    const n = teeth * 4;
    for (let i = 0; i < n; i++) {
      const a = ang + (i / n) * Math.PI * 2;
      const seg = i % 4;
      const rr = seg === 1 || seg === 2 ? r : (seg === 0 ? inner : root);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawGear(ctx, g, ang, fill) {
    gearPath(ctx, g.x, g.y, g.r, g.teeth, ang);
    ctx.fillStyle = fill; ctx.fill(); ink(ctx, 7);
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = C.cream; ctx.fill(); ink(ctx, 6);
    const spokes = g.teeth / 4;
    for (let i = 0; i < spokes; i++) {
      const a = ang + (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(g.x + Math.cos(a) * g.r * 0.16, g.y + Math.sin(a) * g.r * 0.16);
      ctx.lineTo(g.x + Math.cos(a) * g.r * 0.66, g.y + Math.sin(a) * g.r * 0.66);
      ink(ctx, 14);
    }
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); ink(ctx, 6);
  }

  function drawMarble(ctx, x, y, r, squash) {
    const ry = r * (2 - squash);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.1, x, y, r * 1.15);
    g.addColorStop(0, '#8CEADD');
    g.addColorStop(0.45, C.teal);
    g.addColorStop(1, '#175F58');
    ctx.beginPath(); ctx.ellipse(x, y, r * squash, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.40, r * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
  }

  // the marble's route doubles as the running surface of every chute
  function drawChute(ctx, i0, i1, thickness, fill) {
    const pts = ROUTE.slice(i0, i1 + 1);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + thickness);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ink(ctx, 6);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = 'rgba(252,247,239,0.8)'; ctx.lineWidth = 3; ctx.stroke();
  }

  // ---------------------------------------------------------------- scene
  function draw(ctx, st) {
    const t = st.t;

    // ---- background
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W * 0.46, H * 0.40, 140, W * 0.5, H * 0.5, 1320);
    bg.addColorStop(0, 'rgba(255,252,246,0.98)');
    bg.addColorStop(1, 'rgba(199,181,157,0.62)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ---- camera: a slow breath that completes exactly one cycle per loop
    ctx.save();
    const S = 1 + 0.012 * Math.sin((t / DUR) * Math.PI * 2);
    ctx.translate(W / 2, H / 2 + 40);
    ctx.scale(S, S);
    ctx.translate(-W / 2, -(H / 2 + 40));

    // faint blueprint grid — gives the bench depth without clutter
    ctx.save();
    ctx.strokeStyle = 'rgba(63,111,168,0.11)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let gx = 60; gx < W; gx += 60) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (let gy = 60; gy < H; gy += 60) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();
    ctx.restore();

    // ---- base plate
    ctx.save();
    shadow(ctx, 44, 0.18, 14);
    roundRect(ctx, 70, DECK, W - 140, 58, 26);
    ctx.fillStyle = C.wood; ctx.fill(); noShadow(ctx); ink(ctx, 7);
    ctx.restore();

    // ---- armature: posts that actually carry the flap, paddle and hopper
    (function frame() {
      for (const [x, yTop, w] of [[1292, 452, 24], [1610, 690, 24], [492, 352, 20]]) {
        ctx.beginPath();
        roundRect(ctx, x - w / 2, yTop, w, DECK - yTop, w / 2);
        ctx.fillStyle = 'rgba(140,152,164,0.50)'; ctx.fill();
        ctx.strokeStyle = 'rgba(22,27,34,0.40)'; ctx.lineWidth = 4; ctx.stroke();
        // foot bolt
        ctx.beginPath(); ctx.arc(x, DECK - 16, 9, 0, Math.PI * 2);
        ctx.fillStyle = C.ink2; ctx.fill();
      }
    })();

    // ---- BELT  (wheel hub <-> gear hub): a strap, not a slab
    (function belt() {
      const ax = WHEEL.x, ay = WHEEL.y, bx = GEAR.x, by = GEAR.y;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      const nx = -dy / L, ny = dx / L;
      const ra = 50, rb = 50;
      // strap
      ctx.beginPath();
      ctx.moveTo(ax + nx * ra, ay + ny * ra);
      ctx.lineTo(bx + nx * rb, by + ny * rb);
      ctx.moveTo(ax - nx * ra, ay - ny * ra);
      ctx.lineTo(bx - nx * rb, by - ny * rb);
      ink(ctx, 11);
      ctx.beginPath();
      ctx.moveTo(ax + nx * ra, ay + ny * ra);
      ctx.lineTo(bx + nx * rb, by + ny * rb);
      ctx.moveTo(ax - nx * ra, ay - ny * ra);
      ctx.lineTo(bx - nx * rb, by - ny * rb);
      ctx.strokeStyle = C.steel2; ctx.lineWidth = 5; ctx.stroke();
      // moving ticks
      ctx.save();
      ctx.setLineDash([16, 34]);
      ctx.lineDashOffset = -st.belt * 200;
      ctx.strokeStyle = 'rgba(233,160,60,0.95)'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ax + nx * ra * 0.62, ay + ny * ra * 0.62);
      ctx.lineTo(bx + nx * rb * 0.62, by + ny * rb * 0.62);
      ctx.moveTo(ax - nx * ra * 0.62, ay - ny * ra * 0.62);
      ctx.lineTo(bx - nx * rb * 0.62, by - ny * rb * 0.62);
      ctx.stroke();
      ctx.restore();
      // pulleys
      for (const p of [[ax, ay, ra + 12], [bx, by, rb + 12]]) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2);
        ctx.fillStyle = C.steel; ctx.fill(); ink(ctx, 7);
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2] * 0.40, 0, Math.PI * 2);
        ctx.fillStyle = C.ink2; ctx.fill();
      }
    })();

    // ---- CAMSHAFT + pushrods (drawn behind the chutes)
    (function camshaft() {
      const y = GEAR.y;
      ctx.beginPath(); ctx.moveTo(PIN.x, y); ctx.lineTo(1540, y); ink(ctx, 15);
      const cams = [[1060, 3.70], [1400, 5.45]];
      for (const [cx, t0] of cams) {
        const lift = track(t, [[t0 - 0.45, 0, 'linear'], [t0 - 0.10, 0, 'inOut'], [t0 + 0.30, 1, 'out'], [t0 + 1.30, 0, 'inOut']]);
        ctx.save(); ctx.translate(cx, y); ctx.rotate(lift * 0.55 + st.gearA * 2);
        ctx.beginPath(); ctx.ellipse(0, 0, 32, 25, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.amber; ctx.fill(); ink(ctx, 6);
        ctx.restore();
      }
      ctx.beginPath(); ctx.moveTo(1060, y - 16); ctx.lineTo(FLAP.hx + 26, FLAP.hy + 46); ink(ctx, 8);
      ctx.beginPath(); ctx.moveTo(1400, y - 16); ctx.lineTo(PADDLE.hx - 40, PADDLE.hy + 26); ink(ctx, 8);
    })();

    // ---- gear train
    drawGear(ctx, GEAR, st.gearA, C.blue);
    drawGear(ctx, PIN, st.pinA, C.red);

    // ---- bucket wheel
    (function wheel() {
      ctx.beginPath(); ctx.arc(WHEEL.x, WHEEL.y, WHEEL.r, 0, Math.PI * 2);
      ctx.lineWidth = 24; ctx.strokeStyle = C.wood2; ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = st.theta + i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(WHEEL.x, WHEEL.y);
        ctx.lineTo(WHEEL.x + Math.cos(a) * WHEEL.r, WHEEL.y + Math.sin(a) * WHEEL.r);
        ink(ctx, 13);
      }
      // cups (gimbaled: they stay upright, then the cam-trip tips cup 0)
      for (let i = 0; i < 4; i++) {
        const a = st.theta + i * Math.PI / 2;
        const cx = WHEEL.x + Math.cos(a) * WHEEL.r;
        const cy = WHEEL.y + Math.sin(a) * WHEEL.r;
        const tilt = i === 0 ? st.cupTilt : 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        // pivot pin + hanger
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -18); ink(ctx, 5);
        ctx.beginPath(); ctx.arc(0, -34, 7, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
        // cup body
        ctx.beginPath();
        ctx.moveTo(-30, -18); ctx.lineTo(-23, 20); ctx.lineTo(23, 20); ctx.lineTo(30, -18);
        ctx.closePath();
        ctx.fillStyle = i === 0 ? C.amber : C.cream; ctx.fill(); ink(ctx, 5);
        ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(30, -18); ink(ctx, 5);
        ctx.restore();
      }
      // hub
      ctx.beginPath(); ctx.arc(WHEEL.x, WHEEL.y, 60, 0, Math.PI * 2);
      ctx.fillStyle = C.amber; ctx.fill(); ink(ctx, 7);
      ctx.beginPath(); ctx.arc(WHEEL.x, WHEEL.y, 21, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
      // (the cup is rolled over by the hopper lip as it passes — no extra
      //  hardware needed, which keeps the top of the wheel clean)
    })();

    // ---- hopper (clean funnel, mouth under the tipping cup)
    (function hopper() {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(408, 288);
      ctx.lineTo(576, 288);
      ctx.quadraticCurveTo(596, 322, 574, 352);
      ctx.lineTo(500, 352);
      ctx.quadraticCurveTo(452, 322, 408, 288);
      ctx.closePath();
      ctx.fillStyle = C.steel; ctx.fill(); ink(ctx, 7);
      ctx.beginPath();
      ctx.moveTo(408, 288); ctx.lineTo(576, 288);
      ctx.strokeStyle = 'rgba(252,247,239,0.75)'; ctx.lineWidth = 4; ctx.stroke();
      // release gate at the spout
      ctx.save();
      ctx.translate(566, 300);
      ctx.rotate(-st.gate * 0.95);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(10, 52); ctx.lineTo(-16, 52); ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fillStyle = C.red; ctx.fill(); ink(ctx, 6);
      ctx.restore();
      ctx.restore();
    })();

    // ---- chutes: A (top), B (the slide), C (middle) — a real gap at the trapdoor
    drawChute(ctx, 5, 10, 28, C.steel);
    drawChute(ctx, 13, 18, 28, C.steel);
    drawChute(ctx, 20, 29, 28, C.steel);

    // ---- trapdoor flap
    (function flap() {
      ctx.save();
      ctx.translate(FLAP.hx, FLAP.hy);
      ctx.rotate(FLAP.rest + st.flap);
      ctx.beginPath();
      ctx.moveTo(-10, -13); ctx.lineTo(FLAP.len, -13);
      ctx.lineTo(FLAP.len, 13); ctx.lineTo(-10, 13);
      ctx.closePath();
      ctx.fillStyle = C.amber; ctx.fill(); ink(ctx, 6);
      ctx.beginPath(); ctx.moveTo(18, -13); ctx.lineTo(FLAP.len - 14, -13);
      ctx.strokeStyle = 'rgba(252,247,239,0.8)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(FLAP.hx, FLAP.hy, 12, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
    })();

    // ---- paddle lever
    (function paddle() {
      ctx.save();
      ctx.translate(PADDLE.hx, PADDLE.hy);
      ctx.rotate(PADDLE.rest + st.paddle);
      ctx.beginPath();
      ctx.moveTo(-PADDLE.len, -14); ctx.lineTo(16, -14);
      ctx.lineTo(16, 14); ctx.lineTo(-PADDLE.len, 14);
      ctx.closePath();
      ctx.fillStyle = C.teal; ctx.fill(); ink(ctx, 6);
      // catch lip at the far end
      ctx.beginPath();
      ctx.moveTo(-PADDLE.len, -14); ctx.lineTo(-PADDLE.len, -46);
      ctx.lineTo(-PADDLE.len + 18, -46); ctx.lineTo(-PADDLE.len + 18, -14);
      ctx.closePath(); ctx.fillStyle = C.cream; ctx.fill(); ink(ctx, 5);
      // counterweight
      ctx.beginPath(); ctx.arc(16, 0, 30, 0, Math.PI * 2);
      ctx.fillStyle = C.ink2; ctx.fill(); ink(ctx, 6);
      ctx.restore();
      ctx.beginPath(); ctx.arc(PADDLE.hx, PADDLE.hy, 13, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
    })();

    // ---- pinwheel (bracketed onto the ramp so it doesn't float)
    (function pinwheel() {
      ctx.beginPath(); ctx.moveTo(PINW.x, PINW.y + 18); ctx.lineTo(1168, 428); ink(ctx, 10);
      ctx.save();
      ctx.translate(PINW.x, PINW.y); ctx.rotate(st.pinwheel);
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -50); ctx.lineTo(-15, -50);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? C.red : C.cream; ctx.fill(); ink(ctx, 4);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = C.amber; ctx.fill(); ink(ctx, 5);
      ctx.restore();
    })();

    // ---- pressure gauge, upper right (one sweep per loop)
    (function gauge() {
      const gx = 1560, gy = 250, gr = 78;
      ctx.save();
      shadow(ctx, 18, 0.16, 6);
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fillStyle = C.cream; ctx.fill(); noShadow(ctx); ink(ctx, 7);
      ctx.beginPath(); ctx.arc(gx, gy, gr - 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(22,27,34,0.25)'; ctx.lineWidth = 3; ctx.stroke();
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(a) * (gr - 20), gy + Math.sin(a) * (gr - 20));
        ctx.lineTo(gx + Math.cos(a) * (gr - 32), gy + Math.sin(a) * (gr - 32));
        ink(ctx, i % 4 === 0 ? 5 : 3);
      }
      const a = Math.PI * 0.75 + ((1 - (st.gauge / (Math.PI * 2))) * Math.PI * 1.5);
      ctx.beginPath(); ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(a) * (gr - 24), gy + Math.sin(a) * (gr - 24));
      ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(gx, gy, 9, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      ctx.restore();
    })();

    // ---- impact rings
    for (const r of RINGS) {
      const d = t - r.t0;
      if (d >= 0 && d < r.dur) {
        const u = d / r.dur;
        ctx.beginPath();
        ctx.arc(r.x, r.y, lerp(r.r, r.r1, EASE.out(u)), 0, Math.PI * 2);
        ctx.strokeStyle = r.hue;
        ctx.globalAlpha = (1 - u) * 0.75;
        ctx.lineWidth = 5 * (1 - u) + 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ---- the marble
    drawMarble(ctx, st.mx, st.my, 26, st.squash);

    // ---- plaque
    (function plaque() {
      ctx.save();
      shadow(ctx, 16, 0.15, 6);
      roundRect(ctx, 1180, 156, 322, 72, 12);
      ctx.fillStyle = C.cream; ctx.fill(); noShadow(ctx); ink(ctx, 6);
      ctx.fillStyle = C.ink;
      ctx.font = '700 29px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MARBLE  MILL', 1341, 182);
      ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = C.ink2;
      ctx.fillText('No. 4  ·  self-resetting', 1341, 210);
      ctx.restore();
    })();

    ctx.restore();  // camera

    // ---- grain (fixed seed => identical every frame)
    if (!draw._grain) {
      const g = document.createElement('canvas'); g.width = W; g.height = H;
      const gc = g.getContext('2d');
      const rnd = mulberry32(20261018);
      for (let i = 0; i < 26000; i++) {
        gc.fillStyle = 'rgba(22,27,34,' + (0.012 + rnd() * 0.03).toFixed(3) + ')';
        gc.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
      draw._grain = g;
    }
    ctx.globalAlpha = 0.55;
    ctx.drawImage(draw._grain, 0, 0);
    ctx.globalAlpha = 1;

    // ---- vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, 620, W / 2, H / 2, 1300);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(60,42,24,0.30)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (DEBUG) {
      ctx.save();
      ctx.strokeStyle = 'rgba(220,40,40,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ROUTE[0][0], ROUTE[0][1]);
      for (let i = 1; i < ROUTE.length; i++) ctx.lineTo(ROUTE[i][0], ROUTE[i][1]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.font = '600 22px Consolas, monospace'; ctx.textAlign = 'left';
      ctx.fillText('t=' + t.toFixed(3) + '  s=' + ((track(t, S_KEYS))).toFixed(3) + '  riding=' + st.riding + '  θ=' + (st.theta * 180 / Math.PI).toFixed(1), 40, 60);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- expose
  let _ctx = null;
  function boot() {
    const cv = document.getElementById('stage');
    cv.width = W; cv.height = H;
    _ctx = cv.getContext('2d', { alpha: false });
  }
  window.seek = function (t) {
    if (!_ctx) boot();
    t = ((t % DUR) + DUR) % DUR;
    draw(_ctx, state(t));
  };
  window.MARBLE_MILL = { DUR, FPS, W, H, TOTAL };
  if (document.readyState !== 'loading') window.seek(0);
  else document.addEventListener('DOMContentLoaded', () => window.seek(0));
})();
