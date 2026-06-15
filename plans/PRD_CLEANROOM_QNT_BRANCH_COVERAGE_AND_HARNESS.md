# PRD: Cleanroom QNT Branch Coverage And Language-Independent Harness

## Problem Statement

The current cleanroom implementation should not be carried forward as an
implementation artifact. The next experiment should keep the findings, delete
the accumulated implementation, and restart from a stronger source-side corpus,
guidance pack, and harness.

The previous harness allowed a weaker result than the project wants. A target
implementation could exercise one seeded `step` path from a `.mbt.qnt` driver
through the target language's `quint-connect` equivalent, then cover remaining
driver branches with focused target-language tests. That is not acceptable.
Every in-scope MBT driver branch must be covered through the target language's
QNT/MBT conformance lane. Focused target-language tests may supplement
diagnosis, but they do not close MBT branch coverage.

This has two different gates. Source readiness proves that each branch is
inventoried, scoped, and replayable from the copied QNT corpus. Target
acceptance proves that a specific target implementation actually replayed each
in-scope branch through its QNT/MBT harness. The first gate cannot pretend a
future target replay already happened; the second gate cannot accept report
prose or focused target tests as replay evidence.

There is a second failure mode. The cleanroom work loop optimized for "make the
next driver pass" instead of "build the next reusable rules-engine module."
Because the input drivers are intentionally small literal witnesses, this made
driver-shaped witness accretion the local optimum. The next cleanroom harness
must make reusable engine architecture, branch-complete MBT conformance, and
review-loop convergence first-class gates.

The source repo already has important architecture guidance: the forest of QNT
slices, character/creature ownership, character creation as a frontier-driven
atomic batch protocol, character sheet as in-play state owner, battle handoff
settlement, support profiles, no authored-identity dispatch, and no redundant
state. Today those findings are scattered across docs and partially enforced by
QNT/checkers. The next cleanroom needs a curated language-independent guidance
pack plus executable QNT/MBT/checker enforcement where enforcement is practical.

## Solution

Build a source-side readiness program for the next cleanroom experiment before
bootstrapping any new target-language implementation.

The program has four connected outputs:

1. A branch-complete QNT/MBT replay contract for cleanroom-facing drivers,
   split into source branch inventory and target replay evidence.
2. Focused QNT/MBT hardening for architecture invariants that are currently
   prose-heavy, starting with character creation.
3. A language-independent cleanroom scaffold and guidance pack.
4. A Ralph-style implementer/reviewer/decider harness with deterministic gates
   that reject witness accretion and branch coverage gaps.

The source QNT corpus remains a forest of small slices. This PRD does not call
for a broad whole-engine QNT model. Instead, it strengthens each slice's role as
a cross-language conformance artifact.

## User Stories

