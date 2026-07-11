# Ralph L1-2 Cleanroom Ice Knife Pilot

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12IKP-01-EXACT-SOURCE-CALIBRATION",
      "status": "done",
      "title": "Calibrate the exact Ice Knife QNT branches against production TypeScript",
      "dependencies": []
    },
    {
      "number": 2,
      "id": "L12IKP-02-UNIT-READINESS-SLICE",
      "status": "done",
      "title": "Build and gate one cleanroom-safe Ice Knife Unit index",
      "dependencies": [
        "L12IKP-01-EXACT-SOURCE-CALIBRATION"
      ]
    },
    {
      "number": 3,
      "id": "L12IKP-03-IMMUTABLE-EXPORT",
      "status": "done",
      "title": "Export one immutable Ice Knife cleanroom experiment",
      "dependencies": [
        "L12IKP-02-UNIT-READINESS-SLICE"
      ]
    },
    {
      "number": 4,
      "id": "L12IKP-04-INTAKE-AND-MEASUREMENT",
      "status": "ready-for-research",
      "title": "Intake Ice Knife results and measure the complete pilot",
      "dependencies": [
        "L12IKP-03-IMMUTABLE-EXPORT"
      ]
    }
  ]
}
-->

## Purpose

Build and inspect one complete source-side cleanroom experiment slice for the
SRD Unit `ice_knife` before generalizing the machinery to all 72 executable
level-1 and level-2 Units.

The pilot answers four questions with executable evidence:

1. Can the source repository prove that the exact QNT branches exported for
   Ice Knife are calibrated against production TypeScript?
2. Can it generate a cleanroom-safe Unit index that navigates RAW and QNT
   without becoming a second rules specification?
3. Can one immutable export give a fresh target `/goal` enough information to
   implement and replay Ice Knife without receiving source TypeScript or
   Surface mechanics?
4. Can source intake distinguish QNT/scope insufficiency from a target
   implementation failure and report the time consumed by each stage?

This is a tracer-bullet implementation plan, not an Ice Knife-specific
prototype to discard. The selection boundary is limited to one Unit, while the
calibration, readiness, export, intake, and measurement models must accept an
explicit experiment scope and remain reusable for later corpus expansion.

## Contract And Scope Authority

The canonical shared experiment contract is
`plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md`. It owns calibration, readiness,
input isolation, run kinds, freshness, target commit evidence, receipt
validation, blocker classification, measurement provenance, and durable
handoff. This pilot must apply rather than restate those rules.

This plan remains authoritative for the one-Unit Ice Knife experiment, its real
target evidence, and measured effort.
`plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md` remains authoritative for
exhaustive expansion across all 72 executable L1-2 Units. Neither scope plan
supersedes the other.

After the pilot is reviewed, update only full-plan scaling and corpus tasks
unless evidence changes the canonical shared contract. Do not run the pilot and
full source plans concurrently because both may change the same implementation.
The full plan must extend pilot machinery rather than create parallel state;
its Task 7 is the post-expansion regression against this pilot.

## Workflow Boundary

```text
Ralph in this source repository
  Task 1: exact Ice Knife source calibration
    -> Task 2: Ice Knife Unit readiness and cleanroom-safe index
      -> Task 3: immutable Ice Knife export capability and target handoff
        -> Task 4: intake contract, synthetic verification, timing support

Fresh source orchestration after all four task commits land
  regenerate the final export from the clean final source commit
    -> one fresh target /goal run using only the immutable export
    -> one source intake invocation over the real target receipt
      -> joint review and full-plan revision
```

Ralph performs no target implementation. It must not create `.ralph`, a task
queue, an agent runner, or source-repository planning infrastructure in the
target. The target receives an immutable input catalog and a static launch
prompt, performs one unattended `/goal`, and returns a receipt.

## Contract Application

This pilot implements the canonical contract for the single-Unit scope
`ice_knife`. The authoritative target result uses the `fresh-experiment` run
kind. An existing target may first consume the same manifest as a
`diagnostic-rehearsal`, but that receipt is permanently ineligible for
cleanroom acceptance and its timing is reported separately.

