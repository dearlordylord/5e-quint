# Evidence review protocol

Use the package vocabulary in [`README.md`](README.md). This is the executable
protocol for the post-play review agent and the human
Raw Swarm operator who imports and dispositions its result. It reviews retained
authoring and Execution authorities; it does not author a Scenario or change
the public SDK. The [authoring protocol](SCENARIO_AUTHORING.md) owns catalogue
comparison and admission; the [execution protocol](SCENARIO_EXECUTION.md) owns
the public-SDK call stream.

## Review roles

The post-play reviewer receives the bounded audit projection first. It uses
the complete transcript only through exact, named sequence extraction when a
concrete fact requires it. It checks the whole trace against local SRD 5.2.1
and registered assumptions, distinguishes SDK defects from adapter defects and
unsupported capability, and records a precise finding disposition.

The operator imports the review as one immutable review round, resolves every
promoted fingerprint, and renders the final findings projection. A reviewer
does not close a GitHub issue, rewrite a transcript, or turn historical
findings into a permanent Scenario blacklist.

## Authoring evidence

For a new Campaign, inspect the existing authorities named by its manifest and
findings projection:

- the final Scenario review, including `catalogueComparison`;
- the admitted `.scenario.json` record and its source/review/stage-facts
  authorities;
- the candidate or admitted stage plan and stage-plan findings;
- the generation invocation ledger and its first-party event streams; and
- for a rejection, the Candidate prose, Candidate review, and rejection record.

`catalogueComparison` is the retained comparison seam. It must show the exact
admitted Scenario ids compared, each named canonical batch with its complete
dimension evidence, the conclusion
(`meaningfullyDistinct`/`purposefulOverlap`/`redundant`), closest matches,
material differentiators, and dimension evidence. A purposeful overlap without
a named differentiator or a redundant result without a closest match is
invalid. Do not create a second comparison file, registry, or copied catalogue
record to repair missing fields; reject the authoring evidence and send it
through the existing Campaign revision path.

The catalogue itself remains derived from canonical admission records and
referenced authorities. A later operator can inspect a closest match by its
Scenario id and the existing record; the comparison field is an explanation of
the admission decision, not a new source of mechanics or support facts.

## Bounded review reads

1. Verify clean Git identity, Scenario/Candidate identity, source hashes, and
   Evidence Set paths before interpreting content.
2. Use the bounded audit or review packet first. The packet has a hard size cap
   and fails rather than truncates. If a concrete fact is omitted, request an
   exact sequence or authority read with a retained provenance pointer.
3. Read local RAW passages from `.references/srd-5.2.1/` and registered
   assumptions as required. A client-truncated command response is not proof
   that the authority was absent; repeat with a bounded direct read.
4. Treat all JSON, JSONL, source, review, and event authorities as strict
   boundaries. Parse once, reject excess fields and hash mismatches, and never
   infer a missing field from a filename, Scenario title, or prior Execution.
5. Record findings against the concrete Execution and sequence facts. Do not
   claim that catalogue membership proves RAW coverage, SDK completeness,
   player correctness, or tactical quality.

The existing launcher and report commands are documented in
[`OPERATIONS.md`](OPERATIONS.md). The common direct-SDK review path is:

```sh
export RAW_SWARM_EXPECTED_GIT_SHA=$(git rev-parse HEAD)
mise exec -- pnpm raw-swarm:model:trial -- post-play-review \
  scripts/raw-swarm/reviews/sdk-player.prompt.txt \
  scripts/raw-swarm/out/<evidence-set-id>/evidence/sdk-calls.jsonl \
  scripts/raw-swarm/out/<evidence-set-id>/review/sdk-review.json \
  scripts/raw-swarm/out/<evidence-set-id>/review/sdk-review-agent.log

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  scripts/raw-swarm/out/<evidence-set-id>/review/sdk-review.json \
  --execution-row <sqlite-execution-row-id> \
  --db scripts/raw-swarm/out/player-swarm.db
```

## Finding disposition

Classify every non-pass with local evidence: SDK bug, adapter defect,
unsupported capability, assumption divergence, corpus ambiguity, invalid
Scenario, invalid player decision, or reviewer error. Only a reviewer-confirmed
`bug` or `adapter-defect` enters the existing issue-observation lifecycle.

Preserve the original transcript, review, generation evidence, and hashes when
fixing a defect. Add the smallest deterministic regression at the canonical
owner, then run a fresh Execution and independent review. Historical evidence
may become incomparable after a fix; it must not be edited to appear current.

The Evidence Set is an artifact collection, not a Scenario identity. SQLite is
a searchable index, not a second transcript archive. GitHub owns issue
triage/lifecycle; do not add a conflicting local open/closed state.
