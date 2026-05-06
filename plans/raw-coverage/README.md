# RAW Coverage Matrix Tracer

This directory contains the first narrow vertical for the RAW coverage matrix.
It covers `.references/srd-5.2.1/Playing-the-Game.md > Actions > Reactions`.

The vertical proves the mechanics before applying the method to the full SRD:

- generated span identity from local SRD text;
- one primary classification per span;
- requirement ids for non-fluff domain spans;
- RAW review agent signoff for each covered section;
- QNT/runtime/verification owner claims;
- active-plan task claims against requirements;
- generated JSON and Markdown reports.

Run:

```sh
pnpm raw-coverage:check
```

To refresh generated report artifacts after intentional matrix edits:

```sh
node scripts/raw-coverage-check.cjs --write
```

This tracer is not a broad coverage claim. It is a working miniature of the
final matrix contract.

## RAW Review Agent

Every section must have a `raw-review-agent` row in `raw-reviews.jsonl`. The
review records the local SRD source, `UBIQUITOUS_LANGUAGE.md`, any relevant
`ASSUMPTIONS.md` anchors, the reviewed span ids, and a pass/fail verdict.

The checker fails if a section lacks this RAW review. That keeps the workflow
ready for a dedicated RAW review agent before any section is counted as matrix
complete.
