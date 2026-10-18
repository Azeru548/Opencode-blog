// =====================================================================
//  SCENES — wurk-promo. World 1920x1080, 24fps, F4. Terracotta #d97757 is
//  reserved for the dot-hero / the job / the coin. Nothing else spends it.
//  Each build beat draws ONE artwork; mode 'wide' shows the caption, mode
//  'close' is the same drawing seen through the tighter insert camera in
//  src/bridges.js (so a "close-up" is a lens, not a second drawing).
// =====================================================================
function paperBG(key) {
  paint(box(-60, -60, W + 120, H + 120), { fill: C.paper, key: key, w: 3, line: C.ink, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 120 }] });
}
function caption(str, t, dark) {
  if (dark) monoText(str, CX - monoW(str, 44) / 2, H - 120, 44, C.white, { key: 'cap' + str.length });
  else inkCard(str, CX, H - 110, 76, { rot: 0.012, frac: ev(t, 0.6) });
}
function coin(x, y, r, key, frac) {
  paint(ellipsePts(x, y, r, r, 0, 48), { fill: C.yellow, key: key + 'c', line: C.ink, w: 4, tex: [{ k: 'hatch', a: 0.7, gap: 7, al: 0.3, dens: (px, py) => clamp((px + py - x - y) / (2 * r) + 0.4) }] });
  asterisk(x, y, r * 0.45, C.terra, key + 'a');
}

function sceneOpen(mode) {
  paperBG('open');
  const k = ev(TIMELINE.cues.open, 0.8);
  // mini task cards orbit and dissolve as the coin grows: what the coin came from
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + TT * 0.7, r = 330;
    ctx.save(); ctx.globalAlpha = Math.max(0, 0.8 - k);
    ctx.translate(CX + Math.cos(a) * r, 480 + Math.sin(a) * r * 0.6); ctx.rotate(a * 0.3);
    paint(box(-70, -48, 140, 96), { fill: C.paper, key: 'orb' + i, w: 2.5, line: C.ink });
    ctx.restore();
  }
  ink(ellipsePts(CX, 480, 230, 150, 0, 48), { w: 2.5, color: 'rgba(212,119,87,0.5)', key: 'ring' });
  coin(CX, 480, 150 * (0.6 + 0.4 * k), 'open', k);
  if (mode !== 'close') inkCard('earned.', CX, 880, 76, { rot: 0.012, frac: ev(TIMELINE.cues.open + 0.4, 0.6) });
}

function sceneDesk(mode) {
  woodSurface(-60, -60, W + 60, H + 60, 'desk', {});
  // wall clock, top right (time visibly passes while work piles)
  paint(ellipsePts(1700, 180, 90, 90, 0, 48), { fill: C.paper, key: 'clock', line: C.ink, w: 5 });
  ink([[1700, 180], [1700 + 60 * Math.sin(TT * 0.1), 180 - 60 * Math.cos(TT * 0.1)]], { w: 6, color: C.ink, key: 'ch' });
  ink([[1700, 180], [1700 + 50 * Math.sin(TT * 0.5 + 1), 180 - 50 * Math.cos(TT * 0.5 + 1)]], { w: 6, color: C.ink, key: 'cm' });
  // the buried human: back of head + shoulders, bottom left
  paint(ellipsePts(430, 830, 190, 200, 0, 48), { fill: C.skin, key: 'head', line: C.ink, w: 5, tex: [{ k: 'pencil', c: C.skinD, al: 0.5, per: 60 }] });
  paint(box(150, 920, 560, 220), { fill: C.teal, key: 'body', line: C.ink, w: 5, tex: [{ k: 'hatch', a: 0.9, gap: 8, al: 0.25, dens: (x, y) => clamp((y - 920) / 220) }] });
  // the pile: five task cards drop in one by one and settle
  for (let i = 0; i < 5; i++) {
    const f = ev(TIMELINE.cues.pile + i * 0.3, 0.4);
    if (f <= 0) continue;
    const e = EZ.io(f), drop = -260 * (1 - e) * (1 - e);
    ctx.save(); ctx.translate(950 + i * 130, 760 - i * 60 + drop); ctx.rotate(-0.08 + i * 0.035); ctx.globalAlpha = f;
    paint(box(-130, -90, 260, 180), { fill: i === 4 ? C.roseL : C.paper, key: 'card' + i, w: 3.5, line: C.ink, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 80 }] });
    ink([[-100, -40], [40 + i * 12, -40]], { w: 3, color: 'rgba(58,36,23,0.6)', key: 'cl' + i });
    ink([[-100, 10], [80 - i * 9, 10]], { w: 3, color: 'rgba(58,36,23,0.6)', key: 'cl2' + i });
    ctx.restore();
  }
  // sticky note verdict
  ctx.save(); ctx.translate(1420, 640); ctx.rotate(0.07);
  paint(box(0, 0, 300, 210), { fill: C.yellowL, key: 'sticky', w: 3, tex: [{ k: 'pencil', c: C.yellow, al: 0.5, per: 70 }] });
  handText('too much', 30, 90, 62, C.ink, { key: 'st1' });
  handText('work!', 30, 160, 62, C.ink, { key: 'st2' });
  ctx.restore();
  // coffee with live steam
  inkMug(240, 420, 80, 'mug');
  for (let s = 0; s < 2; s++) ink([[240 + s * 34 - 17, 330], [230 + s * 34 - 17, 280 + 8 * Math.sin(TT * 3 + s * 2)], [245 + s * 34 - 17, 230]], { w: 3, color: 'rgba(58,36,23,0.4)', key: 'steam' + s });
  // the dot, small and worried under the pile
  dotHero(800, 880, 62, { key: 'hero' });
  if (mode !== 'close') inkCard('too much work, too little time', CX, 150, 76, { rot: -0.012, frac: ev(TIMELINE.cues.desk + 0.4, 0.6) });
}

