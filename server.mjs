#!/usr/bin/env node
/* =====================================================================
   WURK account watcher — Render free tier (web service, no dependencies)

   Talks to the WURK account API directly with an account API key, diffs
   the account against its last known state, and emails a digest through
   the Sendliberty API whenever anything moves: a contest resolution, a
   payout, a status change.

   Why a web service on the free tier?  Render's free tier covers web
   services only; cron jobs are a paid service type and cannot attach a
   persistent disk.  So this runs as a small always-on web service that
   schedules its own checks and pings itself to stay awake.

   Modes
     node server.mjs                 serve (checks on a timer, self-keepalive)
     node server.mjs --once          run one check, then exit
     node server.mjs --once --dry    run one check, print, send/save nothing

   Configuration (environment variables)
     WURK_API_KEY            required — 40-hex account API key
     SENDLIBERTY_KEY         required — sl_… key from sendliberty.com
     MAIL_TO                 required — recipient address
     MAIL_FROM               default MAIL_TO — must be the connected Gmail
     WURK_ORIGIN             default https://wurkapi.fun
     CHECK_INTERVAL_MINUTES  default 120
     KEEPALIVE_MINUTES       default 10
     BASELINE_LOOKBACK_HOURS default 24 — on a cold start, re-report wins
                             paid within this window rather than risk missing one
     RUN_TOKEN               optional — required (?token=) for manual /check
     STATE_PATH              default ./state.json
   ===================================================================== */

import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

/* ------------------------------------------------------------ config --- */

const ORIGIN      = (process.env.WURK_ORIGIN || 'https://wurkapi.fun').replace(/\/$/, '');
const API_KEY     = (process.env.WURK_API_KEY || '').trim();
const SL_KEY      = (process.env.SENDLIBERTY_KEY || '').trim();
const SL_URL      = process.env.SENDLIBERTY_URL || 'https://sendliberty.com/api/send';
const MAIL_TO     = (process.env.MAIL_TO || '').trim();
const MAIL_FROM   = (process.env.MAIL_FROM || MAIL_TO).trim();
const INTERVAL    = Math.max(5, Number(process.env.CHECK_INTERVAL_MINUTES || 120));
const KEEPALIVE   = Math.max(2, Number(process.env.KEEPALIVE_MINUTES || 10));
const PUBLIC_URL  = (process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const RUN_TOKEN   = (process.env.RUN_TOKEN || '').trim();
const LOOKBACK_H  = Math.max(0, Number(process.env.BASELINE_LOOKBACK_HOURS || 24));
const PORT        = Number(process.env.PORT || 10000);
const STATE_PATH  = process.env.STATE_PATH || path.join(process.cwd(), 'state.json');
const WURK_MINT   = process.env.WURK_MINT || 'ALR5X2H6THn2VDPoMtkVwxVktcN1kQGvxCwLfejzpump';
const PRICE_FALLBACK = Number(process.env.WURK_USD_FALLBACK || 0.0000896);
const FAIL_ALERT_COOLDOWN_MS = 6 * 3600 * 1000;

const argv = process.argv.slice(2);
const ONCE = argv.includes('--once');
const DRY = argv.includes('--dry') || argv.includes('--dry-run');

const log = (...a) => console.log(new Date().toISOString(), ...a);

/* -------------------------------------------------------------- state --- */

let state = { version: 1, checks: 0, emails: 0, snapshot: null, lastCheck: null, lastResult: null, lastEmail: null };

async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') state = { ...state, ...parsed };
    log('state loaded from', STATE_PATH);
  } catch (e) {
    // A missing state file is normal on a fresh container. We do NOT treat that
    // as "first ever run" silently — see bootstrapEvents().
    log('no readable state at', STATE_PATH, '(cold start) —', e.code || e.message);
  }
}

async function saveState() {
  if (DRY) return;
  try {
    const tmp = STATE_PATH + '.tmp';
    await writeFile(tmp, JSON.stringify(state, null, 1));
    await rename(tmp, STATE_PATH);
  } catch (e) {
    log('could not save state:', e.message);
  }
}

