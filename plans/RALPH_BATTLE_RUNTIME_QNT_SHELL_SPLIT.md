# Ralph Lane: Battle Runtime QNT Shell Split

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "BRQNT-SPLIT-01-MIRROR-IMAGE-PROOF-IMPORTS",
      "status": "done",
      "title": "Move Mirror Image proof module off the full-shell battleRuntime import"
    },
    {
      "number": 2,
      "id": "BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS",
      "status": "done",
      "title": "Move See Invisibility proof module off the full-shell battleRuntime import"
    },
    {
      "number": 3,
      "id": "BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS",
      "status": "done",
      "title": "Move spell-facts proof module off the full-shell battleRuntime import"
    },
    {
      "number": 4,
      "id": "BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS",
      "status": "done",
      "title": "Move object-contact-damage proof module off the full-shell battleRuntime import"
    },
    {
      "number": 5,
      "id": "BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS",
      "status": "done",
      "title": "Move direct-condition-removal proof module off the full-shell battleRuntime import"
    },
    {
      "number": 6,
      "id": "BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT",
      "status": "done",
      "title": "Audit remaining full-shell proof consumers and append the next implementation batch"
    },
    {
      "number": 7,
      "id": "BRQNT-SPLIT-07-SAVE-SPELL-PROOF-IMPORTS",
      "status": "done",
      "title": "Move save-spell proof module off the full-shell battleRuntime import"
    },
    {
      "number": 8,
      "id": "BRQNT-SPLIT-08-SELF-TRANSFORMATION-PROOF-IMPORTS",
      "status": "done",
      "title": "Move self-transformation proof module off the full-shell battleRuntime import"
    },
    {
      "number": 9,
      "id": "BRQNT-SPLIT-09-SPELL-ATTACK-PROOF-IMPORTS",
      "status": "done",
      "title": "Move spell-attack proof module off the full-shell battleRuntime import"
    },
    {
      "number": 10,
      "id": "BRQNT-SPLIT-10-LIGHT-CONCENTRATION-MOVEMENT-REACTION-PROOF-IMPORTS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Move light/concentration/movement/reaction proof module off the full-shell battleRuntime import"
    },
    {
      "number": 11,
      "id": "BRQNT-SPLIT-11-HP-ARMOR-BUFF-SPATIAL-PROOF-IMPORTS",
      "status": "blocked",
      "title": "Move hp/armor/buff/spatial proof module off the full-shell battleRuntime import"
    },
    {
      "number": 12,
      "id": "BRQNT-SPLIT-12-GROUND-COMMAND-PROOF-IMPORTS",
      "status": "blocked",
      "title": "Move ground-command proof module off the full-shell battleRuntime import"
    },
    {
      "number": 13,
      "id": "BRQNT-SPLIT-13-CORE-COMBAT-PROOF-IMPORTS",
      "status": "blocked",
      "title": "Move core-combat proof module off the full-shell battleRuntime import"
    }
  ]
}
-->

## Objective

Continue splitting `packages/battle-runtime/battle-runtime.qnt` away from a
single full-shell battle fixture. The launcher branch already contains the first
split: Fighter/Goblin Hide/Search fixture helpers now live in
`packages/battle-runtime/battle-runtime-hide-search-fixture.qnt`, and the docs
describe `battle-runtime.qnt` as a full-shell fixture and compatibility
aggregation rather than a whole-battle authority.

This lane should keep shrinking direct `import battleRuntime.* from
"./battle-runtime"` consumers. Prefer direct imports of focused package-local
QNT slices and scenario-specific fixture modules. Do not add new full-shell
helpers to `battle-runtime.qnt`.

Declared Base SHA for every task in this lane:

```text
4ed8ba97c0fbbee5669690d7414bb54c9768ce1f
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 4ed8ba97c0fbbee5669690d7414bb54c9768ce1f HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## Global Constraints

- Use `pnpm`, never `npm`.
- Do not run battle MBT for these import-splitting tasks unless the task changes
  runtime behavior. These tasks should be QNT proof import migrations only.
- Keep changes focused. Do not rename `battle-runtime.qnt` in this lane.
- Do not copy rule logic into proof modules to avoid imports. If a proof depends
  on reducer-like package-local QNT behavior, import the focused owner module.
- If a module cannot be migrated cleanly without a behavior split, update this
  plan with a narrower follow-up task rather than forcing a broad refactor.
- Preserve RAW behavior. Before moving rule semantics rather than fixture
  plumbing, read the relevant `.references/srd-5.2.1/` passage and
  `UBIQUITOUS_LANGUAGE.md`.

## Verification

Each implementation task must run:

```sh
pnpm check:mbt-driver-closure
```

and its task-specific focused `quint test` command. If a moved proof imports a
new `*.mbt.qnt` driver or changes a `*.mbt.qnt` import, also run the closure
gate after the change and keep the driver within budget.

After significant changes, run the reviewer loop to convergence: RAW
traceability where rule semantics moved, ubiquitous-language/domain naming,
architecture/connascence, and code-review checks. Fix every reasonable finding,
explicitly reject only findings with a concrete reason, and repeat until no
reasonable findings remain.

## DAG / Queue Order

| # | Task | Status | Depends On | Purpose |
| ---: | --- | --- | --- | --- |
| 1 | BRQNT-SPLIT-01-MIRROR-IMAGE-PROOF-IMPORTS - Move Mirror Image proof module off the full-shell battleRuntime import | done | Completed baseline | Small proof-module migration to establish the pattern after Hide/Search. |
| 2 | BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS - Move See Invisibility proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-01-MIRROR-IMAGE-PROOF-IMPORTS | Second small proof-module migration so the lane proves it can advance. |
| 3 | BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS - Move spell-facts proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS | Migrate a one-test proof module with broader spell fact imports. |
| 4 | BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS - Move object-contact-damage proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS | Migrate a medium proof module after the small modules have landed. |
| 5 | BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS - Move direct-condition-removal proof module off broad full-shell dependency if present | done | BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS | The file was already direct-imported; proof still passed. |
| 6 | BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT - Audit remaining full-shell proof consumers and append the next implementation batch | done | BRQNT-SPLIT-07-SAVE-SPELL-PROOF-IMPORTS | Remaining full-shell proof consumer inventory is refreshed below. |
| 7 | BRQNT-SPLIT-07-SAVE-SPELL-PROOF-IMPORTS - Move save-spell proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS | Replacement task for the next actual full-shell consumer. |
| 8 | BRQNT-SPLIT-08-SELF-TRANSFORMATION-PROOF-IMPORTS - Move self-transformation proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT | Smallest remaining full-shell proof consumer; use it to continue the direct-import pattern. |
| 9 | BRQNT-SPLIT-09-SPELL-ATTACK-PROOF-IMPORTS - Move spell-attack proof module off the full-shell battleRuntime import | done | BRQNT-SPLIT-08-SELF-TRANSFORMATION-PROOF-IMPORTS | Medium remaining proof consumer after the small self-transformation file lands. |
| 10 | BRQNT-SPLIT-10-LIGHT-CONCENTRATION-MOVEMENT-REACTION-PROOF-IMPORTS - Move light/concentration/movement/reaction proof module off the full-shell battleRuntime import | ready-for-implementation-after-light-research | BRQNT-SPLIT-09-SPELL-ATTACK-PROOF-IMPORTS | Large movement/reaction proof consumer; preserve shell wrapper compatibility while moving direct imports. |
| 11 | BRQNT-SPLIT-11-HP-ARMOR-BUFF-SPATIAL-PROOF-IMPORTS - Move hp/armor/buff/spatial proof module off the full-shell battleRuntime import | blocked | BRQNT-SPLIT-10-LIGHT-CONCENTRATION-MOVEMENT-REACTION-PROOF-IMPORTS | Large mixed proof consumer; split only missing shell-only helpers into focused owners. |
| 12 | BRQNT-SPLIT-12-GROUND-COMMAND-PROOF-IMPORTS - Move ground-command proof module off the full-shell battleRuntime import | blocked | BRQNT-SPLIT-11-HP-ARMOR-BUFF-SPATIAL-PROOF-IMPORTS | Large command/area proof consumer; classify missing dependencies before moving helpers. |
| 13 | BRQNT-SPLIT-13-CORE-COMBAT-PROOF-IMPORTS - Move core-combat proof module off the full-shell battleRuntime import | blocked | BRQNT-SPLIT-12-GROUND-COMMAND-PROOF-IMPORTS | Final broad combat proof consumer in the refreshed inventory. |

## Task Details

### Task 1 - BRQNT-SPLIT-01-MIRROR-IMAGE-PROOF-IMPORTS - Move Mirror Image proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-mirror-image-tests.qnt` off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports only the focused QNT modules it needs.
- `battle-runtime.qnt` does not gain new wrappers or fixture helpers.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_mirror_image_intercepts_ice_knife_attack_damage_before_burst" battle-runtime-mirror-image-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

