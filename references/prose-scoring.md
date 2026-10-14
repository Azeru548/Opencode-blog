# Prose Quality Scoring Checklist

Adapted from claude-blog's `quality-scoring.md` (MIT). Upstream scores blog posts
across Content (30) / SEO (25) / E-E-A-T (15) / Technical (15) / AI Citation (15).
Those last four categories describe a **web page and its site**, not prose. For
essays, debate entries, reports and contest submissions they are noise.

This port removes them and rebalances the surviving editorial criteria to 100.

## Content Quality (40 points)

| Check | Points | Pass criteria |
|---|---|---|
| Argument depth and causal reasoning | 12 | Claims name a mechanism, not just an outcome. Each step is one the reader can check. No assert-then-move-on. |
| Coverage of the brief | 10 | Every required element present and in the mandated order. Nothing the brief asked for is missing. |
| Originality and specificity | 8 | Distinctive claims, named examples, concrete detail. Generic-but-flawless prose scores low here by design. |
| Readability for the audience | 6 | Sentence construction suits the intended reader. Flesch 60-70 is a default band, not a target; technical or specialist writing may justify denser prose. |
| Grammar and clarity | 4 | Clean prose, controlled passive voice, unambiguous referents. |
| Engagement and flow | 4 | Opens earn attention, sections transition on logic rather than filler, close with force. |

## Constraint Compliance (25 points)

Blog scoring has no equivalent: it scores posts that are already the right shape.
Prose submitted to a brief with hard limits must fit them or it is discarded unread.

| Check | Points | Pass criteria |
|---|---|---|
| Length compliance | 8 | Inside the stated window. A hard cap is never exceeded; a soft window is respected. |
| Structural compliance | 8 | Every mandated section, heading, numbering scheme and ordering present and correct. |
| Required declarations | 5 | Author/agent identity, position, disclosure, sourcing statement — whatever the brief demands. |
| Character/format safety | 4 | No forbidden characters, no broken markup, no truncation at the field boundary. |

## Evidence Integrity (20 points)

| Check | Points | Pass criteria |
|---|---|---|
| No fabricated sources | 8 | Zero invented citations, statistics, titles or references. **Any violation is P0 regardless of points.** |
| Certainty is preserved | 5 | "Can" not "will"; proposal not policy; capability not observed behavior. Inference is labeled as inference. |
| Speculation is marked | 4 | Hypotheticals, forecasts and fictional constructions are visibly framed as such. |
| Assumptions are named | 3 | Load-bearing assumptions are stated, not buried. |

## Structure and Reasoning (15 points)

| Check | Points | Pass criteria |
|---|---|---|
| Coherence of the through-line | 5 | Sections build on each other; the close pays off the open. |
| Self-critique quality | 4 | Objections raised are genuinely strong, not strawmen dressed as steelmen. |
| Terminology consistency | 3 | One term per concept throughout. No arbitrary drift between near-synonyms. |
| Scannability without fragmentation | 3 | A reader can find the argument of any section without reading the whole; prose is not chopped into unearnable fragments. |

## Rhythm and Distinctiveness (10 points)

| Check | Points | Pass criteria |
|---|---|---|
| Sentence-shape variation | 4 | No metronomic repetition of clause rhythm across a section. |
| Opening-word variety | 3 | Repeated sentence openers are used deliberately, not by drift. |
| No meta-commentary | 3 | The prose never announces that a point is important; the point carries its own weight. |

## Total: 100 points

### Thresholds

| Threshold | Value | Where it applies |
|---|---|---|
| Submit gate | Overall 85+ **and** zero P0 | Default floor before handing a draft to the user. A brief may set its own bar. |
| Rating bands | 90-100 Exceptional, 80-89 Strong, 70-79 Acceptable, 60-69 Below Standard, <60 Rewrite | Labels only. |
| Regression rule | New score must not be lower than the original | A rewrite that drops the score sets `BLOCKING: true` until explained or reverted. |

### Scoring a draft against a brief's own rubric

**When the brief supplies its weighting, use the brief's, not this table.** A contest
that scores "depth and causal reasoning 30%, originality 25%, self-critique 20%,
coherence 15%, clarity 10%" is telling you exactly what it values. Map your review
onto those five and report against them.

The generic table above is for drafts with **no** supplied rubric.

### Hard-constraint precedence

Constraint Compliance is scored out of 25 but its failures are **P0**, which means
they override everything: a 97 that cannot be submitted scores worse in practice
than an 88 that can. Report constraints first, always as measured numbers.

### Draft-stage scoring

Score only from evidence in the draft. Do not award points for things the format
cannot carry, and do not silently drop the category — report it as not-applicable
with the reason. A 500-word debate entry has no hero image, no byline page and no
internal links, and should not be marked down for it.
