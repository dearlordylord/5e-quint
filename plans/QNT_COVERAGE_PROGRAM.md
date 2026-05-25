# QNT Coverage Program

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 0, "id": "QCP-PILOT-SLICE", "status": "done", "title": "Pilot slice (creature-attack) end-to-end" },
    { "number": 1, "id": "QCP-SEMCORE-EXTRACTION", "status": "todo", "title": "Semantic-core extraction (run blocks out of rule-core .qnt)" },
    { "number": 2, "id": "QCP-MISSING-ATOMICS", "status": "todo", "title": "Author missing atomic semantic-core rules" },
    { "number": 3, "id": "QCP-COMPOSITE-SLICES", "status": "todo", "title": "Author per-composite slice MBT" },
    { "number": 4, "id": "QCP-NON-SEMANTIC-AUDIT", "status": "done", "title": "Confirm boundary and unsupported obligations are non-transitional" },
    { "number": 5, "id": "QCP-UNIT-IDENTITY-GATE", "status": "todo", "title": "Per-Unit selected-identity test as hard gate" },
    { "number": 6, "id": "QCP-INTEGRATION-MBT-PATTERNS", "status": "todo", "title": "Maintain integration MBT for high-value cross-slice sequencing" },
    { "number": 7, "id": "QCP-LANG-PARITY-MARKER", "status": "blocked", "title": "Language-target parity marker enforced per covered obligation" }
  ]
}
-->

This plan rolls up the bounded program of work to reach the achievable 100% QNT coverage as framed in [ADR-0001 — Forest of QNT slices, no single top, sibling language harnesses](../docs/adr/0001-forest-of-qnt-slices.md).

## Source Of Truth

- `docs/adr/0001-forest-of-qnt-slices.md` — architectural framing for
  slice-shaped QNT coverage. Read only the decision and consequences unless the
  task changes architecture.
- `plans/rules-kernel-coverage/README.md` — obligation/profile/marker/witness vocabulary.
- `plans/rules-kernel-coverage/obligations.jsonl` — the obligation registry
  (93 today; 87 covered, 6 boundary/unsupported).
- `plans/rules-kernel-coverage/generator-readiness.jsonl` — semantic-core status per obligation.
- `plans/unit-profile-coverage/` — per-Unit support and selected-identity tracking.
- `plans/rules-kernel-coverage/GENERATOR_READINESS_CLOSURE_REPORT.md` —
  concise closeout for the deleted historical Rust-readiness Ralph lane.
- `plans/rules-kernel-coverage/PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md` —
  background rationale for B coverage closure versus C generator readiness. Do
  not read this by default for ordinary slice tasks.

## Context Budget Rules

Ralph agents should not recursively read every linked historical plan. Use this
file as the task entrypoint and then read only the source-of-truth rows needed
for the current task:

- For any task, read this file, `plans/rules-kernel-coverage/README.md`, and
  the relevant rows in `obligations.jsonl`, `generator-readiness.jsonl`,
  `qnt-owner-roles.jsonl`, and `kernel-ir-boundaries.jsonl`.
- For a new slice, read the pilot source files listed in the handoff prompt
  below, not the deleted pilot lane transcript.
- Read the PRD or ADR only when changing the shape of the program, vocabulary,
  checker contract, or architecture.
- Never use deleted closed Ralph lanes as context. Their durable output has
  been merged into checker-owned artifacts and the closure report.

## Rust / Generator Readiness Entrypoints

Use this section as the compact queue map for future Rust migration and
generator-readiness work. Do not start from historical QMBT or closed Ralph
plans; they now redirect here because their durable output is represented in
checked artifacts.

Checked source-of-truth artifacts:

- `plans/rules-kernel-coverage/README.md` defines the generator-readiness row
  contract, owner-role vocabulary, blocker vocabulary, and kernel IR boundary
  inventory.
- `plans/rules-kernel-coverage/generator-readiness.jsonl` is the
  obligation-centered readiness queue. It owns `semanticCore`, `proofOnly`,
  `generatorSubset`, `blockedBy`, `followUpTaskIds`, and `dryRun` facts.
- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl` is the source of truth
  for QNT owner roles. Do not infer generator ownership from filenames alone.
- `plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl` records the existing
  runtime boundaries a future generator must target without adding parallel
  runtime state.
- `plans/rules-kernel-coverage/HIT_POINT_DAMAGE_RUST_DRY_RUN.md` is the current
  manual Rust dry-run vertical.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md` and
  `plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md` are the durable
  outputs of the closed ultra-golden metric lane.
- `plans/QNT_GENERATOR_READINESS_BACKLOG.md` parks drained lane work that is not
  currently runnable.

Active runnable queues:

- None. Reopen parked work by carving a small coherent batch out of
  `plans/QNT_GENERATOR_READINESS_BACKLOG.md` into a fresh Ralph lane plan.

