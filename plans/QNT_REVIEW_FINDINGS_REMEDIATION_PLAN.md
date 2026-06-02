# QNT Review Findings Remediation Plan

Status: completed by Ralph Lane C

This plan converts the two-pass QNT review findings into implementation work. It
focuses on active package-local Quint and rule-core slices, not archived root
QNT. The review used the installed `quint-spec` skill and separate sub-agent
passes over battle-runtime QNT, shared rule-core QNT, SRD/authored-identity
risks, and proof/test wiring.

<!-- ralph-task-index
{
  "schema": 1,
  "tasks": [
    {
      "id": "QRF-1-MBT-CLOSURE-GATE",
      "title": "Make the MBT driver closure checker enforce forbidden imports",
      "status": "done",
      "priority": "high"
    },
    {
      "id": "QRF-2-EXTRA-ATTACK-COUNTS",
      "title": "Represent SRD Extra Attack counts instead of a boolean slot",
      "status": "done",
      "priority": "high"
    },
    {
      "id": "QRF-3-MOONBEAM-SHAPESHIFT",
      "title": "Model Moonbeam shape-shift reversion for every supported shape-shift source",
      "status": "done",
      "priority": "high"
    },
    {
      "id": "QRF-4-AUTHORED-IDENTITY-PILOT",
      "title": "Start replacing runtime spell-name dispatch with typed procedure facts",
      "status": "done",
      "priority": "high"
    },
    {
      "id": "QRF-5-QNT-STATE-SHAPES",
      "title": "Replace partial and positional QNT state conventions with exact domain shapes",
      "status": "done",
      "priority": "medium"
    },
    {
      "id": "QRF-6-DAMAGE-TYPE-TOTALITY",
      "title": "Make damage type projection exhaustive and total",
      "status": "done",
      "priority": "medium"
    },
    {
      "id": "QRF-7-SHARED-QNT-PROOFS",
      "title": "Add self-discovering shared-algebras QNT proof execution",
      "status": "done",
      "priority": "medium"
    },
    {
      "id": "QRF-8-QA-GENERATED-POLICY",
      "title": "Prevent non-SRD authored identity from materializing in generated QA QNT",
      "status": "done",
      "priority": "medium"
    },
    {
      "id": "QRF-9-REVIEW-RULES-AUTHORITY",
      "title": "Correct review rules to point at active package-local QNT authority",
      "status": "done",
      "priority": "low"
    }
  ]
}
-->

## Goals

- Restore SRD parity where the active QNT model is too narrow.
- Remove or contain authored-identity dispatch from production runtime
  semantics.
- Make invalid QNT states unrepresentable instead of relying on partial maps,
  positional lists, or fallback branches.
- Make QNT proof and MBT guardrails executable so future regressions are caught
  by the repo, not by reviewer memory.

## Non-Goals

- Do not update archived root `battle.qnt`, `creature.qnt`, or `dndTest.qnt`
  unless a separate archive-restoration task explicitly asks for it.
- Do not run battle-runtime MBT for exploration.
- Do not edit `qa_generated.qnt` as a normal development fix. Address the
  generator, publishing boundary, or artifact policy instead.

## Final Disposition

Ralph Lane C completed the remediation queue and closed without a next batch.
Task 19's second-pass rescan found one residual issue under QRF-5: generic
package-local battle-runtime QNT Initiative still admitted an empty
`stillToAct` list while turn-order code read the current actor by position.
Task 21 replaced that state shape with an exact current-actor plus waiting-actor
queue, removed the unchecked current-actor list reads, and added focused QNT run
blocks for normal advancement, round wraparound, and empty input rejection.

All original QNT review findings now have concrete converged disposition:

| Finding | Final disposition |
| --- | --- |
| QRF-1 MBT closure gate | Done. Forbidden direct and transitive MBT driver imports are enforced by `pnpm check:mbt-driver-closure`; any remaining allowed entries are checker-visible and classified. |
| QRF-2 Extra Attack counts | Done. Rule-core, battle-runtime QNT, TS admission, and MBT bridge surfaces preserve SRD-supported additional-attack counts instead of collapsing them to a boolean. |
| QRF-3 Moonbeam shape-shift reversion | Done for admitted runtime states. Moonbeam reversion uses executable true-form restoration facts, and unsupported shifted states are not admitted as ordinary executable Moonbeam states. |
| QRF-4 authored spell identity dispatch | Done for the lane's pilot and guardrail. Runtime repeated-damage allocation uses typed procedure facts, and `pnpm check:authored-id-dispatch` guards against reintroducing production authored-identity dispatch outside documented boundaries. |
| QRF-5 partial and positional QNT state | Done. Fighter ongoing features, Alert initiative, turn order, and generic battle-runtime Initiative now use exact or total state shapes for the reviewed conventions. |
| QRF-6 damage type totality | Done. Damage type projection uses explicit total keyed representation rather than fallback meaning. |
| QRF-7 shared QNT proofs | Done. Shared-algebras QNT proof execution is self-discovering, bounded, and attributable. |
| QRF-8 QA generated identity policy | Done. QA generated materialization enforces SRD-only or visibly synthetic authored identity and is covered by a lightweight gate. |
| QRF-9 review authority | Done. `.claude/review-rules.md` points reviewers at active package-local QNT and rule-core authority; archived root QNT is restoration source material only. |