1. As the project owner, I want every in-scope MBT branch to be exercised through the target language's `quint-connect` equivalent, so that focused unit tests cannot masquerade as QNT conformance.
2. As the project owner, I want uncovered MBT branches to fail the source-side readiness gate, so that a cleanroom run starts only from runnable conformance obligations.
3. As the project owner, I want branch gaps to be treated as QNT/harness blockers, so that target-language implementers do not guess around weak driver shape.
4. As the project owner, I want the next cleanroom implementation deleted and restarted from the improved harness, so that stale implementation choices do not contaminate the next experiment.
5. As a QNT maintainer, I want `any {}` wrappers preserved where they work around backend action-name issues, so that branch identity remains compatible with the Quint tooling.
6. As a QNT maintainer, I want separate driver actions for separate procedure paths, so that discovery, fill, rejection, interrupt, resume, settlement, and cleanup branches are distinguishable.
7. As a QNT maintainer, I want picks used only for sampled inputs, so that die rolls and chosen values are not confused with procedure-branch coverage.
8. As a QNT maintainer, I want deterministic entrypoints for branch-sensitive drivers, so that each branch can be replayed intentionally instead of hoping a random trace hits it.
9. As a QNT maintainer, I want valid mid-protocol initializer actions when a branch requires a non-initial state, so that branch replay does not require invalid fixture states.
10. As a QNT maintainer, I want source-side checks to parse `step = any { ... }` families, so that new branch actions cannot be added without replay evidence.
11. As a QNT maintainer, I want sampled inputs listed separately from branch obligations, so that branch coverage status does not include non-branch pick variation.
12. As a target-language implementer, I want a machine-readable source branch inventory, so that I know which QNT actions must be wired through the target harness.
13. As a target-language implementer, I want harness-produced target replay evidence, so that completion is based on executed QNT traces rather than manually authored report rows.
14. As a target-language implementer, I want mixed in/out-of-scope drivers classified at branch level, so that a flagged driver cannot hide supported in-scope branches.
15. As a target-language implementer, I want driver adapters to be thin and quarantined from production modules, so that witness protocol state does not become the engine API.
16. As a target-language implementer, I want each task to name the reusable engine module it extends, so that conformance work deepens an engine rather than accumulating one-off projections.
17. As a target-language implementer, I want target-specific commands supplied by a small target profile, so that the cleanroom scaffold is not tied to any one language.
18. As a target-language implementer, I want language-specific unit tests to remain allowed as diagnostics, so that failures can be reproduced cheaply without claiming they close MBT coverage.
19. As a reviewer, I want a hard gate that rejects public production symbols derived from witness protocol names, so that the conformance adapter cannot leak into the rules engine.
20. As a reviewer, I want a hard gate that rejects new large production accumulators, so that driver-by-driver work cannot rebuild a monolith by accident.
21. As a reviewer, I want a state-owner and derivability gate for every durable field added by a cleanroom task, so that redundant state cannot enter through a target-language model.
22. As a reviewer, I want an authored-identity-dispatch gate, so that production runtime semantics do not branch on names, ids, slugs, provenance headings, page refs, or official catalog labels.
23. As a reviewer, I want the validation report to include a generated branch coverage table, so that coverage claims can be checked without reading every test.
24. As a reviewer, I want the report to distinguish "covered by target QNT/MBT replay" from "covered by target unit test", so that the completion status is honest.
25. As a reviewer, I want the Ralph decider to run deterministic gates before accepting a task, so that process quality does not depend only on prose review.
26. As a reviewer, I want review loops after each milestone, so that RAW, QNT, domain architecture, branch coverage, and code-shape findings converge before more work is stacked on top.
27. As a character-creation maintainer, I want the draft protocol modeled as a current-frontier, atomic batch process, so that rejected fills cannot mutate state and accepted fills rediscover the next frontier.
28. As a character-creation maintainer, I want progression fill modeled as one `CharacterProgression` selection, so that starting class and advancement entries cannot drift apart or become separate level-1 class state.
29. As a character-creation maintainer, I want finalization guarded by no open holes and support-profile admission, so that incomplete or unsupported drafts cannot become builds.
30. As a character-creation maintainer, I want `CharacterBuild` to carry durable build evidence, selected Unit references, source-scoped spell choices, equipment/loadout, and allowed build-owned slot-pool evidence, so that build facts are retained without storing mutable play state.
31. As a character-sheet maintainer, I want sheet state to own current HP lifecycle, max-HP overrides or reductions, spent Hit Dice, spell-slot expenditure or created slots, pact-slot expenditure, resource expenditures, and rest feature use, so that mutable in-play facts do not backflow into character creation.
32. As a battle maintainer, I want battle to own encounter state while character-battle owns initialization and settlement projections, so that runtime encounter facts are not written back to `CharacterBuild`.
33. As a battle maintainer, I want battle handoff settlement to be typed and ordered, so that encounter state is projected back to sheet state without mutating the build boundary.
34. As a cleanroom harness maintainer, I want the allowed input corpus to include curated architecture findings, so that implementers see the project's domain decisions without reading production code.
35. As a cleanroom harness maintainer, I want the guidance pack to be curated rather than a raw copy of planning logs, so that implementation history and target-specific details do not become authority.
36. As a future language-target owner, I want adding a new target to require only a target profile, harness adapter, and conformance runs, so that language targets remain independent.

## Implementation Decisions

- The current cleanroom implementation is not an artifact to salvage. The next
  run starts from a fresh repository after source-side QNT, checker, scaffold,
  and harness improvements land.
- The cleanroom scaffold is language-independent. A target profile supplies the
  package manager, formatter, compiler, linter, test command, and target
  `quint-connect` binding details.
- The QNT corpus remains slice-shaped. This PRD rejects a whole-battle or
  whole-product QNT hub.
- `any {}` wrappers remain valid and expected when they are needed for Quint
  backend action reporting. The weakness to fix is not the wrapper itself; it is
  relying on one random wrapper trace as proof that every leaf branch has been
  replayed.
