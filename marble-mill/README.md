# MARBLE MILL — source & render bundle

Entry for contest `160cf6dc42c88806` — **"Build the Most Satisfying Machine"**.

- **Deliverable:** `marble-mill.mp4` — 12.00 s, 1920×1080, 30 fps, H.264/AAC
- **Loop:** seamless. The last frame continues into the first with no cut.
- Everything needed to rebuild it is in this bundle.

---

## The machine

One marble runs a **closed circuit**, and every part is driven by the same
gear train — so it reads as a single machine rather than a chain of lucky
accidents.

```
   0.0 -> 1.2 s   the bucket wheel carries the marble to the top; the cup is
                  rolled over by the hopper lip and tips it in
   1.2 -> 3.6 s   the marble drops through the HOPPER and runs RAMP A across
                  the top, knocking the pinwheel on the way past
   3.7 -> 4.4 s   it lands on the TRAPDOOR FLAP, which drops and lets it
                  through the gap in the chute
   4.4 -> 5.5 s   it slides down the lower chute
   5.5 -> 5.8 s   the PADDLE catches it, tips under its weight and sends it
                  back to the left
   5.8 -> 7.4 s   RAMP C carries it across the middle and curves it down into
                  the cup at the bottom of the wheel
   7.4 -> 12.0 s  the wheel lifts it home  ==  t = 0
```

The two tipping elements (trapdoor, paddle) are actuated by **cams on a
camshaft** that runs off the drive gear, and the pushrods are drawn back to
those cams — so the motion is motivated, not magic.

**The loop closes because the machine closes it.** The marble's circuit ends
exactly where it began: the cup delivers it to the hopper from above, and the
wheel takes it back up from below. Nothing is teleported and nothing is
crossfaded.

## Why the loop is mathematically seamless

The composition is a pure function of time, `frame(t)`, and every animated
value is a keyframe track over a 12 s period that **returns to its starting
value at t = 12**:

- the wheel's angle is keyed `270° → 630°`, exactly **+360°** — one full
  revolution per loop, so its pose is identical at the start and the end;
- the trapdoor, paddle, gate, pinwheel, gauge and belt all terminate on the
  value they started from;
- the camera "breath" is `sin(2π·t/12)` — one whole cycle;
- the score is built the same way: tone frequencies are exact integer
  multiples of `1/12 Hz`, and the bed finishes silently before the file ends.

Measured on the rendered frames, the loop seam is a **35.06 dB** PSNR
difference, which sits between one normal frame step (36.12 dB) and one
fast-motion frame step (25.92 dB) — i.e. the seam carries exactly as much
motion as any other frame boundary, and no more.

## Contents

| path | what it is |
|---|---|
| `index.html` | the stage — a single 1920×1080 canvas |
| `src/machine.js` | the whole composition: geometry, the marble route, every keyframe track, and all drawing |
| `tools/render.cjs` | captures the loop to a PNG sequence via headless Chromium |
| `tools/score.cjs` | synthesises `score.wav` from scratch (no samples, no downloads) |
| `tools/shots.cjs` | renders chosen moments to PNG (revision aid) |
| `tools/sheet.cjs` | renders a contact sheet across the loop (revision aid) |
| `tools/route.cjs` | prints the arc-length fraction at each point of the marble's route |
| `out/score.wav` | the finished 12 s score |

## How to render

Requires Node and a Chromium that Playwright can launch, plus `ffmpeg`.

```sh
# 1. frames  -> out/frames/f0000.png … f0359.png   (~12 min, 1080p)
NODE_PATH=<your global node_modules> node tools/render.cjs 30

# 2. score   -> out/score.wav
node tools/score.cjs

# 3. encode
ffmpeg -y -framerate 30 -i out/frames/f%04d.png -i out/score.wav \
  -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -movflags +faststart -shortest out/marble-mill.mp4
```

Frame *i* is `seek(i / 30)`, so the render is deterministic and repeatable —
there is no real-time screen capture anywhere in the pipeline.

To inspect the work, `index.html#debug` overlays the marble's route and the
live track values.

## Tools

- **Composition:** hand-written HTML5 canvas + vanilla JavaScript. No
  framework, no runtime dependencies, no network access.
- **Authoring model:** every moving part is a keyframe track with a named
  easing; the marble's path is a single arc-length-parameterised polyline that
  doubles as the running surface of each drawn chute, so the ball can never
  drift off its own ramp.
- **Capture:** Playwright driving Chromium, one screenshot per frame.
- **Score:** additive and noise synthesis in plain Node (no audio libraries).
- **Encode:** ffmpeg (libx264 / AAC, loudness-normalised to −14 LUFS).
