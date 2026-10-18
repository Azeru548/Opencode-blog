# LOG — wurk-promo

- Scaffold copied from crosshatch demo; piece.json set to 1920x1080/24fps/30s/F4.
- Story check approved: F4 mission, 10 beats, flash-forward + rush + silence + payoff.
- Look check approved 3/3 (desk, agents, end card) after one redraw round
  (head/dot placement, hero-caption collision, end-card timing).
- Storyboard approved 10/10 after re-timing panels 3/4/6 to completed states
  and fixing an em-dash mojibake in the board title.
- Tiles: clean hard cuts on all sampled boundaries, deterministic: true.
- Export: 720 frames in 253s, audio + stems, final.mp4 + share.mp4 (11.4 MB).
- Review per-shot PASS table:
| Shot | Content | Result |
|---|---|---|
| 1 | flash-forward coin | PASS (sparse but reads) |
| 2 | buried desk | PASS |
| 3 | plan then post | PASS |
| 4 | humans review | PASS |
| 5 | agents dark world | PASS |
| 6 | approve + seal | PASS |
| 7 | 4x0.5s rush | PASS |
| 8 | silence hold | PASS (intentionally minimal) |
| 9 | payoff coin | PASS |
| 10 | logo end card | PASS |
- Review numbers: cuts 12/12 on grid; story arc 2/2; F4 4/5 (loop FAIL =
  justified exception: contest mandates logo+URL end card); TEXT 0 issues;
  SOUND loudest 26.0s payoff, 2.0s silence before, -14.6 LUFS, peak -1.0;
  dead beats 0; 1920x1080 H.264+AAC 30.02s.
- Review-tool config fixed mid-pass: cues.rush scalar->array, anchor removed
  (F5-only check, misconfigured). No artwork changes from either fix.
- densify pass: orbiting cards, rotating clock, drop-in pile, plan arrow,
  packets + cursor, breathing silence, orbiting payoff sparks, end dust,
  era pushes + rush/payoff bumps. Motion up (hook .2->.5, problem .6->1.2,
  agents .5->.7, dead-beat median 1.01->1.53); pacing unchanged by design.
- densify review caught TEXT regression (open caption pushed off-frame by
  era-0 zoom): zoom 1.08->1.04, caption moved to y=880. Re-tiled, verified.
- Owner assets: black W mark (alpha) swapped into end card, same framing.
- Final review: cuts 12/12, arc 2/2, F4 4/5 (loop exception stands:
  contest mandates logo+URL end card), TEXT PASS, SOUND -14.6 LUFS,
  dead beats 0, 1920x1080 H.264+AAC 30.02s.
- VOICE PASS 1: user requested voiceover. Script v1 (9 fragments) rejected
  by user as too thin; script v2 (68 words, product facts) approved.
- Re-timed to voice clock: 36.25s, cuts on 8ths, rush [24.75..26.25],
  silence 27.25-29.25, stab 29.25. Board v2 approved 10/10.
- Scratch whisper hangs on model download; proceeding on word-count
  estimates (2.9 w/s), re-measured against real takes on arrival.
- HELD: render waits for 9 ElevenLabs MP3s in video-job folder. Assembly,
  micro-adjust, export, review, serve follow. Cursor threshold moved 16.2->19.6.
- PACING FIX (recut v3): owner called v2 "too slow like a slide show"; root
  cause = every shot a wide (frame rules: one framing throughout = slideshow).
  Fix: wide->close insert alternation. Build beats now cut wide then CLOSE
  (same artwork via a tighter insert camera in bridges.js hold()), 17 shots,
  avg 2.13s vs 3.63s, 19 cuts vs 12, all still on the 8th grid. Story, voice
  clock and 10 beats unchanged; captions only draw on the wide half.
- Insert cues retimed to land ON their cuts: POST 10.25, PICKED 14.25,
  PAID 22.5, end 31.35, url 33.5; terminal typing 17.5->16.7 (wide was empty).
- Score: soft highpass tick on every wide->close cut + band hits on the two
  stamp payoffs; pencil tick moved 9.0->8.6 to the plan draw-on.
- VOICE TAKES FOUND: owner generated 8 of 9 lines into C:\Users\PC\Music\audio
  as 1/2/3/5/6/7/8/9.mp3 (line 4, "humans review", was never generated and
  is NOT on disk anywhere). Copied to voice/<id>.mp3, script.json got per-line
  "file". Verified 8 distinct takes (no dupes) and v2 text by duration.
