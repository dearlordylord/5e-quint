# RAW Coverage Matrix

This directory contains the RAW coverage matrix for the local SRD 5.2.1 corpus.
The checker discovers sections and spans from `.references/srd-5.2.1/**/*.md`;
`sections.json` names the corpus root rather than duplicating generated heading
metadata.

The matrix records:

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

The Reactions section remains the explicit tracer for detailed executable
ownership. The rest of the corpus is classified and closed at matrix level, with
out-of-promoted-scope spans marked for future splitting before behavior is
claimed.

## RAW Review Agent

Every section must have a `raw-review-agent` row in `raw-reviews.jsonl`. The
review records the local SRD source, `UBIQUITOUS_LANGUAGE.md`, any relevant
`ASSUMPTIONS.md` anchors, the reviewed span ids, and a pass/fail verdict.

The checker fails if a section lacks this RAW review. That keeps the workflow
ready for a dedicated RAW review agent before any section is counted as matrix
complete.

## Owner Claim Convention

QNT, runtime, and verification artifacts cite requirement ids with a single-line
comment:

```text
RAW-COVERAGE: <claim-kind> <RAW-ID> [<RAW-ID> ...]
```

Supported claim kinds are:

- `qnt-owner`
- `runtime-owner`
- `verification-owner:qnt-proof`
- `verification-owner:focused-mbt`
- `verification-owner:runtime-test`
- `verification-owner:doc`

The checker scans `packages/` and `plans/` for these claims. A cited
requirement id must exist in `requirements.jsonl`, and the corresponding
requirement row must list the owner artifact in the matching owner field. The
reverse link is also mandatory: if `requirements.jsonl` lists an owner artifact,
that artifact must cite the requirement id with the matching claim kind.