- The branch coverage denominator is every in-scope executable branch action in
  cleanroom-facing `.mbt.qnt` drivers. A branch action is every leaf action
  intended to be reported by `mbt::actionTaken` under a cleanroom-facing `step`
  action or declared branch family, including leaf actions grouped under
  multi-action wrappers and singleton `any { action, }` wrappers. The
  denominator does not shrink because a replay entrypoint is missing; missing
  replayability is recorded as a source QNT blocker unless the branch has an
  explicit out-of-scope exemption reviewed before cleanroom bootstrap.
- MBT branch coverage means the target-language harness executes the copied QNT
  driver through the target language's `quint-connect` equivalent and checks the
  implementation against the QNT trace. Focused target-language unit tests do
  not satisfy this requirement.
- Source readiness and target acceptance use different artifacts:
  `sourceBranchInventory` proves each branch is discovered, scoped, and
  replayable from the QNT corpus; `targetReplayEvidence` proves a target
  implementation executed that branch through its QNT/MBT harness.
- `sourceBranchInventory` contains `branchObligations[]` and `sampledInputs[]`
  as separate collections. `branchObligations[]` records driver path, QNT file
  hash, branch action, wrapper or replay entrypoint, scope status,
  deterministic replay rationale when applicable, and source blocker or
  exemption if not runnable. `sampledInputs[]` records pick-driven input
  variation that is outside the branch denominator.
- `targetReplayEvidence` is generated by the target harness, not handwritten in
  the validation report. Evidence records include cleanroom manifest SHA, QNT
  file hash, target profile, target harness/test path, branch action, replay
  entrypoint, observed `actionTaken` branch, seed or trace id, state check or
  projection checked, and pass/fail result.
- Source bootstrap fails when source branch inventory is missing, stale,
  internally inconsistent, or records an in-scope branch as non-replayable
  without a reviewed source QNT blocker. Target task acceptance fails when any
  in-scope branch lacks passing target replay evidence.
- Target replay evidence is invalid if the copied QNT driver differs from the
  source-side manifest SHA and per-file hash that the task declares.
- Random wrapper traces may supplement coverage, but they close a branch only
  when the branch is actually observed and recorded by the target QNT/MBT lane.
  They do not close sibling branches by implication.
- Branch-sensitive drivers get deterministic QNT entrypoints or valid
  initializer actions so each branch can be intentionally replayed.
- Mid-protocol branch entrypoints must reuse the same state constructors or
  domain predicates as the live path. They must not introduce impossible states
  merely to reach a branch.
- Branch hardening preserves driver role. Literal witnesses may add replay
  entrypoints over existing literal outcomes. Computed-oracle drivers remain
  computed only when projection genuinely depends on mutable reducer-computed
  state; new entrypoints must not duplicate reducer semantics inside the driver
  to avoid imports.
- Sampled input variation remains modeled as picks when the sampled value is
  forwarded to the implementation. Procedure-path variation remains modeled as
  separate actions.
- The cleanroom validation report includes a generated branch coverage table.
  Report prose cannot override source branch inventory or target replay
  evidence. Manually authored coverage rows and stale rows for branches no
  longer present in the driver are rejected.
- Driver adapters are quarantined. Target-language production modules expose
  domain commands, reducers, facts, constructors, and queries, not witness
  protocol state or QNT field names.
- Each implementation task declares the reusable engine interface it extends.
  A one-driver adapter-only task is allowed only when paired with a follow-up
  deepening task before related drivers continue.
- Related drivers are batched by domain when practical. The first driver may
  create a tracer-bullet module; subsequent related drivers must reuse or deepen
  that module.
- The engine-depth manifest records production modules extended, domain API
  introduced or reused, adapter modules touched, QNT/witness names quarantined,
  and the next related driver expected to reuse the module. The decider rejects
  production modules named after driver/action identifiers, production exports
  using witness field names, and adapter-only completion without an accepted
  paired engine-deepening task.
- The state-owner/derivability manifest records every durable field introduced
  by a cleanroom task as authored provenance, structured input, build evidence,
  sheet state, battle state, executable boundary projection, or harness witness
  protocol. The decider rejects fields derivable from another owner unless the
  duplication is an explicit executable boundary projection.
- The cleanroom guidance pack includes curated domain architecture findings:
  QNT forest/sibling harness architecture, character/creature ownership,
  character-creation frontier protocol, character-sheet state ownership,
  character-battle handoff settlement, support-profile admission/readers plus
  typed procedure facts, provenance separation, no authored-identity dispatch,
  no redundant state, and invalid states made unrepresentable.