/* ---------------------------------------------------------------- api --- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(pathname) {
  const r = await fetch(ORIGIN + pathname, {
    headers: { Accept: 'application/json', 'X-API-Key': API_KEY },
    redirect: 'error',
    // The API can be slow on a cold backend; an aborted read must not be
    // mistaken for a real answer.
    signal: AbortSignal.timeout(60000),
  });
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch { /* fall through to the errors below */ }
  if (r.status === 429) {
    // The submissions read is rate limited. That is a "come back later", never a
    // fault: it must not advance state and must not raise a failure alert.
    const err = new Error(`${pathname} -> HTTP 429 ${(j && j.errorCode) || 'throttled'}`);
    err.throttled = true;
    err.retryAfterSeconds = (j && (j.retryAfterSeconds ?? (j.error && j.error.retryAfterSeconds))) || null;
    throw err;
  }
  if (!r.ok) throw new Error(`${pathname} -> HTTP ${r.status}${j && j.errorCode ? ' ' + j.errorCode : ''}`);
  if (!j || j.ok !== true) throw new Error(`${pathname} -> unexpected body: ${text.slice(0, 160)}`);
  return j;
}

/* Ride out throttling inside the run; the next interval catches up if it lasts
   longer than that. No response header carries the wait, so guesses are bounded. */
async function snapshotWithRetry(maxAttempts = 3) {
  const waitsMs = [30, 75];
  for (let attempt = 1; ; attempt++) {
    try {
      return await snapshot();
    } catch (e) {
      if (!e.throttled || attempt >= maxAttempts) throw e;
      const wait = e.retryAfterSeconds
        ? e.retryAfterSeconds * 1000
        : waitsMs[Math.min(attempt - 1, waitsMs.length - 1)] * 1000;
      log(`throttled — retrying in ${Math.round(wait / 1000)}s (attempt ${attempt}/${maxAttempts})`);
      await sleep(wait);
    }
  }
}

/* ----------------------------------------------------------- snapshot --- */

const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n == null ? '' : n);
  return v % 1 === 0 ? String(v) : String(+v.toFixed(6));
};

