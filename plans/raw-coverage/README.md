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

## Using The Matrix For QCORE/QMBT

Every new rule-core task starts from matrix rows, not from memory or broad task
labels:

1. Find the SRD spans in `matrix.json` or `REPORT.md`.
2. If a span is still closed as out of promoted scope, split it into one or more
   precise `RAW-*` requirements in `requirements.jsonl` before modeling it.
3. Add the QNT owner path to each requirement, then cite the requirement in the
   QNT file with the `qnt-owner` claim kind.
4. Add the proof artifact with the `verification-owner:qnt-proof` claim kind
   and cite it in the proof file.
5. Add or update the `task-claims.jsonl` row for the active QCORE task.
6. Run `pnpm raw-coverage:check` before any proof or MBT gate.

Every QMBT task starts from an existing QCORE requirement:

1. Use the requirement ids listed on the matching QCORE task claim.
2. Add runtime owners only where production runtime code implements the
   requirement.
3. Add focused MBT owners with `verification-owner:focused-mbt` when parity is
   tested.
4. Add or update the `task-claims.jsonl` row for the QMBT task. If the task is
   not `done` in `plans/ACTIVE_PLAN.md`, the matrix reports it as planned
   parity, not completed parity.
5. Run `pnpm raw-coverage:check`; run promoted MBT only after behavior changes
   are complete.

The active plan may list matrix requirement ids for human navigation, but the
canonical machine-readable task mapping lives in `task-claims.jsonl`. Task
status remains derived from `plans/ACTIVE_PLAN.md`.

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