- The guidance pack is manually curated or generated from an allowlist. It must
  not copy production implementation code, production tests, prior cleanroom
  implementation output, or uncontrolled planning logs.
- The bootstrap artifact includes allowed source roots, source hashes, generated
  input manifest, and an explicit denylist for prior cleanroom implementation
  output. Prompts, guidance, fixtures, and scaffolds must be generated only from
  the manifest; the decider rejects unmanifested inputs.
- Target production modules must pass an authored-identity-dispatch checker or
  target-profile equivalent that rejects branching, matching, or comparing on
  authored ids, names, slugs, provenance sections, source headings, page refs,
  and official catalog labels outside catalog, selection, test/synthetic
  fixture, and documented support-profile admission boundaries. Support-profile
  admission must still be driven by parsed Surface shape, support-profile
  readers, typed procedure facts, or explicit selection/cross-record reference
  facts. Branching on authored identity inside support code remains rejected
  unless the boundary documents a narrow executable admission reason.
- Character-creation QNT hardening is package-local and covers at least:
  discovery of current holes from draft plus catalog; rejection of stale
  revision, duplicate fill, wrong kind, unsupported option, and non-current or
  future hole with original draft and original holes preserved; acceptance only
  after whole-batch validation; one revision increment per accepted batch;
  rediscovery of holes and finalization status from the new draft; and
  progression fill as one `CharacterProgression` selection.
- The Ralph-style harness is part of the cleanroom artifact, not an optional
  operator habit. It owns implementer, reviewer, handback, and decider prompts.
- Reviewers include at least RAW/QNT traceability, domain architecture,
  branch-coverage, and code-shape/depth perspectives. A single model may run
  multiple checklists only if the harness records each checklist separately.
- Each cleanroom task records start `HEAD`, clean pre-implementation worktree
  status, and selected drivers before work. A dirty pre-start worktree stops
  the task; the runner or decider owns branch repair.
- Reviewer findings are either fixed or explicitly rejected by the decider with
  rationale before acceptance. An unresolved reasonable finding blocks the
  task.
- The decider runs deterministic gates before accepting a task. A task with
  uncovered in-scope MBT branches cannot be accepted.

## Testing Decisions

- Add or extend source-side checker coverage for parsing `.mbt.qnt` branch
  groups, source branch inventory, and target replay evidence.
- Checker tests should include simple one-branch drivers, multi-branch
  `any {}` wrappers, nested branch families, sampled picks that are not
  branches, explicit blockers, and stale report claims.
- Checker tests should prove that manually authored target coverage rows are
  rejected unless they are generated by the target harness and match the current
  source branch inventory.
- Existing MBT import-closure checks remain required. New deterministic branch
  entrypoints must not reintroduce broad behavioral imports into simulated
  drivers.
- QNT proof and MBT lanes remain opt-in/scarce where the repo already treats
  them as scarce. Branch coverage inventory is computed by reading source and
  manifests; expensive MBT runs are for validation, not exploration.
- Target-language harness tests must execute copied QNT drivers through the
  target `quint-connect` equivalent. Tests that do not execute QNT can support
  debugging but do not count as MBT conformance evidence.
- Character-creation QNT hardening should be verified by package-local QNT tests
  and the existing character-creation MBT lane, not by battle-runtime MBT.
- Harness gate tests should use synthetic fixture projects where possible, so
  adapter quarantine, public witness-surface, module-size, validation-report,
  depth-manifest, state-owner/derivability, authored-identity-dispatch, and
  duplicate-protocol failures are cheap to exercise.
- The cleanroom scaffold should have a dry-run test that renders a target
  profile and verifies that all target-specific strings, commands, extensions,
  and path conventions come from the target profile schema. It should dry-run at
  least two synthetic profiles with different command and path conventions.
- The validation report format should be tested or linted so that branch
  coverage status cannot be supplied only as free text.

## Acceptance Criteria

- Every cleanroom-facing `.mbt.qnt` driver has source branch inventory for
  every in-scope branch action.
- Every mixed-scope driver selected for cleanroom input has branch-level scope
  metadata; a driver-level "flagged" status is not enough to hide in-scope
  branches.
- The source-side checker fails when a branch action lacks source inventory,
  replayability metadata, a reviewed source QNT blocker, or an explicit
  out-of-scope classification.