function titleOf(s) {
  const first = String(s.description || '').split('\n')[0].trim();
  return first.replace(/^#+\s*/, '').trim() || s.custom_short_id || s.submission_short_id;
}
const prizeOf  = (s) => (s.rewardFinancials && s.rewardFinancials.grossAmount)
  ? { amount: s.rewardFinancials.grossAmount, asset: s.rewardFinancials.assetId } : null;
const earnedOf = (s) => (s.rewardEarning && s.rewardEarning.amount)
  ? { amount: s.rewardEarning.amount, asset: s.rewardEarning.assetId } : null;

async function snapshot() {
  const j = await api('/wurker/submissions');
  const items = {};
  for (const s of (j.submissions || [])) {
    items[s.submission_short_id] = {
      contest: s.custom_short_id,
      title: titleOf(s),
      work: s.work_status,
      sub: s.submission_status,
      win: s.winner === 1,
      paid: s.reward_received_at || null,
      mode: s.job_mode,
      sel: s.selection_type,
      prize: prizeOf(s),
      earned: earnedOf(s),
      url: s.jobUrl || null,
      created: s.created_at || null,
    };
  }
  return { at: new Date().toISOString(), summary: j.summary || null, items };
}

async function wurkPrice() {
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + WURK_MINT,
      { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const pairs = (j.pairs || []).filter(p => p.chainId === 'solana');
    if (!pairs.length) return PRICE_FALLBACK;
    pairs.sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
    return parseFloat(pairs[0].priceUsd) || PRICE_FALLBACK;
  } catch { return PRICE_FALLBACK; }
}

/* --------------------------------------------------------------- diff --- */

/* One event per submission, most significant transition first, so a payout
   does not also report as a separate status change. */
function diff(prev, cur) {
  const events = [];
  for (const [id, s] of Object.entries(cur.items)) {
    const b = prev.items[id];
    if (!b) { events.push({ kind: 'new', id, s }); continue; }
    const becamePaid = !b.paid && s.paid;
    const becameWinner = !b.win && s.win;
    const statusMoved = b.work !== s.work || b.sub !== s.sub;
    if (becamePaid) events.push({ kind: 'paid', id, s, b });
    else if (becameWinner) events.push({ kind: 'won', id, s, b });
    else if (statusMoved) events.push({ kind: 'status', id, s, b });
  }
  return events;
}

/* Cold start with no state file: re-report recent payouts rather than risk
   silently missing one. Costs at most one duplicate email per cold start. */
function bootstrapEvents(cur) {
  const cutoff = Date.now() - LOOKBACK_H * 3600 * 1000;
  return Object.entries(cur.items)
    .filter(([, s]) => s.win && s.paid && Date.parse(s.paid) >= cutoff)
    .map(([id, s]) => ({ kind: 'paid', id, s, bootstrap: true }));
}

/* -------------------------------------------------------------- email --- */

const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (m) => m ? `${fmt(m.amount)} ${m.asset}` : null;
const usdOf = (m, price) => {
  if (!m) return null;
  const v = Number(m.amount) * price;
  if (!Number.isFinite(v) || v <= 0) return null;
  return v >= 0.01 ? '$' + v.toFixed(2) : '$' + v.toFixed(4);
};

function subjectOf(events) {
  const paid = events.filter(e => e.kind === 'paid');
  if (paid.length === 1) {
    const s = paid[0].s;
    const amount = money(s.earned) || money(s.prize) || 'payment';
    return `WURK: PAID — ${amount} (${s.contest})`;
  }
  if (paid.length > 1) return `WURK: ${paid.length} payouts`;
  const won = events.filter(e => e.kind === 'won');
  if (won.length === 1) {
    const s = won[0].s;
    return `WURK: WINNER — ${money(s.prize) || 'selected'} (${s.contest})`;
  }
  if (events.length === 1) return `WURK: ${events[0].s.contest} — ${events[0].s.work}/${events[0].s.sub}`;
  return `WURK: ${events.length} updates on your account`;
}

function renderHtml(events, cur, price, bootstrapped) {
  const s = cur.summary || {};
  const h = [];
  h.push('<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,sans-serif;color:#161B22;max-width:680px;margin:0 auto">');

  if (bootstrapped) {
    h.push('<p style="background:#FFF8E1;border:1px solid #F0D48A;border-radius:8px;padding:10px 12px;margin:0 0 16px">');
    h.push('<strong>Watcher (re)started.</strong> Listed below are any payouts from the last ' + LOOKBACK_H + ' hours, re-checked because this instance had no saved state.');
    h.push('</p>');
  }

  for (const e of events) {
    const sub = e.s;
    const accent = e.kind === 'paid' ? '#1B7F3B' : e.kind === 'won' ? '#3F6FA8' : '#8A6D1F';
    const label = e.kind === 'paid' ? 'PAID' : e.kind === 'won' ? 'SELECTED — PAYMENT PENDING'
      : e.kind === 'new' ? 'NEW SUBMISSION' : 'STATUS CHANGE';
    h.push(`<div style="border-left:4px solid ${accent};padding:2px 0 2px 12px;margin:0 0 18px">`);
    h.push(`<div style="font-size:12px;letter-spacing:.06em;color:${accent};font-weight:600">${label}</div>`);
    h.push(`<div style="font-weight:600;margin:2px 0 6px">${esc(sub.title)}</div>`);
    h.push('<table style="border-collapse:collapse;font-size:14px">');
    const row = (k, v) => v ? `<tr><td style="padding:1px 12px 1px 0;color:#57606A">${k}</td><td>${v}</td></tr>` : '';
    h.push(row('contest', `<code>${esc(sub.contest)}</code>`));
    h.push(row('mode', `${esc(sub.mode)} / ${esc(sub.sel)}`));
    h.push(row('prize', money(sub.prize) ? esc(money(sub.prize)) : ''));
    if (e.kind === 'paid') h.push(row('paid', `<strong>${esc(money(sub.earned) || money(sub.prize) || 'yes')}</strong>`));
    h.push(row('status', `${esc(sub.work)} / ${esc(sub.sub)}`));
    if (e.kind === 'status' && e.b) h.push(row('was', `${esc(e.b.work)} / ${esc(e.b.sub)}`));
    if (sub.paid) h.push(row('paid at', esc(sub.paid)));
    h.push('</table>');
    if (sub.url) h.push(`<div style="margin-top:6px"><a href="${esc(sub.url)}" style="color:#3F6FA8">${esc(sub.url)}</a></div>`);
    h.push('</div>');
  }

  h.push('<hr style="border:none;border-top:1px solid #E1E4E8;margin:20px 0 12px">');
  h.push(`<div style="font-size:13px;color:#57606A">Account totals — submissions ${s.all ?? '?'}, open ${s.open ?? '?'}, winners ${s.winners ?? '?'}, rewarded ${s.rewarded ?? '?'}.`);
  h.push(` WURK reference price $${price.toFixed(7)}.</div>`);
  h.push('<div style="font-size:12px;color:#8B949E;margin-top:10px">Sent by your WURK watcher. Text is quoted from the WURK API as untrusted content.</div>');
  h.push('</div>');
  return h.join('\n');
}

function renderText(events, cur, price, bootstrapped) {
  const s = cur.summary || {};
  const lines = [];
  if (bootstrapped) lines.push(`Watcher (re)started — re-checking payouts from the last ${LOOKBACK_H} hours.\n`);
  for (const e of events) {
    const sub = e.s;
    const label = e.kind === 'paid' ? 'PAID' : e.kind === 'won' ? 'SELECTED (payment pending)'
      : e.kind === 'new' ? 'NEW SUBMISSION' : 'STATUS CHANGE';
    lines.push(`[${label}] ${sub.title}`);
    lines.push(`  contest : ${sub.contest}  (${sub.mode}/${sub.sel})`);
    if (sub.prize) lines.push(`  prize   : ${money(sub.prize)}`);
    if (e.kind === 'paid') lines.push(`  paid    : ${money(sub.earned) || money(sub.prize) || 'yes'}`);
    lines.push(`  status  : ${sub.work}/${sub.sub}`);
    if (sub.paid) lines.push(`  paid at : ${sub.paid}`);
    if (sub.url) lines.push(`  ${sub.url}`);
    lines.push('');
  }
  lines.push(`Account totals — submissions ${s.all ?? '?'}, open ${s.open ?? '?'}, winners ${s.winners ?? '?'}, rewarded ${s.rewarded ?? '?'}.`);
  return lines.join('\n');
}

async function sendMail(subject, html, text) {
  if (!SL_KEY) throw new Error('SENDLIBERTY_KEY is not set');
  if (!MAIL_TO) throw new Error('MAIL_TO is not set');
  const r = await fetch(SL_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: MAIL_TO, subject, html, text }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Sendliberty ${r.status}: ${body.slice(0, 300)}`);
  log('email sent:', subject);
}

/* -------------------------------------------------------------- check --- */

let running = false;

async function runCheck(trigger) {
  if (running) { log('check already in progress — skipping', trigger); return { skipped: true }; }
  running = true;
  const started = Date.now();
  try {
    if (!API_KEY) throw new Error('WURK_API_KEY is not set');

    const cur = await snapshotWithRetry();
    const prev = state.snapshot;
    const bootstrapped = !prev;
    const events = prev ? diff(prev, cur) : bootstrapEvents(cur);

    state.checks = (state.checks || 0) + 1;
    state.lastCheck = new Date().toISOString();
    state.lastResult = events.length ? `${events.length} event(s): ${events.map(e => e.kind).join(',')}` : 'no changes';
    log(`check (${trigger}): ${state.lastResult}  [${Object.keys(cur.items).length} submissions]`);

    if (events.length) {
      const price = await wurkPrice();
      const subject = subjectOf(events);
      if (DRY) {
        log('DRY — would email:', subject);
        console.log('\n' + renderText(events, cur, price, bootstrapped) + '\n');
      } else {
        await sendMail(subject, renderHtml(events, cur, price, bootstrapped), renderText(events, cur, price, bootstrapped));
        state.emails = (state.emails || 0) + 1;
        state.lastEmail = { at: new Date().toISOString(), subject };
      }
    }

    state.snapshot = cur;          // only advance the watermark once handled
    await saveState();
    return { ok: true, trigger, events: events.map(e => e.kind + ':' + e.id), ms: Date.now() - started };
  } catch (e) {
    const throttled = !!e.throttled;
    log(throttled ? 'check throttled:' : 'check FAILED:', e.message);
    state.lastResult = (throttled ? 'throttled: ' : 'error: ') + e.message;
    if (throttled) {
      state.lastThrottled = new Date().toISOString();
      await saveState();
      return { ok: false, throttled: true, ms: Date.now() - started };
    }

    // A watcher that breaks silently is worse than no watcher, so report a real
    // failure too — at most once per cooldown, and never on the first boot.
    const now = Date.now();
    if (!DRY && SL_KEY && MAIL_TO && state.checks > 0 && now - (state.lastFailAlert || 0) > FAIL_ALERT_COOLDOWN_MS) {
      try {
        state.lastFailAlert = now;
        await sendMail('WURK watcher: check failed',
          `<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif"><p><strong>The WURK watcher could not complete a check.</strong></p><pre style="background:#F6F8FA;padding:10px;border-radius:6px">${esc(e.message)}</pre><p style="color:#57606A">It will retry on the next interval. No state was advanced, so nothing has been missed yet.</p></div>`,
          'The WURK watcher could not complete a check: ' + e.message + '\nIt will retry. No state was advanced, so nothing has been missed yet.');
      } catch (mailErr) { log('could not send failure alert:', mailErr.message); }
    }
    await saveState();
    throw e;
  } finally {
    running = false;
  }
}