The Druid, Sorcerer, and Wizard denominator rows collapse into one atomic Unit.
The final real export is generated after all four Ralph task commits land so its
manifest records the clean final source commit. Task worktrees may create only
deterministic test exports.

Ralph performs no target implementation and installs no Ralph infrastructure in
a target. The generated source status and handoff commands derive the next
action from validated artifacts as required by the canonical contract.

## Existing Ice Knife Evidence To Reconcile

Research must verify these paths and roles against the current source rather
than accepting this list as authority:

- RAW anchor:
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md`, section `Ice Knife`;
- authored Surface record: `packages/surface/content/ice_knife.json`;
- reusable rule core:
  `packages/shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core.qnt`;
- focused battle rule integration:
  `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`;
- focused proof scenarios:
  `packages/battle-runtime/battle-runtime-save-spell-tests.qnt`;
- selected-identity driver:
  `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`;
- TypeScript parity bridge:
  `packages/battle-runtime/src/level1-damage-spell-selected-identity.mbt.test.ts`.

The expected direct driver actions to verify are:

- `doResolveIceKnifeHitAttackDamageAndBurstSavingThrows`;
- `doResolveIceKnifeMissBurstSavingThrows`.

The current generated candidate mapping has previously preferred
`battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`, even though that
driver has no direct Ice Knife action. The pilot must make this false join fail
by executable validation, not by a filename or identity-specific denylist.

Ice Knife appears in Druid, Sorcerer, and Wizard class-list denominator rows.
Those rows are accounting aliases for one atomic Unit experiment, not three
target implementations.

## Pilot-Owned Outputs

Checked-in generated/research artifacts owned by the pilot belong under:

- `plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/`

Do not copy `.ralph` logs into checked-in artifacts. Ralph run events remain at
`.ralph/runs/<run-id>/events.tsv` and are read as measurement input.

The implementation may extend existing cleanroom commands and artifact
schemas instead of creating parallel tools. Prefer parameterizing the existing
source pipeline with an explicit scope when its ownership is correct. Do not
create an Ice Knife-only registry or duplicate existing cleanroom state.

## Out Of Scope

- Implementing Ice Knife in any target language during Ralph tasks.
- Making all 72 Units export-ready.
- Claiming full L1-2 readiness from one ready Unit.
- Copying source TypeScript, TypeScript tests, or Surface mechanics to target.
- Adding new Ice Knife mechanics unless executable calibration proves a real
  source QNT/TypeScript parity gap.
- Treating synthetic intake receipts as cleanroom success.
- Running broad battle MBT merely to inspect trace or variable shapes.

## Task Order

The `ralph-task-index.tasks[].dependencies` fields are the sole task-order
authority. Do not duplicate the dependency graph in prose or a Markdown table.

## Verification

Every task must perform the Ralph Base SHA check from `AGENTS.md`: log the
declared Base ref and SHA, log `HEAD`, and run
`git merge-base --is-ancestor <Base SHA> HEAD`. Stop on mismatch; the runner or
decider owns branch repair.

Every task must read and satisfy
`plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md`. Scope-task text may narrow work
but cannot redefine a shared contract rule.

Run the checks relevant to the changed ownership surface, including these when
applicable:

- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm check:l12-cleanroom-generation`
- `pnpm cleanroom-sync:check`
- `pnpm cleanroom-scaffold:check`
- `pnpm cleanroom-harness:check`
- `pnpm unit-profile-coverage:check`
- focused tests for each new parser, checker, export, and intake boundary
- `git diff --check`

Before implementing or changing any rule behavior, read the Ice Knife passage
in `.references/srd-5.2.1/` and the relevant terms in
`UBIQUITOUS_LANGUAGE.md`. Verification must confirm that every modeled claim
traces to specific SRD text or an existing curated `ASSUMPTIONS.md` entry.