- Target task acceptance fails when an in-scope branch lacks passing
  harness-generated target replay evidence keyed to the cleanroom manifest SHA
  and QNT file hash.
- The checker fails when a validation report says focused target-language tests
  close an in-scope MBT branch.
- Every cleanroom-facing branch-sensitive driver selected for a cleanroom task
  has deterministic branch replay entrypoints or valid mid-protocol
  initializers, unless the branch is recorded as a reviewed source QNT blocker
  or explicit out-of-scope exemption.
- Character-creation frontier and atomic-batch invariants are either hardened
  in QNT/MBT before the next cleanroom run or listed as blocking source-side
  readiness work for that run.
- Character-creation cleanroom scope has QNT/MBT-backed coverage for supported
  draft protocol and concrete build projection facts, or uncovered branches are
  explicitly out of scope in source branch inventory.
- The cleanroom scaffold has no target-language assumptions outside target
  profile files, verified by at least two synthetic target-profile dry-runs.
- The guidance pack includes the curated architecture findings needed by a
  fresh implementer and excludes production implementation/test code.
- The bootstrap manifest records allowed source roots and hashes and explicitly
  denies prior cleanroom implementation output.
- The Ralph-style harness includes recorded reviewer loops and decider hard
  gates for branch coverage, adapter quarantine, engine depth,
  state-owner/derivability, authored-identity dispatch, and report honesty.
- Each task records start `HEAD`, clean pre-implementation worktree status, and
  selected drivers before implementation begins.
- A fresh cleanroom task cannot be accepted unless all in-scope branches for its
  selected drivers are exercised through the target-language QNT/MBT lane.
- The current cleanroom implementation is not used as evidence for acceptance
  of the next experiment.

## Verification

- **Reviewer-loop convergence.** After implementation, run RAW/QNT
  traceability, ubiquitous-language/domain, architecture/connascence,
  branch-coverage, and code-review passes. Fix every reasonable finding,
  explicitly reject only findings with a concrete reason, and repeat until no
  reasonable findings remain. The cleanroom harness must record this loop after
  each accepted milestone.
- **RAW/ubiquitous-language check.** Before changing or adding rule-modeling
  QNT, read the relevant SRD 5.2.1 passage and `UBIQUITOUS_LANGUAGE.md`.
  Verification must confirm that modeled rules trace to specific SRD text and
  that domain names match the repo vocabulary.
- Run the source checker suite for branch coverage, source branch inventory,
  target replay evidence, report claims, and cleanroom scaffold rendering.
- Run the package-local QNT/MBT lanes affected by any driver or character
  creation changes.
- Run MBT validation consciously using the repo's MBT scarcity protocol:
  one run at a time, check for existing `vitest` and `quint_evaluator`
  processes first, clean up stale evaluator processes, use the timed/backgrounded
  wrapper for every MBT validation run, add the progress reporter for long runs,
  and reproduce seeded failures before fixing.
- Run existing QNT closure/import-budget checks so deterministic branch
  entrypoints do not weaken MBT performance discipline.
- Dry-run the sync/bootstrap process into a temporary cleanroom directory and
  verify the manifest, allowed inputs, guidance pack, scaffold, and target
  profile are self-consistent.

## Out of Scope

- Salvaging the current cleanroom implementation.
- Building a full target-language rules engine in this PRD.
- Building a QNT-to-language code generator.
- Replacing the TypeScript production implementation.
- Creating a monolithic whole-battle QNT model.
- Expanding SRD feature support beyond currently planned cleanroom scope.
- Treating target-language unit tests, hand-transcribed examples, or report
  prose as substitutes for QNT/MBT conformance.
- Copying production implementation code, production tests, previous cleanroom
  implementation output, or uncontrolled planning logs into the cleanroom input
  corpus.

## Further Notes

This PRD deliberately treats weak branch replay as a source-side readiness
problem. If a driver cannot expose all of its branches through QNT/MBT in a
language-independent way, the correct outcome is a QNT/harness blocker, not a
target-language workaround.

The likely first source-side hardening candidates are branch-sensitive battle
drivers with large `step = any { ... }` wrappers and character-creation drivers
that encode the draft frontier protocol. Character creation is the best early
architecture candidate because the domain contract is already well documented:
discover the current frontier, validate a whole fill batch, reject without
mutation, accept atomically, rediscover, and finalize only when the build
boundary is complete and supported.
