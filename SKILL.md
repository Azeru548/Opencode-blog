---
name: prose-rigor
description: Editorial quality review and rewrite for prose that is not a blog post - debate entries, essays, contest submissions, reports, technical writing, cover letters, documentation. Four passes: cognitive-load analysis, two-tier editorial pattern review (first-order phrase tics + second-order structural rhythm), an ordinal 0-4 heuristic rubric with P0-P3 severity, and a synthesis/evidence contract. Use when asked to "improve", "tighten", "rewrite for quality", "review my draft", or to score prose before submission. Hard length or format constraints are treated as blocking gates.
---

# prose-rigor

Editorial quality review and rewrite for prose that is **not** a blog post.

Adapted from [`AgriciDaniel/claude-blog`](https://github.com/AgriciDaniel/claude-blog)
(MIT), which targets SEO blog publishing. This port keeps only the writing-quality
core and discards the blog-specific machinery: SEO scoring, schema markup, OG tags,
page speed, E-E-A-T site signals, CMS integration, hero images, PDF rendering and
the Python/Playwright delivery pipeline.

Upstream provenance for each reference is preserved in its own attribution block.

## When to use

- Improving, tightening or rewriting a draft for quality
- Reviewing prose before a submission with a hard word or character limit
- Scoring a draft against a rubric and producing a prioritized fix list
- Removing AI-sounding structural tics that survive vocabulary edits

## When NOT to use

- Blog posts, landing pages or web content → use the original `claude-blog` suite
  or `impeccable`; this port deliberately drops SEO, schema and technical-page checks
- Fact-checking a draft against live sources → `blog-factcheck` / `web-research`
- Content strategy, calendars or topic clustering → not ported

## The four passes

Run them in this order. Earlier passes change what later passes see.

### 1. Hard constraints (blocking)

Before any style work, extract every hard limit from the brief and treat failure as
**P0**. A draft that is beautifully written but over the character cap cannot be
submitted at all.

- Word count window (soft: aim inside, prefer the middle)
- Character cap (hard: never exceed)
- Required structure (numbered arguments, mandated headings, fixed sections)
- Required declarations (author, position, disclosure)
- Banned content (invented citations, required exclusions)

Report these first. Measure them; do not estimate.

### 2. Cognitive load

Per-section concept density against the working-memory ceiling (~4 held items,
Cowan 2001). See `references/cognitive-load.md`.

Thresholds per 100 words: new entities 1-3 healthy / 4-6 borderline / 7+ overloaded;
numeric claims 1-3 / 4-5 / 6+; new jargon 0-1 / 2-3 / 4+; nested clauses per sentence
<1.5 / 1.5-2.5 / >2.5. Two or more overloaded rows in one section = P1.

Adapt the jargon list mentally to the domain. For a political-economy piece the jargon set
is terms like *marginal product*, *calculation problem*, *legitimacy*, *post-scarcity*.

### 3. Two-tier editorial pattern review

First-order = phrase and lexical tics. Second-order = **structural and rhythmic
patterns that a vocabulary swap does not fix.** See `references/ai-slop-detection.md`.

The second-order pass is the valuable one. A draft can score zero on every trigger
phrase and still be structurally monotonous. Count repeated sentence openers,
identical clause rhythms, hedge stacks, false-balance framings and
meta-commentary that announces its own importance.

**This pass is advisory.** It never infers authorship and never blocks delivery.
A repeated opener is a finding, not a verdict; keep the ones the format mandates
and vary the ones the writer chose.

### 4. Heuristic rubric and severity triage

Ordinal 0-4 per heuristic, tagged P0-P3. See `references/editorial-heuristics.md`
and `references/prose-scoring.md`.

Severity, in the upstream's own terms:

| Tag | Meaning |
|---|---|
| **P0** | Blocking. Fabricated evidence, unsupported load-bearing claim, plagiarism risk, broken primary structure, or any hard-constraint violation. |
| **P1** | Urgent remediation. Important but non-blocking, after every P0 is classified. |
| **P2** | Publish then iterate. Weak opener, suboptimal ordering. |
| **P3** | Nice to have. Cosmetic or stylistic preference. |

P0 is the only absolute blocker. Most competent drafts land 2-3 across the board.

## Evidence contract

When the prose makes factual claims, `references/synthesis-contract.md` applies.
The load-bearing rules for non-blog prose:

- **Never invent a source, title, statistic or citation.** If the brief forbids
  invented references, an invented citation is P0 by definition.
- **Do not upgrade certainty.** "Can" is not "will"; an announced capability is not
  an observed behavior; a proposal is not a policy.
- **Label inference explicitly.** An argument is not evidence. A speculative
  example is not a historical claim.
- **No em dash (U+2014), en dash (U+2013) or ` -- `.** Use ` - ` or real punctuation.
  This is the single most reliable generated-prose tell upstream found.

## How to run a review

1. **Measure first.** Word count, character count, structural compliance. Hard numbers.
2. **Load the brief's rubric** if one exists. Score against *its* weighting, not a
   generic one. A contest rubric that says "originality 25%" means generic-but-flawless
   prose loses to distinctive prose with one weak paragraph.
3. **Run passes 2-4** and report findings with line-level examples.
4. **Triage by severity.** P0 list first, then P1. Do not bury a blocker under polish notes.
5. **Rewrite only what the findings justify.** Preserve mandated structure exactly.
6. **Re-measure.** Confirm hard constraints still hold after the rewrite.
7. **Never silently lower a score.** If a rewrite regresses, say so.

## Reporting format

```
## Constraints
[measured] words / chars / structural compliance  PASS|FAIL

## Rubric
[the brief's own categories and weights, scored]

## Cognitive load
[per-section table, overloaded sections flagged P1]

## Editorial pattern review
### First-order (phrase + lexical)
### Second-order (structural + rhythmic)
### Editorial judgment
[patterns cut vs patterns kept, and why]

## Severity triage
P0: [...] P1: [...] P2: [...] P3: [...]

## Rewrite
[the revised draft, or nothing if not asked for]
```

## Attribution

- `references/editorial-heuristics.md` — adapted from Nielsen's 10 Usability
  Heuristics via the `impeccable` plugin (Paul Bakaus, Apache 2.0).
- `references/cognitive-load.md` — three-load model (Sweller 1988), four-item
  working-memory ceiling (Cowan 2001), adapted from `impeccable` (Apache 2.0).
- `references/ai-slop-detection.md` — two-tier reflex methodology, adapted from
  `impeccable` (Apache 2.0). Advisory only; never an authorship classifier.
- `references/synthesis-contract.md` — adapted from `last30days-skill` v3.2.1
  (Matt Van Horn, MIT), re-grounded by claude-blog.
- `references/prose-scoring.md` — adapted from claude-blog's `quality-scoring.md`,
  with the SEO / technical / E-E-A-T-site / AI-citation categories removed and the
  remainder rebalanced to 100.
