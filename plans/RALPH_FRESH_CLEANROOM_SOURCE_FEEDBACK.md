# Ralph Fresh Cleanroom Source Feedback

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "FCSF-01-ACTIVE-EFFECT-CONCENTRATION-CLEANUP-SOURCE-INPUT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Make concentration-break active-effect cleanup publicly derivable from source inputs"
    },
    {
      "number": 2,
      "id": "FCSF-02-SCALAR-ACTIVE-EFFECT-PROFILE-PROGRESSION",
      "status": "ready-for-research",
      "title": "Make cumulative scalar active-effect profile progression derivable"
    },
    {
      "number": 3,
      "id": "FCSF-03-SELECTED-SPELL-RESIDUAL-SHAPES",
      "status": "ready-for-research",
      "title": "Split residual selected spell effects into generic source route shapes"
    },
    {
      "number": 4,
      "id": "FCSF-04-OBJECT-STALE-SUBJECT-PUBLIC-PROTOCOL",
      "status": "ready-for-research",
      "title": "Define public stale object subject route protocol or blocker"
    },
    {
      "number": 5,
      "id": "FCSF-05-REACTION-INTERRUPT-PAYLOAD-TAXONOMY",
      "status": "ready-for-research",
      "title": "Admit generic reaction and interrupt payload taxonomy facts"
    },
    {
      "number": 6,
      "id": "FCSF-06-CHARACTER-SHEET-HANDOFF-REJECTION-PAYLOADS",
      "status": "ready-for-research",
      "title": "Admit character, sheet, and handoff rejection/resource payload facts"
    },
    {
      "number": 7,
      "id": "FCSF-07-FEATURE-SPECIES-METAMAGIC-RESIDUAL-FACTS",
      "status": "ready-for-research",
      "title": "Admit residual feature, species, and metamagic generic substrate facts"
    },
    {
      "number": 8,
      "id": "FCSF-08-PACKAGE-REFRESH-AND-FRESH-REPLAY-SEED",
      "status": "blocked",
      "title": "Refresh cleanroom package and seed the next fresh replay campaign"
    }
  ]
}
-->

## Purpose

Use the fresh cleanroom blockers as source-input feedback. The source package
must make reducer-shaped semantics inferable from focused `.qnt` slices,
RAW/domain guidance, and curated cleanroom guidance. A cleanroom worker should
not need TypeScript implementation code, dirty Rust implementation code, or
authored identity dispatch to decide the runtime shape.

The accepted fresh target baseline before this plan is
`cd4465556d18729121f56f5834ac00f8b0b3d15c` in
`/workspace/typescript/.codex-worktrees/dnd-fresh-cleanroom-dry-run-fc00`.
Campaign control evidence lives in
`/workspace/typescript/.codex-worktrees/dnd-cleanroom-rrconv-19/tasks/campaigns/level-1-2-runtime-reducer-route/`.

## Global Rules

- Run the Ralph task-base check before research:
  - log the declared Base ref/SHA from the task prompt;
  - log `HEAD`;
  - run `git merge-base --is-ancestor <Base SHA> HEAD`;
  - stop if the ancestor check fails.
- Before changing rule behavior, read the relevant SRD 5.2.1 passages under
  `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`.
- Keep source QNT as focused slices. Do not create a whole-battle QNT and do
  not import `battle-runtime-model.qnt` or behavioral barrels from MBT route
  drivers.
- Production runtime semantics must not dispatch on authored names, ids,
  slugs, source headings, provenance sections, page references, official
  catalog labels, or synthetic fixture labels.
- If a cleanroom route needs a fact that cannot be stated from QNT/RAW/domain
  guidance, record that as a source-input blocker instead of inferring from
  TypeScript or dirty cleanroom implementation code.
- MBT is scarce. Run focused battle MBT only as final validation for changed
  behavior, never for exploratory inspection.

## Verification

Every task that changes QNT/guidance must include:

- RAW and ubiquitous-language traceability notes for the modeled rule facts.
- Focused QNT/MBT validation for the touched package surface. For Task 1,
  prefer:

  ```sh
  cd packages/battle-runtime
  MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run \
    src/concentration-break-teardown.mbt.test.ts \
    src/roll-modifier-active-effects.mbt.test.ts \
    src/active-effect-lifecycle-routes.mbt.test.ts
  ```

- Repository gates:

  ```sh
  pnpm check:mbt-driver-closure
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  git diff --check
  ```

- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code-review passes. Fix every
  reasonable finding; explicitly reject only findings with a concrete reason.

### Task 1

`FCSF-01-ACTIVE-EFFECT-CONCENTRATION-CLEANUP-SOURCE-INPUT`