Closeout verification recorded for the lane:

- Task 19 rescan gates passed for authored identity dispatch, QA generated
  identity, MBT driver closure, rules-kernel coverage, shared-algebras QNT
  proofs, battle-runtime QNT proofs, and `git diff --check`.
- Task 21 battle-runtime QNT proofs and `git diff --check` passed after the
  residual Initiative shape fix.
- Task 20 `git diff --check` passed after the closeout documentation update.
- Broad `pnpm quality` remains blocked by a known unrelated baseline lint
  failure in `packages/mcp/src/battle-tools.ts` line 439 (`max-lines`). That
  failure is outside this QNT review remediation ownership surface and is not a
  hidden QNT review finding.

## Findings and Solutions

### QRF-1: MBT Closure Gate Is Too Weak

Finding: `scripts/check-mbt-driver-closure.cjs` currently enforces a transitive
file-count budget, but it does not directly enforce the project rule that
simulated `*.mbt.qnt` drivers must not import `battle-runtime-model`, barrels, or
behavioral modules unless deliberately allowlisted. Several current drivers
import the battle-runtime model directly.

Obvious solution: yes. Extend the checker with explicit direct and transitive
forbidden-import checks. Keep a small, named allowlist only for computed-oracle
drivers that genuinely need reducer behavior, and make every allowlist entry
carry a reason.

Acceptance:

- A synthetic `*.mbt.qnt` importing `battle-runtime-model` fails the checker.
- Nonallowlisted drivers no longer import active model barrels or behavioral
  rule modules.
- Existing allowlist entries are classified as either justified computed
  oracles or migration debt.

### QRF-2: Extra Attack Count Collapses SRD Variants

Finding: rule-core models attack-action availability with a boolean-style extra
attack slot even though SRD class features include higher Extra Attack counts.
The bridge then turns any remaining count into open/closed, so two or three
additional attacks cannot be represented faithfully.

Obvious solution: yes. Replace the boolean slot with an integer remaining-count
model at the rule-core boundary, constrain admitted counts to SRD-supported
values, and decrement one attack at a time. Preserve the count through the
battle-runtime bridge instead of projecting it to a boolean.

Acceptance:

- Rule-core accepts and proves legal counts for one, two, and three additional
  attacks where SRD-backed features grant them.
- Battle-runtime QNT preserves remaining extra attack count across turn start,
  attack action use, and turn end.
- Focused tests cover every SRD-supported count and the zero-count case.

### QRF-3: Moonbeam Shape-Shift Reversion Is Under-Modeled

Finding: Moonbeam failed-save handling reverts only the currently supported
shape-shift source variant. Other modeled shape-shift source variants are
classified as unsupported and then no-op through the rider path, even though the
SRD rule speaks about a shape-shifted creature reverting on a failed save.

Obvious solution: partially. The direction is clear: the Moonbeam rider should
operate on runtime "is shape-shifted" and true-form restoration facts, not on a
single supported source branch. The implementation may need a small domain
design step if some shape-shift sources do not currently carry enough
restoration facts.

Acceptance:

- Every modeled shape-shift source has either executable true-form restoration
  facts or is made unrepresentable at the Moonbeam admission boundary.
- Moonbeam failed-save handling has no ordinary unsupported no-op branch for a
  creature already known to be shape-shifted.
- RAW references are recorded from `.references/srd-5.2.1/Spells/` and
  `.references/srd-5.2.1/Rules-Glossary.md`.

### QRF-4: Runtime Spell Semantics Dispatch On Authored Identity

Finding: production QNT still uses authored spell variants as runtime rule
selectors. That pattern is acceptable at narrow catalog, selection, and
admission boundaries, but it should not be the executable runtime rule model.
It also sets the wrong pattern for future PHB+ support.

Obvious solution: no single-file fix. The correct solution is a staged migration
to typed procedure/profile facts. Authored spell identity should be parsed or
selected at the boundary, admitted into explicit runtime facts, and then reducers
should dispatch on those facts.

Acceptance:

- Choose one vertical slice first, preferably one with both QNT and TS parity
  coverage.
- Define typed procedure facts for that slice and make reducers depend on the
  facts rather than spell-name variants.
- Add a code-review check or script coverage so production runtime reducers do
  not reintroduce authored identity dispatch outside documented admission
  boundaries.
- Expand the pattern after the first vertical slice proves the shape.

### QRF-5: Partial and Positional QNT State

Finding: some QNT state shapes encode exact domain expectations as conventions:
maps with required integer keys, unchecked `.get`, and turn-order lists that are
assumed to be nonempty or exactly shaped by position.

Obvious solution: mostly. Replace known fixed shapes with records or exact
variants, and route list access through total helpers that prove nonempty or
exact-shape facts before indexing.

Acceptance:

