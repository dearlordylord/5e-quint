# Raw Swarm capability context and complete-path coverage

Research date: 2026-08-18. This note records the #292 bounded-context
measurement and the evidence boundary for complete-path comparisons. The
retained `generated-battle-009` figures are the prior report from #287; they
are not regenerated from an ignored output directory.

## Canonical capability projection

`scripts/raw-swarm/capability-projection.ts` is the only owner of the v1
capability projection. Generation, character authoring, setup authoring,
player execution, and review receive role views derived from that value. The
view names public operations and experiment boundaries; it does not copy a
D&D schema, publish a declaration tree, or create a second execution model.
Declarations emitted into authoring scratch directories remain compilation
support only.

The checked-in size estimate is produced by
`capabilityContextSizeEstimate()` in
`scripts/raw-swarm/capability-context-size-estimate.ts`. Each role view is
enforced at the named 4 KiB byte budget; its token values are explicitly
estimates (`ceil(UTF-8 bytes / 4)`), not first-party model usage. They are
useful for a bounded-context regression, not a substitute for a complete model
run.

| Role                | UTF-8 bytes | Estimated tokens |
| ------------------- | ----------: | ---------------: |
| generation          |       2,481 |              621 |
| character authoring |       1,719 |              430 |
| setup authoring     |       2,810 |              703 |
| player              |       2,898 |              725 |
| review              |       2,662 |              666 |
| total role views    |      12,570 |            3,145 |

Generation and review include concise setup/play capability summaries because
those roles must select and assess representable scenarios. The summaries name
the public boundary without copying declarations; omitting them made a live
review unable to distinguish supported play from an unsupported probe. The
spatial boundary also states that geometry-derived and Table-authored sessions
are exclusive, and that exact Table decisions are fingerprint-bound answers,
not reusable conditional terrain rules. This was required after the retained
`generated-battle-011` review admitted a mixed-source portcullis rule that setup
correctly retained as an obstruction. It also states that non-movement Battle
outcomes do not create hypothetical spatial fingerprints; the retained
`generated-battle-012` review invented post-Shove spatial branches that setup
correctly rejected.

For comparison, the retained #287 `generated-battle-009` report records 7.94
million input tokens for four accepted SDK calls, including 7.00 million
cached input tokens. Generation and repeated review used 5.01 million input
tokens, character/setup authoring used 2.47 million, player execution used
361.7 thousand, and post-play review used 97.5 thousand. The role-view
estimate is therefore materially smaller as a bounded-context view, but the
byte-to-token estimate must not be reported as a live model saving.

## Complete equivalent-path evidence

`CompletePathMeasurementSchema` in `performance-comparison.ts` retains the
canonical v2 invocation-ledger authorities and entries, every raw
invocation-event authority, the admitted stage plan, and the findings
projection. It does not define a
second phase, result, elapsed-time, or usage schema. Accepted calls and
corrections are derived from retained findings; invocation failures, elapsed
milliseconds, stage-plan reasons, and every token dimension come from the
versioned ledger. The comparison uses a typed witness for scenario identity,
admission/terminal outcome, and retained transcript/replay/findings/review
responsibilities. Stage-plan decisions are validated for each path but are not
part of semantic identity, so an intentionally skipped redundant stage does
not make equivalent work incomparable. One phase-to-stage map requires at least one
generation invocation, exactly one feedback plus one final composite review,
and exactly one setup, player, and post-play invocation for each required stage;
skipped or `none` stages require zero. A consolidated path can therefore be equivalent
even when its phase/model sequence changes; that implementation delta is
reported separately. Unavailable token usage is explicit and never converted
to zero.

The focused tests cover equivalent implementation deltas, failed-versus-
completed outcome rejection, unexplained phases, duplicate composite reviews,
hash-linked authority validation, unavailable token dimensions, strict version
decoding, and the role-view size estimate. A live #292 scenario run is not checked into this worktree, so
this note makes no unsupported claim that the 3,145-token estimate is a
complete-path model measurement. Operators must record hash-linked canonical
ledger, stage-plan, and findings authorities for baseline and candidate before
claiming a complete-path performance gate.

### Acceptance evidence status and rerun plan

No retained run in this checkout is a valid prior/current #292 pair. The
`generated-battle-009` envelope is historical and has no typed stage plan,
findings projection, replay witness, or v2 invocation ledger. The retained
generated-battle-004 ledgers are also v1 evidence from an earlier experiment;
wrapping either artifact in a current envelope would fabricate provenance.

The acceptance pair therefore requires one controlled model rerun on the
immutable simple scenario `tracer-001-goblin-warrior-vs-skeleton` (or another
recorded simple scenario):

1. record the prior-path baseline at the clean pre-#292 revision;
2. record the candidate at the clean #292 revision, with the same scenario,
   distribution, model/effort policy, and required terminal outcome; and
3. validate both measurements through `validateCompletePathMeasurement` before
   calling `compareCompleteEquivalentPaths`.

Each run must retain the stage-plan authority, v2 invocation ledger and event
authorities, transcript/replay authorities, findings projection, and review
authorities. Equivalence is admitted only when scenario identity, terminal
outcome, and transcript/replay/findings/review responsibilities match; phase,
model, and elapsed differences are reported as implementation deltas. The
same pair supplies a comparable pre-#292/current fixed-floor measurement. The
`generated-battle-009` number can be used as the acceptance reference only for
fixed dimensions backed by a retained, hash-linked authority; if that
authority is absent, the dimension remains unavailable rather than being
inferred from the role-view byte estimate. Until the rerun and those
authorities exist, this worktree reports the role-view estimate and historical
run009 gaps, but does not claim either acceptance saving.

Current generation retains the raw event stream for every generation and
composite-review invocation; character authoring, neutral/controller setup,
player execution, and post-play review retain their existing ledgers and event
streams. A schema-v1 assembly descriptor names the stage plan, findings
projection, every phase ledger, every phase event stream, and the observed path
outcome. The canonical command is:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  assemble <descriptor.json> <measurement.json>
```

The assembler decodes those authorities, hashes their exact bytes, rejects v1
or malformed current telemetry, and validates the resulting measurement before
writing it once. A caller cannot substitute copied in-memory invocation rows.

The retained evidence design remains justified independently of this pending
live comparison: the canonical transcript and replay are execution authority,
findings retain rejected and corrected attempts, the composite pre-play review
keeps RAW/content/SDK/policy/scenario-quality responsibilities distinct, and
post-play review remains an independent invocation. Historical final-review
scope variants remain parseable without inventing scenario-quality evidence;
new generation emits the versioned quality-bearing scope. No replay cache or
generic compaction mechanism is retained without complete-path benefit
evidence.

Declaration emission remains a measured drawback rather than a claimed
optimization. The current public compile-support graph is 498 declaration
files and 4,627,119 bytes, and two accidentally concurrent measurements each
ran for several minutes before they were stopped. The distribution has a
separate 512-file/5-MiB regression ceiling, but no declaration cache or facade
is retained: reuse or reduction must first demonstrate material complete-path
benefit without weakening the ordinary-TypeScript compile boundary.

## Focused regression coverage

- `capability-projection.test.ts` enforces the 4 KiB role-context budget,
  rejects document/declaration contexts, and checks role-specific operation
  subsets.
- `scenario-campaign.test.ts` checks that composite review does not trigger a
  duplicate readiness invocation.
- `model-telemetry.test.ts` checks v2 reason/result fields and explicit v1
  historical parsing; all current ledger writers reject v1 output.
- `complete-path-comparison.test.ts` checks failures, corrections, identity,
  unavailable usage, and fixed-context measurement.