## Working Discipline

- Tactical roll-up only; do not duplicate vocabulary or rules from the source-of-truth docs above.
- Update this file as work reveals new findings — append to the Findings section only when a future author would otherwise re-discover the same gotcha. Not a work log.
- Each task lands in its own commit (or small PR), with green checker + green parity.
- The harness gains a minimal timing wrapper (~10 lines) as part of pilot-slice tooling; no dashboard, no aggregator.

## Lane Rules

- Do not modify ADR-0001 or other architecture decisions without explicit user approval.
- Do not introduce production reducer wiring inside a slice task — slice composites stand alone; production integration is separate work.
- Do not add a new obligation whose QNT owner is still `fixture-bound`; resolve the blocker under Task 1 first.
- Add the `qnt-owner-roles.jsonl` row in the same commit as any new QNT owner — the checker fails on a missing row.
- Add the `test:mbt:<slice-name>` script in `packages/<runtime>/package.json` in the same commit as a new slice.
- If a composite slice would exceed ~50 lines of pure def, split into sub-slices.
- Do not weaken the qnt⇄ts parity contract; new slices add coverage, never replace existing parity.

## Verification

Run after every task:

- `pnpm rules-kernel-coverage:check -- --write` then `pnpm rules-kernel-coverage:check` — both green.
- The slice's parity test (`pnpm --filter <pkg> test:mbt:<slice-name>`) — green.
- For Task 1 extractions: the parity test for the atomic's existing obligation (e.g. `test:mbt:rule-core-hit-point-damage`) — green.
- `git diff --check` — clean.
- Reviewer-loop convergence (RAW traceability + ubiquitous-language + architecture/connascence + code-review) until no reasonable findings remain. Fix every reasonable finding; reject only with a concrete recorded reason.

For Task 5 (per-Unit gate): `pnpm unit-profile-coverage:check -- --write` then `pnpm unit-profile-coverage:check`.

## Ordering and Parallelism

- Task 0 (pilot): done — template for slice-shaped work.
- Tasks 1, 2, 5, 6: independent — can run in parallel worktrees.
- Task 3: per-slice dependency on Task 1 (the atomic the composite imports must be semantic-core) and Task 2 (the atomic must exist).
- Task 7: blocked on first non-TS language target arriving.

## Pilot Slice — Task 0 (QCP-PILOT-SLICE)

Status: `done`

Goal: prove the slice template end-to-end before the horizontal tasks below run in earnest.

Output:

- Hit-point-damage `run test_*` blocks were extracted from the semantic-core
  QNT owner.
- Creature attack became the first composite slice:
  `packages/battle-runtime/creature-attack.qnt`,
  `packages/battle-runtime/creature-attack.mbt.qnt`,
  `packages/battle-runtime/src/battle-reducer/creature-attack.ts`, and
  `packages/battle-runtime/src/creature-attack.mbt.test.ts`.
- The relevant obligation, owner-role, and generator-readiness rows were
  updated in checker-owned artifacts.

Acceptance: `pnpm rules-kernel-coverage:check` green; new parity test green; existing parity tests stay green.

After pilot: Tasks 1, 3 continue mechanically using the pilot as template.

## Tasks

### Task 1 - QCP-SEMCORE-EXTRACTION

Status: `todo`

Input: rule-core `.qnt` files with `run` test blocks mixed in (every row in `generator-readiness.jsonl` with `blockedBy: run-block-coupled`).

Output: `run` blocks moved out to TS unit tests next to the TS mirror (default) or to a sibling `.mbt.qnt` only when the assertion is state-machine shaped. Each rule-core file becomes pure semantic-core (only `type`, `pure def`, `pure val`, `import`). `generator-readiness.jsonl` row updated to drop the blocker. Existing parity tests stay green.

Acceptance: checker green; no `run-block-coupled` rows remain.

### Task 2 - QCP-MISSING-ATOMICS

Status: `todo`