- Fighter ongoing feature occurrences no longer depend on partial map keys that
  must exist by convention.
- Turn-order and Alert handling use exact domain shapes or total helper
  functions, not unchecked positional fallback behavior.
- Any remaining strong connascence is localized in one named helper whose type
  makes the invariant executable.

### QRF-6: Damage Type Projection Uses Fallback Meaning

Finding: damage adjustment projection duplicates each damage type into separate
fields and uses final `else` branches as the meaning for the last damage type.
Adding or reordering a damage type can silently change behavior.

Obvious solution: yes. Replace fallback chains with exhaustive `match` over the
damage type union, or represent damage amounts as a total function keyed by
`RuleDamageType` so lookup is structurally total.

Acceptance:

- No damage type is represented only by an `else` fallback.
- Adding a new damage type creates a compile/typecheck/proof obligation.
- Existing tests or proofs cover at least one adjusted and one unadjusted
  component per damage-adjustment branch.

### QRF-7: Shared-Algebras Proof Lane Is Hand-Maintained

Finding: `packages/shared-algebras` has a hand-maintained proof script list,
while many shared QNT files contain `run` blocks. This can let proof examples
exist without being executed by a package proof lane.

Obvious solution: yes. Port the battle-runtime self-discovering run-block proof
runner pattern to shared-algebras.

Acceptance:

- Shared-algebras proof execution discovers QNT files with `run` blocks instead
  of relying on a manually maintained list.
- Each proof module is bounded and attributable by file.
- The package exposes an opt-in proof command with clear timeout behavior.

### QRF-8: Generated QA QNT Contains Non-SRD Authored Identity

Finding: generated QA QNT includes non-SRD authored identities. The file is not
part of the normal development verification workflow and may already have
pre-existing typecheck issues, but generated artifacts still must not copy PHB+
identity into publishable project material.

Obvious solution: policy yes, exact implementation depends on the QA pipeline.
Either prevent non-SRD records from materializing as QNT artifacts, rewrite them
to synthetic identities during generation, or move the artifact outside
publishable source boundaries.

Acceptance:

- The QA generator or materialization boundary has a documented SRD-only or
  synthetic-identity policy.
- Normal development does not hand-edit `qa_generated.qnt`.
- The policy is enforced by generation tests or a lightweight scan.

### QRF-9: Review Rules Point At Archived Authority

Finding: `.claude/review-rules.md` still instructs reviewers to compare
runtime behavior against archived root `battle.qnt`, while current project
instructions make package-local QNT and rule-core the active authority.

Obvious solution: yes. Update the review rule text to name the active authority:
`packages/battle-runtime/battle-runtime.qnt`, package-local QNT slices, and
`packages/shared-algebras/proofs/rule-core/`.

Acceptance:

- Review rules no longer present archived root QNT as the active parity gate.
- The text still allows archived files to be used only as restoration source
  material when a task explicitly asks for that.

## Suggested Order

1. Do QRF-9 first. It is small and prevents future reviewers from following the
   wrong authority.
2. Do QRF-1 and QRF-7 next. They improve guardrails before semantic edits.
3. Do QRF-2 and QRF-3 as focused SRD parity fixes.
4. Do QRF-5 and QRF-6 as state-shape and connascence hardening work.
5. Start QRF-4 as a vertical slice, not a whole-corpus rewrite.
6. Do QRF-8 at the QA pipeline boundary, keeping `qa_generated.qnt` out of
   normal manual edits.

## Verification

Every implementation task from this plan must include the following verification
work before it is considered done:

- RAW and ubiquitous-language check: before changing any rule behavior, read the
  relevant SRD 5.2.1 passages under `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`. Record the specific files and passages in the task
  notes or PR.
- Reviewer-loop convergence: after implementation, run RAW traceability,
  ubiquitous-language/domain, architecture/connascence, and code-review passes.
  Fix every reasonable finding, reject only with a concrete reason, and repeat
  until no reasonable findings remain.
- Static checks: run `git diff --check`, `pnpm check:mbt-driver-closure`, and
  `pnpm check:authored-id-dispatch` when touched areas can affect those gates.
- QNT proofs: for battle-runtime QNT or proof changes, run
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs`. For shared-algebras proof
  runner work, run the new shared proof command once it exists.
- Focused tests: prefer package-local focused tests for changed reducers,
  bridges, and rule-core slices.
- MBT: only after completed integrated battle-runtime behavior changes, run the
  package MBT lane once with the repository protocol:
  `cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/battle-runtime.mbt.test.ts`.
  Do not use MBT for exploration, and run only one MBT instance at a time.

## Closed Risks And Residual Notes

- QRF-4 remains intentionally vertical-slice based. Future spell-profile
  expansions should follow the typed procedure-fact pattern and the authored
  identity dispatch guardrail, but no unresolved issue from this review lane
  requires a new Ralph batch.
- QRF-1 still exposes allowed MBT driver entries through the checker. They are
  visible guardrail state, not hidden review debt.
- Broad `pnpm quality` has an unrelated MCP max-lines baseline failure recorded
  above. Do not treat that baseline as QNT remediation scope.