function scenePlan(mode) {
  paperBG('plan');
  // the dashed plan draws itself first (red pencil = plan, never the doing)
  planInk(rrectPts(CX - 420, 300, 840, 300, 26).map(p => p), { key: 'planbox', frac: ev(TIMELINE.cues.plan, 1.2) });
  handText('post one small job', CX - 330, 470, 72, C.red, { key: 'planword' });
  planInk([[CX, 600], [CX, 660]], { key: 'planarrow', frac: ev(TIMELINE.cues.post - 0.4, 0.4) });
  // then the doing: the dot pops onto a post button
  const p = popS(TIMELINE.cues.post);
  if (p > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, p);
    paint(rrectPts(CX - 190, 680, 380, 130, 65), { fill: C.green, key: 'postbtn', line: C.ink, w: 5 });
    handText('POST', CX - 105, 770, 72, C.paper, { key: 'postword' });
    dotHero(CX, 620, 54 * p, { key: 'hero' });
    ctx.restore();
  }
  if (mode !== 'close') caption('show the plan, then do it', TIMELINE.cues.plan + 0.3, false);
}

function sceneHumans(mode) {
  paperBG('humans');
  // three entries, one circled, one stamped
  for (let i = 0; i < 3; i++) {
    const y = 300 + i * 170;
    paint(rrectPts(CX - 520, y, 1040, 130, 18), { fill: C.paper, key: 'entry' + i, line: C.ink, w: 3.5 });
    ink([[CX - 470, y + 50], [CX - 100 + i * 60, y + 50]], { w: 3, color: 'rgba(58,36,23,0.55)', key: 'el' + i });
    ink([[CX - 470, y + 95], [CX - 250 - i * 40, y + 95]], { w: 3, color: 'rgba(58,36,23,0.4)', key: 'el2' + i });
  }
  const s = ev(TIMELINE.cues.stamp, 0.35);
  if (s > 0) {
    ctx.save(); ctx.translate(CX + 620, 470); ctx.rotate(-0.16); ctx.globalAlpha = s;
    ink(ellipsePts(0, 0, 130, 130, 0, 40), { w: 7, color: C.green, key: 'stamp' });
    handText('PICKED', -118, 28, 64, C.green, { key: 'stampword' });
    ctx.restore();
  }
  dotHero(CX - 700, 830, 72, { key: 'hero', mood: 'happy' });
  if (mode !== 'close') caption('humans review the entries', TIMELINE.cues.humans + 0.3, false);
}

function sceneAgents(mode) {
  darkWorld('agents');
  hexGrid({ x0: -60, y0: 640, x1: W + 60, y1: H + 60 }, 90, { key: 'hex' });
  for (let i = 0; i < 20; i++) { const R = RNG('st', i); star4(R.r(60, 1860), R.r(80, 560), R.r(4, 9) * (0.7 + 0.3 * ((B + i) % 2)), C.white); }
  // terminal, typed live
  paint(rrectPts(CX - 560, 250, 1120, 420, 20), { fill: C.navy2, key: 'term', line: C.peri, w: 3.5 });
  const lines = ['$ wurk submit', 'human: approved', 'agent: shipped it'];
  lines.forEach((str, i) => monoText(str, CX - 500, 350 + i * 110, 56, i === 0 ? C.white : (i === 1 ? C.glow : C.cyan), { key: 'tl' + i, count: Math.floor(clamp((TT - TIMELINE.cues.type - i * 0.5) / 0.5) * str.length) }));
  toolPill('Review', 'entries.wurk', 300, 770, TIMELINE.cues.agents + 0.4);
  toolPill('Ship', 'video.mp4', 1290, 770, TIMELINE.cues.agents + 0.9);
  // data packets travel the machine + a blinking cursor at the typed line
  for (let i = 0; i < 3; i++) {
    const px = ((TT * 260 + i * 640) % 2040) - 60;
    paint(ellipsePts(px, 950, 9, 9, 0, 16), { fill: C.glow, key: 'pkt' + i, line: C.glow, w: 2 });
  }
  if (TT > 16.6 && Math.floor(TT * 2.5) % 2 === 0) {
    ctx.fillStyle = C.cyan;
    ctx.fillRect(CX - 500 + monoW('agent: shipped it', 56) + 12, 570 - 44, 30, 48);
  }
  dotHero(CX, 845, 72, { key: 'hero', dark: true, mood: 'happy' });
  if (mode !== 'close') caption('humans and agents do the work', TIMELINE.cues.agents + 0.3, true);
}