Input: composite obligations whose semantics require atomic rules not yet broken out as standalone files (initial gap list: `spell-save-gate`, `slot-expenditure` — identified during this plan's grilling; more discovered during composite authoring).

Output: new atomic `.qnt` files in `packages/shared-algebras/proofs/rule-core/`, each pure semantic-core, with TS mirror functions and atomic-level unit tests.

Acceptance: each new atomic referenced by at least one composite slice; checker green.

### Task 3 - QCP-COMPOSITE-SLICES

Status: `in-progress` (pilot slice covers the first instance)

Input: profile-level obligations not yet witnessed by a slice-style MBT (composite `.qnt` + `.mbt.qnt` + TS mirror + parity test, per the pilot template).

Output: one composite slice per missing profile, following the pilot template. State per slice kept bounded; variability via per-action `nondet`/fills.

Acceptance: new obligation row per slice; parity test green; checker green.

### Task 4 - QCP-NON-SEMANTIC-AUDIT

Status: `done`

Input: the 6 non-`covered` rows in `obligations.jsonl` (5 boundary-only, 1 unsupported-by-admission).

Output: each row is permanently classified with rationale rather than left as a
transitional `needs-*` gap. The generated report currently shows zero open
transitional obligations.

Acceptance: checker reports 0 transitional.

### Task 5 - QCP-UNIT-IDENTITY-GATE

Status: `todo`

Input: every Unit claimed as supported in `unit-profile-coverage/`.

Output: each supported Unit has at least one selected-identity test that proves admission + entrypoint reachability. `unit-profile-coverage:check` fails if a supported Unit lacks one. Template the test where the procedure shape is uniform.

Acceptance: gate enabled; check green.

### Task 6 - QCP-INTEGRATION-MBT-PATTERNS

Status: `todo`

Input: cross-slice sequencing patterns where the production reducer composes multiple composites (concentration interactions, reaction interrupts, turn-end cleanup, ...).

Output: bounded fixture-world integration MBTs that exercise the chosen patterns. Never claim exhaustiveness; document scope per file.

Acceptance: each integration MBT documents its scope; bounded execution time; checker green.

### Task 7 - QCP-LANG-PARITY-MARKER

Status: `blocked` (waits on first non-TS language target arriving)

Input: a second language-target implementation arrives.

Output: `rules-kernel-coverage-check.cjs` learns a marker pattern `<lang>-parity-witness OBLIGATION.ID`; every `covered` obligation must have one per active language target.

Acceptance: checker enforces marker presence per active language; CI red on missing marker.

## Findings

Durable conventions for slice authors. Not a work log; entries are added only when a future author would otherwise re-discover them.

- **Driver picks need StandardSchemaV1.** Wrap Effect schemas with `Schema.standardSchemaV1(...)` — bare `Schema.Number` fails at action dispatch with `Cannot read properties of undefined (reading 'validate')`.
- **Quint int picks arrive as JS `BigInt`.** Decode to `number` at the schema boundary:
  ```ts
  const QuintIntAsNumber = Schema.transform(
    Schema.BigIntFromSelf,
    Schema.Number,
    { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
  );
  // damage: Schema.standardSchemaV1(QuintIntAsNumber)
  ```
  Promote to a shared helper when ≥2 slices need it.
- **`qnt-owner-roles.jsonl` is a hard gate.** Every covered obligation's QNT owner needs a role row in the same commit.
- **`matrix.json` and `REPORT.md` are checker-generated.** After adding/changing obligations, run `pnpm rules-kernel-coverage:check -- --write`, then `pnpm rules-kernel-coverage:check`. Commit the refreshed artifacts.
- **Mirror discipline: same names across qnt and TS.** Pure def names, type names, and field names should match the TS mirror; module qualification in qnt does not substitute for fully-qualified naming at the cross-language boundary.
- **Pick obligation kind from existing rows of the same shape.** Default to `state-transition` for state-change obligations; reserve `composition` for sequencing/contract obligations.
- **Name state fields by identity, not role, when roles swap.** If both actors can attack and be attacked, use `creatureAHp`/`creatureBHp`, not `attackerHp`/`targetHp` — role-named fields lie when the second actor takes the action.
- **Document out-of-scope in the qnt header.** Future reviewers should see what a slice intentionally does not model without inferring from absences.
- **Extracting `run` blocks (Task 1):** if the corresponding MBT replay or atomic-level test already covers the scenario, delete outright (no coverage lost); otherwise extract to a TS unit test next to the TS mirror.

## Ralph Handoff Prompt

Every Ralph task prompt for this lane must include its task-base check: compare
the declared base ref and `HEAD`, then verify the declared Base SHA is an
ancestor of `HEAD`. If the ancestor check fails, stop and report the
branch-base mismatch. Do not use this program plan as authority to rebase a
task worktree.

Ralph must run the implementer, reviewer, handback, and decider loop until
`accept`. The reviewer loop must include RAW traceability,
ubiquitous-language / domain-language, architecture / connascence, and
code-review passes. Fix every reasonable finding, explicitly reject only
findings with a concrete reason, and repeat until no reasonable findings
remain.

Pilot template for slice-shaped tasks (Tasks 0 and 3): the creature-attack
pilot landed across commits `3d7cec0a`, `cfee3625`, and `888d9283`. Prefer
reading the current files over historical diffs. Read
`packages/battle-runtime/creature-attack*.qnt`,
`packages/battle-runtime/src/battle-reducer/creature-attack.ts`, and
`packages/battle-runtime/src/creature-attack.mbt.test.ts` before authoring
a new slice.
