# RAW Coverage Matrix

This directory preserves the RAW coverage matrix for the historical reviewed
SRD 5.2.1 layout. The checker discovers sections and spans from
`.references/srd-5.2.1-reviewed/**/*.md`; `sections.json` names that corpus
root rather than duplicating generated heading metadata.

The matrix records:

- generated span identity from local SRD text;
- one primary classification per span;
- requirement ids for non-fluff domain spans;
- RAW review agent signoff for each covered section;
- QNT/runtime/verification owner claims;
- historical evidence claims and distinct tracker follow-up joins against
  requirements; GitHub Issues own execution status;
- generated JSON and Markdown reports.

The checked-in matrix and checker describe the historical reviewed SRD layout.
They are retained as research evidence and are not an acceptance gate for the
current Markdown corpus or for new rule work. To inspect the historical matrix
manually, run:

```sh
node scripts/raw-coverage-check.cjs
```

To refresh generated report artifacts after intentional matrix edits:

```sh
node scripts/raw-coverage-check.cjs --write
```

The Reactions section remains the explicit tracer for detailed executable
ownership. The rest of the corpus is classified and closed at matrix level, with
out-of-promoted-scope spans marked for future splitting before behavior is
claimed.

## Using Historical Evidence For QCORE/QMBT

When a historical matrix row covers the rule under study, its requirement and
owner claims can help find earlier proofs, runtime code, and focused MBT. Verify
the actual rule against the current Markdown passage and keep the focused proof
or runtime evidence for the behavior being changed. A missing or stale matrix
row does not block that work, and no old-to-current span migration is required.

Historical proof/runtime mappings live in `evidence-claims.jsonl`. Bounded gap
ownership lives separately in `tracker-claims.jsonl`; those rows carry stable
GitHub issue identity and a closed gap metric, never copied issue status.

## RAW Review Agent

The historical matrix expects a `raw-review-agent` row for each of its sections
in `raw-reviews.jsonl`. Each review records the local SRD source,
`UBIQUITOUS_LANGUAGE.md`, relevant `ASSUMPTIONS.md` anchors, the reviewed span
ids, and a pass/fail verdict.

The historical checker fails if a section lacks this RAW review. This describes
the archived matrix; it does not require a current-corpus review for each
section before focused rule work can proceed.

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
