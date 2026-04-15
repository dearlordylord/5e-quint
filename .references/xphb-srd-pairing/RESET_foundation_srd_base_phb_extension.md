# Reset: SRD Base, PHB Extension

Purpose:

- correct the pairing foundation after the book overreached;
- restate the actual architectural boundary implied by the repo and local licensing constraints;
- separate public base mechanics from private extension research cleanly.

## 1. Public Base vs Private Extension

The correct starting point is:

- SRD 5.2.1 is the public mechanical base for this repo;
- PHB content outside the SRD is a private extension corpus used for local pairing and extension-surface research;
- the existence of private extension content does not change the repo's public content boundary.

This means the right framing is not ``two equal corpora looking for a common runtime.''
It is:

- one public base corpus whose mechanics must remain canonical in the repo;
- one broader private corpus used to discover what extension pressure exists beyond the public base.

## 2. Why The PHB Work Stays Local

The PHB-side research is local because the content is licensed and cannot safely be treated like public repo material.

Practical rule:

- the public repo can formalize SRD mechanics;
- PHB-side mining, inventories, and extension analysis stay in local/private research unless the result is transformed into a non-infringing architectural conclusion.

This is not an aesthetic preference.
It is a licensing boundary.

## 3. The PHB Is Still A Book

The PHB must not be mentally reduced to 5etools JSON.

Important correction:

- the PHB is book-shaped, with chapters and glossary structure, just like the SRD;
- the 5etools JSON is only one structured input view over that book;
- tags and JSON nesting are useful only when cross-referenced against real chapter structure, glossary terms, and later taxonomy needs.

So:

- PHB chapter structure matters;
- PHB glossary structure matters;
- 5etools tags matter only as extraction aids, not as ontology.

## 4. Competitor Notes Are Private Cross-Checks

The competitor-oriented notes are private scaffolding, not the public narrative of this workspace.

They may still be useful for:

- checking whether a distinction is implementation-noise or a repeatedly rediscovered boundary;
- comparing how different systems package timing, ownership, and rewrite concerns.

But they are not:

- provenance;
- rules truth;
- the story this pairing workspace should tell first.

## 5. What The Six Families Really Are

The six current families are:

- useful corpus bundles;
- held together by ubiquitous language;
- convenient for coverage and enrichment work.

They are not yet proven to be irreducible technical primitives.

So the correct current stance is:

- they may later collapse into lower-level graphable atoms and relations;
- they may later remain useful packaging surfaces;
- the research does not yet justify claiming either result as settled.

## 6. Consequence For Next Research

The next research task is not schema design.

It is:

1. define a lower-level taxonomy / graph vocabulary;
2. test it directly against real spell shapes;
3. revise the taxonomy until it stops lying about those spells;
4. only then decide whether the higher-level six-family packaging still matters architecturally.

## 7. Architecture Reminder: DM Agenda vs Mechanics

`ARCHITECTURE.md` sets a hard boundary that this research must follow:

- the core models mechanical rules with deterministic outcomes;
- DM rulings, agenda decisions, and caller-chosen external facts stay outside the core as caller-provided input.

That means taxonomy candidates must be judged by an architectural bar, not just by wording pressure.

A candidate belongs in the core graph only if it corresponds to something like:

- owned state;
- a reusable transition shape;
- a deterministic trigger/evaluation path;
- a deterministic effect, cleanup, or projection boundary.

A candidate does **not** belong in the core graph merely because it is a noticeable word in the corpus.

Warning examples:

- communication or notification labels;
- narrative summaries;
- DM-facing agenda concepts;
- UI- or presentation-shaped outcomes.

Those may still matter somewhere else, but they are not core-mechanics atoms.