MBT is scarce. Use source reading, existing artifacts, parsers, and focused
unit/self-tests for discovery. Run the focused Ice Knife MBT only if a task
changes QNT/TypeScript behavior or must establish exact calibration that cannot
be established by existing promoted evidence. Follow the background timing,
single-run, zombie-evaluator, and seed reproduction rules in `AGENTS.md`.

After implementation, run the reviewer loop until convergence. Every round
must include:

1. RAW traceability and ubiquitous-language/domain review;
2. QNT role, branch, and TypeScript parity review;
3. architecture, state-minimality, authored-identity, and connascence review;
4. cleanroom contamination and freshness review;
5. project code review using `.claude/review-rules.md`.

Fix every reasonable finding, explicitly document any rejection with a
concrete reason, and repeat until no reasonable findings remain. Non-trivial
tasks require at least two reviewer rounds. Do not wait for user confirmation
between rounds.

### Task 1 - L12IKP-01-EXACT-SOURCE-CALIBRATION

Goal:

Build the narrowest reusable source-only calibration slice that proves the
exact QNT semantic obligations and MBT actions selected for Ice Knife exercise
production TypeScript behavior.

Required work:

- Reconcile the Ice Knife RAW passage, ubiquitous language, supported profile,
  rules-kernel obligations, QNT owner roles, production TypeScript owners, and
  current executable parity witnesses.
- Define or extend canonical `obligationCalibrations[]` and
  `branchCalibrations[]` schemas without combining obligation and branch facts
  into one product row.
- Discover exact branch-action coverage from executable TypeScript harness
  definitions. A green driver-level test must not imply that every sibling
  action ran.
- Register the two direct Ice Knife actions only after verifying their current
  driver, QNT hash, obligation joins, production entrypoint/projection, and
  source verification command.
- Determine applicable generic attack, save, mixed-target, exact-damage,
  resource, scaling, reaction, concentration, and connector obligations from
  RAW/QNT ownership. Do not assume every named family applies; explicit
  non-applicability must follow from the registered rule shape.
- If calibration exposes a real in-scope semantic gap and the local SRD text is
  sufficient, correct the authoritative QNT first, update production
  TypeScript and its focused parity witness, and then regenerate calibration.
  If RAW is missing or requires an owner-curated assumption, stop with the
  precise source blocker instead of choosing an interpretation.
- Accumulate independent failures for missing owners, stale hashes, unknown or
  unobserved actions, duplicate claims, adapter-only projections, and
  driver-level-only claims.
- Keep all TypeScript calibration paths and evidence source-only.

Required negative fixtures:

- one action is calibrated while a sibling selected action is unobserved;
- the generic attack-spell selected-identity driver is substituted for the
  direct Ice Knife driver;
- a semantic QNT owner has no production TypeScript parity path;
- a branch calibration references a stale QNT hash.

Success criteria:

- Both direct Ice Knife actions have exact, current, executable TypeScript
  calibration or the task leaves Ice Knife precisely source-blocked.
- Every selected semantic obligation has classified QNT and production
  TypeScript ownership.
- False grouped-driver or sibling-action implication fails generically.
- Calibration artifacts are content-addressed and cannot enter cleanroom
  output.

### Task 2 - L12IKP-02-UNIT-READINESS-SLICE

Goal:

Build one atomic Ice Knife source-readiness result and one cleanroom-safe
RAW/QNT navigation index using the Task 1 calibration.

Required work:

- Add an explicit single-Unit experiment scope and reject empty, duplicate,
  contradictory, or falsely full-corpus selections.
- Collapse the Druid, Sorcerer, and Wizard Ice Knife denominator rows into one
  Unit record while retaining all accounting row ids.
- Resolve the exact SRD anchor and join the supported rule shape to registered
  semantic obligations, classified QNT owners, required supporting QNT/import
  closure, direct MBT actions, and applicable generic route/component
  connectors.
- Derive prerequisite ordering only from registered QNT obligation/import
  dependencies and curated language-independent architecture ownership.
- Generate a cleanroom-safe projection containing only the allowed Unit,
  RAW/QNT/domain navigation and hashes.