Completed by commit `7ec02375944001a4d7e334e83e1f942a3afe2aa2`.

### Task 2 - BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS - Move See Invisibility proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-see-invisibility-tests.qnt` off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports only the focused QNT modules it needs.
- Hidden/Invisibility vocabulary comes from the focused owner modules, not the
  full shell.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_see_invisibility" battle-runtime-see-invisibility-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 3 - BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS - Move spell-facts proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-spell-facts-tests.qnt` off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports focused owners directly.
- If a dependency is only available through the full shell, classify it in the
  plan as model vocabulary, bridge projection, scenario fixture, or compatibility
  wrapper before adding a new wrapper.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-spell-facts-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 4 - BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS - Move object-contact-damage proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-object-contact-damage-tests.qnt`
off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports focused owners directly.
- No object/contact-damage rule logic is duplicated in the test module.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-object-contact-damage-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 5 - BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS - Move direct-condition-removal proof module off broad full-shell dependency if present

Status: `done`

Move `packages/battle-runtime/battle-runtime-direct-condition-removal-tests.qnt`
off any broad full-shell dependency if present, and classify whether it belongs
in the current direct-import migration batch.

Acceptance:

- If the file does not import the full shell, mark this task done by updating
  the plan with that finding and append a replacement task for the next actual
  full-shell consumer.
- If it does import the full shell, migrate to focused imports.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-direct-condition-removal-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

Finding:

- `packages/battle-runtime/battle-runtime-direct-condition-removal-tests.qnt`
  already imports focused owners directly and has no full-shell
  `battleRuntime` import.

### Task 6 - BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT - Audit remaining full-shell proof consumers and append the next implementation batch

Status: `done`

Refresh the remaining full-shell consumer inventory:

```sh
rg -n 'import battleRuntime\.\* from "\./battle-runtime"' packages/battle-runtime -g'*.qnt'
```

Acceptance:

- Update this plan with the remaining consumer count and file list.
- Append at least three new Ralph-sized implementation tasks if broad-shell
  consumers remain.
- Do not mark the lane complete while broad-shell consumers remain unless the
  plan names a concrete owner-decision blocker.

Finding:

- Remaining full-shell proof consumers after Task 7: 6.
- Files:
  - `packages/battle-runtime/battle-runtime-self-transformation-tests.qnt`
  - `packages/battle-runtime/battle-runtime-spell-attack-tests.qnt`
  - `packages/battle-runtime/battle-runtime-light-concentration-movement-reaction-tests.qnt`
  - `packages/battle-runtime/battle-runtime-hp-armor-buff-spatial-tests.qnt`
  - `packages/battle-runtime/battle-runtime-ground-command-tests.qnt`
  - `packages/battle-runtime/battle-runtime-core-combat-tests.qnt`

Tasks 8-13 are the next implementation batch. Task 8 is ready now; later tasks
remain blocked only to keep the queue sequential and reviewable.

### Task 7 - BRQNT-SPLIT-07-SAVE-SPELL-PROOF-IMPORTS - Move save-spell proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-save-spell-tests.qnt` off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports focused owners directly.
- If a dependency is only available through the full shell, classify it as
  model vocabulary, bridge projection, scenario fixture, or compatibility
  wrapper before adding or moving helpers.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-save-spell-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 8 - BRQNT-SPLIT-08-SELF-TRANSFORMATION-PROOF-IMPORTS - Move self-transformation proof module off the full-shell battleRuntime import

