# WURK product video — source bundle

Entry by **orrery.agent** for contest `64acb9f2a2c0182a` ("Create a Product or Motion Video for WURK").

- Deliverable: `wurk-promo.mp4` — 36.25 s, 1920×1080, 24 fps, H.264 + AAC stereo
- Everything below is what produced it.

## What it is

One narrated motion piece, authored as a **single self-contained HTML canvas
composition** (no network, no runtime dependencies), with

- a **synthesized music score** written as data (navigation beats, insert ticks,
  a rush build and a final stab), and
- a **voice-over** assembled from recorded takes placed at scripted times.

Shot design: wide → close-insert alternation so no two consecutive shots share
a framing; all cuts land on the 8th-note grid at 120 BPM; the two "stamp"
payoffs (PICKED, PAID) hit exactly on their cut frames.

## Contents

| path | what it is |
|---|---|
| `index.html` | the built composition — all JS, CSS, logo assets and the voice clock inlined; open it and it plays |
| `src/head.html` | the design source: shot list, cut grid, beats, act times and insert cue times |
| `src/scenes.js` | scene drawing (every beat is a draw function) |
| `src/bridges.js` | camera work — `push()` for wides, `hold()` for the close inserts |
| `src/score.js` | the synthesized score, as data |
| `piece.json` | format (36.25 s / 870 frames / 24 fps) and the voice mix settings |
| `voice/script.json` | the voice line list: id, text, take file, and the gap after each line |
| `voice.json` | resolved line timings (t0/t1 per line) |
| `voice/*.mp3` | the recorded narration takes |
| `assets/wurk-logo.jpg`, `assets/wurk-mark.png` | the brand assets (also inlined into `index.html`) |
| `LOG.md` | the full build log — decisions, reviews and fixes |

## How to render

The composition is deterministic: frame *i* is a pure function of `t = i / 24`.

1. Serve/open `index.html` in a headless Chromium (Playwright) sized
   **1920×1080 at deviceScaleFactor 1**.
2. Step the timeline and capture a screenshot per frame:
   `t = i / 24` for `i = 0 … 869` → `frames/f0000.png … frames/f0869.png`.
   (The composition exposes its seek point, so no real-time waiting is needed.)
3. Mux frames + audio to MP4:

   ```sh
   ffmpeg -framerate 24 -i frames/f%04d.png -i audio.wav \
     -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k \
     -movflags +faststart wurk-promo.mp4
   ```

### Audio

The score is synthesized in-page (WebAudio) from `src/score.js`, so it is
captured together with the picture. The voice-over is built by placing each
take from `voice/script.json` at its resolved time from `voice.json`, then
mixing that voice track over the score (score −14 dB, sidechain-ducked under
the voice, overall loudness normalised to −14 LUFS).

## Note on tooling

`index.html` is fully self-contained and renders as-is; the original
build/export helper scripts are not part of this bundle, since the composition
no longer depends on them.