- Add an accumulated-error readiness gate for RAW anchors, obligation joins,
  exact actions, connectors, hashes, replayability, calibration, row
  uniqueness, and copied imports.
- Repair source-owned readiness gaps whose behavior is already determined by
  local RAW/QNT. Do not carry a known repairable gap forward merely because the
  result type can represent `source-blocked`.
- Ensure the selection mechanism is reusable for another declared Unit and
  does not embed Ice Knife semantic dispatch.

Required negative fixtures:

- one of the three denominator rows is missing or assigned twice;
- the wrong selected-identity driver is chosen because it is the first
  candidate;
- one required imported QNT file is unavailable to cleanroom sync;
- TypeScript or Surface mechanics enter the target projection;
- prose guidance attempts to replace a missing semantic obligation.

Success criteria:

- Ice Knife is exactly `ready` or `source-blocked` with a non-empty complete
  issue list.
- A ready result accounts for all three denominator rows once and represents
  one target implementation.
- The target index is navigation, not a restated rule contract.
- The same gate cannot describe the one-Unit scope as full L1-2 readiness.

### Task 3 - L12IKP-03-IMMUTABLE-EXPORT

Goal:

Implement one deterministic source command that exports a ready Ice Knife
experiment and a static target `/goal` handoff without installing an executor
in the target.

Required work:

- Extend the existing export/sync ownership where possible instead of adding a
  parallel Ice Knife exporter.
- Accept an explicit single-Unit scope and refuse export unless Task 2 reports
  Ice Knife ready.
- Copy only readiness-approved RAW, QNT semantic/proof/bridge/driver files,
  their required import closure, curated domain/architecture inputs, target
  profile and generated target-facing harness projection of the canonical
  contract, and the cleanroom-safe Unit index. Do not copy source-plan authority or
  TypeScript calibration sections merely to expose the contract hash.
- Bind the manifest to the committed source SHA, declared scope, input hashes,
  canonical shared-contract hash, source calibration index hash/pass result,
  target profile, run kind, and catalog hash.
- Define the language-independent target receipt contract needed by the launch
  prompt by implementing the canonical contract's external envelope. It must
  carry target start/finish commits, clean-status attestations, run kind, exact
  branch observations, production target entrypoint/projection evidence,
  retained artifacts, start/finish timestamps, and measurement provenance.
  Source classification remains Task 4's responsibility.
- Generate a static launch prompt that tells one fresh target `/goal` to
  implement the complete Unit, replay every selected branch through its native
  QNT/MBT lane and production API, retain the required artifacts, and emit the
  receipt expected by Task 4.
- Make the launch prompt require a final handoff message that reports the
  receipt/evidence locations and directs the operator back to source intake;
  the target agent must not adjudicate its own result as source success.
- Refuse dirty allowlisted source inputs. Keep timestamps and output paths out
  of content-addressed catalog bytes.
- Prove byte-identical output for identical committed inputs.
- Provide a post-Ralph finalization invocation so the orchestration agent can
  regenerate the real export after Task 4 lands and bind it to the final clean
  output-branch commit.

Required contamination checks:

- no production TypeScript or TypeScript tests;
- no TypeScript owner, calibration, or verification paths;
- no Surface mechanics or generated source traces;
- no previous target implementation or target-language expected values;
- no Ralph runner, task plan, queue, daemon, or agent infrastructure.

Success criteria:

- One command creates a deterministic Ice Knife catalog from any clean
  committed source tree, including the final Ralph output commit.
- The manifest truthfully identifies a single-Unit pilot rather than full
  L1-2 readiness.
- A fresh target can be launched with one static `/goal` prompt and no source
  repository access.
- Any source-readiness failure prevents export instead of weakening the gate.

### Task 4 - L12IKP-04-INTAKE-AND-MEASUREMENT

Goal:

Implement source intake and observational timing for the Ice Knife pilot, then
leave a precise handoff for the real fresh-target `/goal` run.

Required work:

- Implement accumulated-error parsing and classification for Task 3's target
  receipt envelope. Verify the target start commit is an ancestor of the finish
  commit, fresh runs started clean, all runs finished clean, current target HEAD
  equals the receipt finish commit, and every selected branch/code/evidence hash
  resolves from that exact commit tree.
- When the replacement intake lands, remove the T131 dirty-start authorization
  from the active current checker. Preserve historical verification through Git
  history or a non-authorizing fixture; the tuple must not survive as a
  compatibility branch in the canonical receipt parser.
- Accept Ice Knife atomically across all three denominator rows only when every
  selected branch is observed through the target's native QNT/MBT lane and
  production API path.
- Preserve the canonical blocker union and accumulate independent intake
  issues.
- Permit same-manifest continuation only for target implementation failures.
  A source QNT, RAW, scope, calibration, harness, or target-profile correction
  invalidates the manifest. A diagnostic rehearsal may reuse its declared
  target under a new manifest; a later authoritative attempt uses a new target.
- Add synthetic receipts for conformance, source-QNT insufficiency, source
  scope contradiction, stale manifest, missing branch observation, adapter-only
  replay, and target implementation failure. Synthetic success verifies the
  parser, not the cleanroom hypothesis.
- Provide a measurement command or report generator that derives source Ralph
  phase durations from `.ralph/runs/<run-id>/events.tsv`, target elapsed time
  from receipt timestamps, and intake elapsed time from intake events.
- Record every canonical measurement-provenance field, including explicit
  unavailable variants, without letting measurement affect conformance.
- Keep measurement unavailable/reported states explicit and separate from
  acceptance. Do not store derived duration beside source timestamps.
- Render the exact post-Ralph commands, export location, target launch prompt,
  expected receipt location, and source intake invocation needed for the real
  experiment.
- Generate a fresh source-review prompt that accepts the returned receipt and
  evidence paths, runs intake and measurement, performs the required reviewer
  loop, and updates the full-plan recommendations without resuming either
  implementation agent.
- Require that source-review prompt to compare both scope plans with the
  canonical shared contract. Shared-rule findings update the contract once;
  scaling or corpus findings update only the full plan.
- Provide a source-side status command that validates available artifacts and
  prints exactly one next transition: target `/goal`, fresh source review, or
  full-plan revision. Derive the transition; do not persist redundant phase
  state.

Success criteria:

- Re-intake is idempotent and cannot partially close Ice Knife.
- A dirty start, dirty finish, non-ancestor finish, stale current HEAD, or
  artifact absent from the finish commit makes a fresh receipt unacceptable.
- Source and target blockers produce different executable next actions.
- Measurement reports source Ralph, target `/goal`, intake, and total wall time
  separately without affecting conformance.
- The Ralph tasks end with a verified export command and deterministic test
  export, tested intake tooling, and an executable handoff; they do not claim
  real target success.
- The post-Ralph finalization command regenerates that export from the clean
  final output commit before any target run begins.
- After any interruption, the source-side status command reconstructs what to
  do next without relying on chat history or agent memory.
- No reasonable reviewer finding remains after at least two final rounds.

## Post-Ralph Real Experiment

The real target experiment is deliberately outside the Ralph task graph:

1. From the clean final Ralph output branch, run the rendered finalization and
   status commands; record the Ralph run id and immutable manifest/catalog
   hashes.
2. Create a fresh target workspace with no prior implementation knowledge.
3. Copy only the finalized Task 3 export into that workspace.
4. Start one `/goal` with the generated static launch prompt and leave it
   unattended until completion or a typed blocker.
5. Return only the declared target receipt and retained evidence to source.
6. In the source repository, start one fresh source-review agent with the
   generated review prompt and returned paths; it runs Task 4's intake,
   measurement, and convergent review commands.
7. Review the target result, source findings, elapsed time, and goal usage.
8. Revise `plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md` before expanding to
   the complete corpus.

The pilot succeeds as an experiment even if the target does not conform,
provided intake can precisely identify whether the blocker belongs to the
source QNT corpus, source scope/harness, or target implementation. Only a
conformant real target receipt demonstrates Ice Knife portability.