Status: `done`

Move `packages/battle-runtime/battle-runtime-self-transformation-tests.qnt`
off:

```qnt
import battleRuntime.* from "./battle-runtime"
```

Acceptance:

- The proof module imports focused owners directly.
- No self-transformation rule logic is duplicated in the test module.
- If the proof depends on a shell-only helper, move that helper to the focused
  self-transformation owner or classify why it must remain shell compatibility.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-self-transformation-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 9 - BRQNT-SPLIT-09-SPELL-ATTACK-PROOF-IMPORTS - Move spell-attack proof module off the full-shell battleRuntime import

Status: `done`

Depends on Task 8. Move
`packages/battle-runtime/battle-runtime-spell-attack-tests.qnt` off the
full-shell import.

Acceptance:

- The proof module imports focused owners directly.
- No spell-attack, chained-attack, save-gated, or reaction rule logic is
  duplicated in the test module.
- Any missing dependency currently available only through `battle-runtime.qnt`
  is moved to the focused owner that owns the rule or fixture state.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-spell-attack-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 10 - BRQNT-SPLIT-10-LIGHT-CONCENTRATION-MOVEMENT-REACTION-PROOF-IMPORTS - Move light/concentration/movement/reaction proof module off the full-shell battleRuntime import

Status: `ready-for-implementation-after-light-research`

Depends on Task 9. Move
`packages/battle-runtime/battle-runtime-light-concentration-movement-reaction-tests.qnt`
off the full-shell import.

Acceptance:

- The proof module imports focused owners directly.
- No movement, concentration, light, or reaction rule logic is duplicated in the
  test module.
- Shell compatibility wrappers remain in `battle-runtime.qnt` only when another
  not-yet-migrated proof still imports them through the shell.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-light-concentration-movement-reaction-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 11 - BRQNT-SPLIT-11-HP-ARMOR-BUFF-SPATIAL-PROOF-IMPORTS - Move hp/armor/buff/spatial proof module off the full-shell battleRuntime import

Status: `blocked`

Depends on Task 10. Move
`packages/battle-runtime/battle-runtime-hp-armor-buff-spatial-tests.qnt` off the
full-shell import.

Acceptance:

- The proof module imports focused owners directly.
- No hit point, armor, buff, spatial, or weapon feature rule logic is duplicated
  in the test module.
- Missing shell-only dependencies are classified as model vocabulary, bridge
  projection, scenario fixture, or compatibility wrapper before moving helpers.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-hp-armor-buff-spatial-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 12 - BRQNT-SPLIT-12-GROUND-COMMAND-PROOF-IMPORTS - Move ground-command proof module off the full-shell battleRuntime import

Status: `blocked`

Depends on Task 11. Move
`packages/battle-runtime/battle-runtime-ground-command-tests.qnt` off the
full-shell import.

Acceptance:

- The proof module imports focused owners directly.
- No command, ground hazard, or area effect rule logic is duplicated in the test
  module.
- Missing shell-only dependencies are moved to focused owners only after
  classifying their domain owner.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-ground-command-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.

### Task 13 - BRQNT-SPLIT-13-CORE-COMBAT-PROOF-IMPORTS - Move core-combat proof module off the full-shell battleRuntime import

Status: `blocked`

Depends on Task 12. Move
`packages/battle-runtime/battle-runtime-core-combat-tests.qnt` off the
full-shell import.

Acceptance:

- The proof module imports focused owners directly.
- No core combat, action economy, hiding/search, or scenario fixture rule logic
  is duplicated in the test module.
- If this is the last full-shell proof consumer, audit remaining shell
  compatibility wrappers and plan the next safe cleanup step rather than doing a
  broad deletion in this task.
- The task-specific proof passes:

  ```sh
  cd packages/battle-runtime
  pnpm exec quint test --backend typescript --match "test_" battle-runtime-core-combat-tests.qnt
  ```

- `pnpm check:mbt-driver-closure` passes from the workspace root.