- Real takes are slower than the 2.9 w/s estimate (trimmed: open 2.824, desk
  3.118, plan 3.605, agents 3.317, approve 4.660, rush 3.049, payoff 1.357,
  end 3.570; humans proxy 2.605) -> the v3 picture was too tight (approve would
  overrun the rush). RE-TIMED the picture to the voice clock (v4): every wide
  cut ~0.45s before its line, cuts still on the 8th grid, rush line holds a
  2.2s script gap = the silence beat, DURATION stays 36.25. piece.json "voice"
  set so export mixes voice over score (arc judged on audio-score.wav).
- human line still uses the SAPI scratch voice until 4.mp3 arrives; swap +
  re-run voice.mjs, and nudge later cuts by grid steps if the real length
  differs from the proxy by > ~0.25s.
- OWNER: "use what you have, make do" -> dropped the missing line 4 from the
  script instead of shipping a robotic placeholder (plan.after 0.35->3.3 holds
  every later line at its exact time; the humans beat is a 3.3s music-only
  beat carrying the fact on screen: caption "humans review the entries" +
  the PICKED stamp). 8 real takes, 61 words, voice.wav 35.60s over the score.
- SHIPPED: renders/share.mp4 = final.mp4, 870 frames in 176.2s, score +
  stems + voice mix, 13.9 MB, 1920x1080 H.264 + AAC stereo 36.27s.
  Copied to Desktop\wurk-promo.mp4 (localhost:8080 server refused connections,
  so served by copy instead). NOT YET SUBMITTED to job 64acb9f2a2c0182a.
- OWNER BUG REPORT: "no voice over, just the music". Root cause found by
  measuring, NOT by ear: the Desktop copy was made mid-mux (stale silent v3),
  so that was the first false alarm. The REAL bug: takes were mapped to script
  slots BY FILENAME NUMBER instead of by content. Verbatim content of the 8
  takes (transcribed, tiny model): 1=open, 2=desk, 3=plan, 5="Real humans
  review every entry and pick the winner" (= the humans line, not agents!),
  6="AI agents handle the rest..." (= agents, not approve), 7="Picked,
  approved, paid.", 8=payoff, 9=end. So voice/voice.wav played humans in the
  agents slot, agents in the approve slot, and take 7 in the rush slot.
  -> The "missing 4.mp3 / humans line" was a NUMBERING mismatch, not a missing
  take. Take 5 IS the humans line. script.json line 4 had been dropped on the
  false premise that it never existed.
  -> Also: take 7's text ("Picked, approved, paid.") matches NO line in
  script.json, and no take says "You approve the best work. Moderators keep it
  fair." => the owner recorded slightly different wording than script.json
  holds. Unresolved without the owner.
- LOG TOOLING LOSS: the animate skill + tools were removed from the machine
  (skills folder now empty) => no build.mjs/export.mjs/voice.mjs. The piece
  itself survives intact: src/*.js, index.html, piece.json, voice.json,
  voice/script.json, ALL 870 frames (frames/f0000..f0869.png), renders/final.mp4
  (39.9 MB master) + renders/share.mp4 + score stems. A scripted-entry source
  bundle is therefore recoverable.
- AUDIO-FIX (offline, ffmpeg only, no re-render, no downloads): rebuilt the
  voice track by cutting the already-trimmed segments out of voice/voice.wav
  and re-placing them by CONTENT:
    open 1.200 | desk 4.524 | plan 7.991 | humans 11.600 (fills the designed
    3.3s gap) | agents 14.950 | approve 19.750 (take 7) | payoff 28.871 |
    end 30.828. rush = no take => music only.
  Mixed over renders/audio-score.wav (bed -14 dB, sidechain ducked, loudnorm
  I=-14) -> renders/voice-fixed.wav + renders/audio-fixed.wav; video stream
  copied from share.mp4 (NO -shortest; the first attempt lost the last 1.2s of
  end card) -> Desktop\wurk-promo-fixed.mp4, 36.25s, 1920x1080 + AAC.
  Verified by level: humans -17.5 / agents -18.2 / approve -19.4 / rush -32.2
  (music only) / payoff -18.1 / end -18.0 dB.
- TWO OPEN JUDGEMENT CALLS for the owner: (a) take 7 placed in the approve
  beat (reads as approval) rather than the rush beat; (b) the rush beat
  ("Jobs. Contests. Services. Paid in USDC.") has no take and is music only.
  Both are a 2-minute audio-only re-run to change.