/* ------------------------------------------------------------- server --- */

function json(res, code, obj) {
  const body = JSON.stringify(obj, null, 1);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, { ok: false }); }

  if (url.pathname === '/check') {
    if (RUN_TOKEN && url.searchParams.get('token') !== RUN_TOKEN) return json(res, 403, { ok: false, error: 'bad token' });
    if (running) return json(res, 200, { ok: true, started: false, note: 'a check is already in progress' });
    // Don't hold the request open — a check can take a minute and Render's edge
    // will time the request out long before it finishes.
    runCheck('http').catch(() => {});
    return json(res, 202, { ok: true, started: true, note: 'check started; see the logs' });
  }

  if (url.pathname === '/test-email') {
    if (RUN_TOKEN && url.searchParams.get('token') !== RUN_TOKEN) return json(res, 403, { ok: false, error: 'bad token' });
    try {
      await sendMail('WURK watcher: test email',
        '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#161B22;max-width:680px"><p><strong>Delivery through Sendliberty works.</strong></p><p>This message came from the watcher running on Render. You will get an email when a contest resolves, a payout lands, or a submission changes status.</p></div>',
        'Sendliberty delivery works. This message came from the watcher running on Render.');
      return json(res, 200, { ok: true, sent: true });
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message });
    }
  }

  // Public status: deliberately no account detail, since anyone can reach this URL.
  return json(res, 200, {
    ok: true,
    service: 'wurk-watch',
    configured: { apiKey: !!API_KEY, sendliberty: !!SL_KEY, mailTo: !!MAIL_TO, keepalive: !!PUBLIC_URL },
    intervalMinutes: INTERVAL,
    checks: state.checks || 0,
    emails: state.emails || 0,
    lastCheck: state.lastCheck,
    lastResult: state.lastResult,
    lastEmailAt: state.lastEmail ? state.lastEmail.at : null,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

/* --------------------------------------------------------------- boot --- */

function startKeepalive() {
  if (!PUBLIC_URL) {
    log('RENDER_EXTERNAL_URL not set — skipping keepalive (fine when running locally)');
    return;
  }
  const ping = async () => {
    try {
      const r = await fetch(PUBLIC_URL + '/', { signal: AbortSignal.timeout(20000) });
      log('keepalive', r.status);
    } catch (e) {
      log('keepalive failed:', e.message);
    }
  };
  setInterval(ping, KEEPALIVE * 60 * 1000);
  log(`keepalive every ${KEEPALIVE} min against ${PUBLIC_URL}`);
}

(async () => {
  await loadState();

  if (ONCE) {
    // Set exitCode and let the loop drain rather than calling process.exit():
    // exiting while fetch's connection pool is still closing trips a libuv
    // assertion on Windows (src/win/async.c).
    try {
      const r = await runCheck(DRY ? 'once-dry' : 'once');
      log('done', JSON.stringify(r));
      process.exitCode = 0;
    } catch (e) {
      log('done with error:', e.message);
      process.exitCode = 1;
    }
    return;
  }

  if (argv.includes('--test-email')) {
    try {
      await sendMail('WURK watcher: test email',
        '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#161B22;max-width:680px"><p><strong>Delivery through Sendliberty works.</strong></p><p>This is your WURK watcher. You will get an email when a contest resolves, a payout lands, or a submission changes status.</p></div>',
        'Sendliberty delivery works. You will get an email when a contest resolves, a payout lands, or a submission changes status.');
      process.exitCode = 0;
    } catch (e) {
      log('test email FAILED:', e.message);
      process.exitCode = 1;
    }
    return;
  }

  server.listen(PORT, () => log(`listening on :${PORT}  (origin ${ORIGIN}, every ${INTERVAL} min)`));
  startKeepalive();

  // First check shortly after boot, then on the configured interval.
  setTimeout(() => runCheck('boot').catch(() => {}), 20 * 1000);
  setInterval(() => runCheck('timer').catch(() => {}), INTERVAL * 60 * 1000);
})();