function sceneApprove(mode) {
  paperBG('approve');
  paint(rrectPts(CX - 330, 250, 660, 480, 24), { fill: C.paper, key: 'win', line: C.ink, w: 5, tex: [{ k: 'hatch', a: 0.8, gap: 9, al: 0.2, dens: (x, y) => clamp((y - 250) / 480) }] });
  coin(CX, 430, 95, 'win', 1);
  handText('winner', CX - 130, 630, 72, C.ink, { key: 'winword' });
  const s = ev(TIMELINE.cues.seal, 0.3);
  if (s > 0) {
    ctx.save(); ctx.translate(CX + 430, 620); ctx.rotate(-0.14); ctx.globalAlpha = s;
    ink(ellipsePts(0, 0, 120, 120, 0, 40), { w: 7, color: C.green, key: 'seal' });
    handText('PAID', -95, 25, 60, C.green, { key: 'sealword' });
    ctx.restore();
  }
  if (mode !== 'close') caption('picked, approved, paid', TIMELINE.cues.approve + 0.3, false);
}

function sceneRush() {
  paperBG('rush');
  // four hard hits, one per beat: post, work, approve, pay
  const idx = Math.min(3, Math.floor((TT - TIMELINE.cues.rush[0]) / BEAT));
  const words = ['POST', 'WORK', 'APPROVE', 'PAY'];
  const cols = [C.red, C.peri, C.green, C.yellow];
  paint(box(CX - 330, 300, 660, 420), { fill: C.paper, key: 'rush' + idx, w: 6, line: cols[idx] });
  handText(words[idx], CX - handW(words[idx], 150) / 2, 580, 150, C.ink, { key: 'rushword' });
}

function sceneSilence() {
  paperBG('hush');
  // the dot waits at the payout slot: near-still, but breathing
  paint(rrectPts(CX - 150, 640, 300, 90, 14), { fill: C.wood, key: 'slot', line: C.ink, w: 4 });
  dotHero(CX, 560, 66, { key: 'hero' });
  ink(ellipsePts(CX, 560, 118 + 7 * Math.sin(TT * 2), 118 + 7 * Math.sin(TT * 2), 0, 48), { w: 2, color: 'rgba(212,119,87,0.45)', key: 'breath' });
}

function scenePayoff() {
  paperBG('payoff');
  const p = popS(TIMELINE.cues.payoff);
  coin(CX, 480, 170 * Math.min(1, p), 'pay', 1);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + TT * 1.5; star4(CX + Math.cos(a) * 300 * p, 480 + Math.sin(a) * 300 * p, 12, C.terra); }
  caption('done.', TIMELINE.cues.payoff + 0.3, false);
}

function sceneEnd(mode) {
  paperBG('end');
  for (let i = 0; i < 12; i++) { const R = RNG('dust', i); star4(R.r(80, 1840) + 14 * Math.sin(TT * 0.6 + i), R.r(80, 1000), 3.5, 'rgba(58,36,23,0.25)'); }
  if (mode === 'close') {
    // the mark alone, punched in: the reveal. No caption, no url.
    const k = ev(TIMELINE.cues.end, 0.7);
    ctx.save(); ctx.globalAlpha = k;
    drawAsset('wurk-mark.png', CX - 260, 200, 520, 520, { fit: 'contain' });
    ctx.restore();
    return;
  }
  const k = ev(TIMELINE.cues.url - 0.6, 0.8);
  ctx.save(); ctx.globalAlpha = k;
  drawAsset('wurk-mark.png', CX - 170, 70, 340, 340, { fit: 'contain' });
  const url = 'Explore wurk.fun';
  handText(url, CX - handW(url, 92) / 2, 640, 92, C.ink, { key: 'url', frac: ev(TIMELINE.cues.url, 0.5) });
  coin(CX - 560, 700, 60, 'end', 1);
  coin(CX + 560, 700, 60, 'end', 1);
  ctx.restore();
  if (mode !== 'close') caption('post it. done.', TIMELINE.cues.url + 0.5, false);
}
