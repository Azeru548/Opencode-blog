# prose-rigor — OpenCode port of claude-blog's writing-quality core

Editorial quality review and rewrite for prose that is **not** a blog post:
debate entries, essays, contest submissions, reports, technical writing,
documentation. Four passes — hard-constraint gating, cognitive-load analysis,
two-tier editorial pattern review, heuristic rubric with P0–P3 severity —
plus an evidence contract. Hard length or format limits are treated as
blocking gates.

Ported from [`AgriciDaniel/claude-blog`](https://github.com/AgriciDaniel/claude-blog)
(MIT), which targets SEO blog publishing inside Claude Code. This port keeps
only the writing-quality methodology and discards the blog-specific machinery.

## What's kept, what's dropped

| Kept | Dropped |
|---|---|
| Cognitive-load assessment (`references/cognitive-load.md`) | SEO scoring, schema, OG tags, page speed |
| Two-tier editorial pattern review (`references/ai-slop-detection.md`) | E-E-A-T site signals, CMS integration |
| Ordinal heuristic rubric (`references/editorial-heuristics.md`) | Hero images, PDF rendering, Playwright pipeline |
| Synthesis / evidence contract (`references/synthesis-contract.md`) | 22 Python scripts, pytest suite |
| Rebalanced prose rubric (`references/prose-scoring.md`, written for this port) | 31 sub-skills, 5 agents, orchestrator, `/blog` commands |

See `SKILL.md` for the full contract and `NOTICE` for the attribution chain.

## Install (OpenCode)

Clone or copy this repo's contents into your OpenCode skills directory as
`prose-rigor`, so that `SKILL.md` lands at:

```
<opencode-config>/skills/prose-rigor/SKILL.md
```

Windows (PowerShell):

```powershell
git clone https://github.com/Azeru548/Opencode-blog.git "$env:USERPROFILE\.config\opencode\skills\prose-rigor"
```

Linux / macOS (bash):

```bash
git clone https://github.com/Azeru548/Opencode-blog.git ~/.config/opencode/skills/prose-rigor
```

Restart OpenCode (or reload skills) and invoke with `prose-rigor`, or let the
agent pick it up when asked to "improve", "tighten", "rewrite for quality" or
"review my draft".

## Use

```
Review my draft against its brief, then rewrite what the findings justify.
```

The skill measures hard constraints first (words, characters, mandated
structure), scores against the brief's own rubric when one exists, runs the
four passes, triages by severity (P0 blocks, P3 is polish), rewrites only
what the findings justify, and re-measures afterwards. A rewrite that scores
lower than the original is reported as `BLOCKING: true`, never silently kept.

## Provenance

Built by diffing the upstream repo file-by-file and extracting the four
methodology references plus a rebalanced rubric. No upstream code, scripts,
agents or installer are included. Verified with a strict portability grep
(`scripts/*.py`, `/blog` commands, `~/.claude`, `${CLAUDE_*}` — zero hits).

Battle-tested on a real contest submission (700-word debate entry, 18/18
structural checks, shipped under a 5,000-character hard cap).

## License

MIT. See `LICENSE`. Upstream attributions in `NOTICE` (required, not optional).