Goal:

Resolve or strictly narrow fresh blocker
`FEXP-04-roll-modifier-concentration-break-route-not-publicly-observable` by
making concentration-break active-effect cleanup publicly derivable from source
inputs.

Starting points:

- Campaign blocker source feedback:
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-rrconv-19/tasks/campaigns/level-1-2-runtime-reducer-route/FEXP_BLOCKER_SOURCE_FEEDBACK.md`
- Existing focused route inputs:
  - `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
  - `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
  - `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
  - `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
  - `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`
  - `packages/battle-runtime/battle-runtime-reducer-route.qnt`
  - `packages/battle-runtime/battle-runtime-fill-kinds.qnt`
  - `packages/battle-runtime/battle-runtime-hole-kinds.qnt`
- Cleanroom guidance/package surfaces:
  - `cleanroom-input/guidance/**`
  - `cleanroom-input/branch-coverage/reducer-route-inventory.json`

Expected product change:

- Add or revise focused source QNT/guidance so a cleanroom target can infer,
  without TypeScript implementation code, that failed concentration saves,
  voluntary concentration end, and replacement concentration effects use public
  reducer route events owned by concentration and active-effect state.
- Preserve the generic reducer surface shape: route discovery/subject
  resolution, typed holes/fills, `BattleConcentrationOwner`, and
  `BattleActiveEffectOwner`.
- If the existing QNT already states the route but the copied package/guidance
  makes it hard to consume, update the smallest durable artifact that supplies
  the missing derivability record. Do not duplicate facts in a parallel driver.
- Keep selected spell identity out of production semantics. SRD spell names may
  appear only in RAW traceability, tests, fixtures, catalogs, or evidence
  boundaries.
- Add or refresh source-side TS MBT parity coverage when route-witness behavior
  changes.

Plan Impact:

- If this task resolves the blocker, update later Task 8 dependencies/details so
  the next cleanroom package refresh can replay the new source input.
- If this task discovers the blocker is already fully represented source-side
  and only the fresh target failed to consume it, record the concrete package
  artifact and change Task 8 into the replay-only next step.
- If this task cannot honestly resolve the blocker, narrow it into a more
  precise blocker with the missing QNT/RAW/domain fact named.

### Task 2

`FCSF-02-SCALAR-ACTIVE-EFFECT-PROFILE-PROGRESSION`

Goal:

Resolve or narrow
`FEXP-04-scalar-active-effect-cumulative-sequence-needs-profile-progression` by
making cumulative scalar-buff active-effect progression facts generic and
derivable from source QNT/guidance.

Starting points:

- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt`

Plan Impact:

- Update Task 8 if the package can be refreshed and replayed.
- Split this task if profile progression requires multiple unrelated owner
  families.

### Task 3

`FCSF-03-SELECTED-SPELL-RESIDUAL-SHAPES`

Research and split residual selected spell blockers into generic route-input
tasks for hit-point-regain prevention, next-attack roll mode, opportunity-attack
denial, condition/poison riders, object/light riders, mixed target outcomes, and
exact damage projection facts.

### Task 4

`FCSF-04-OBJECT-STALE-SUBJECT-PUBLIC-PROTOCOL`

Research whether stale object replay should be reachable through discovery and
resolution history or through an explicit public stale-object subject token.
Produce either source QNT/guidance or a sharper blocker.

### Task 5

`FCSF-05-REACTION-INTERRUPT-PAYLOAD-TAXONOMY`

Admit generic reaction active-effect, post-damage save/damage, slot
expenditure, interrupted spell-slot preservation, and typed interrupt
continuation payload vocabulary where RAW/domain facts justify it.

### Task 6

`FCSF-06-CHARACTER-SHEET-HANDOFF-REJECTION-PAYLOADS`

Admit character creation partial-fill, stale rejection, sheet resource/rest, and
battle settlement conflict/zero-HP source facts without duplicating runtime
state across layers.

### Task 7

`FCSF-07-FEATURE-SPECIES-METAMAGIC-RESIDUAL-FACTS`

Admit residual feature/species/metamagic generic substrate facts: passive
damage, saving-throw/ability-check roll mode, creature-space movement,
spell-modification payloads, spell-source profiles, and active-feature spell
attack roll mode.

### Task 8

`FCSF-08-PACKAGE-REFRESH-AND-FRESH-REPLAY-SEED`

Blocked until at least one source-input task lands. Refresh the cleanroom package
from the updated source commit and create a small fresh-target replay task that
proves the newly supplied facts are consumed through public reducer entrypoints.

Blocker Type: dependency

Blocker Detail: waits for at least one of Tasks 1 through 7 to produce accepted
source input.
