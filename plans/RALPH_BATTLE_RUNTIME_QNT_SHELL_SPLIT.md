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
      "status": "ready-for-implementation-after-light-research",
      "title": "Move See Invisibility proof module off the full-shell battleRuntime import"
    },
    {
      "number": 3,
      "id": "BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Move spell-facts proof module off the full-shell battleRuntime import"
    },
    {
      "number": 4,
      "id": "BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Move object-contact-damage proof module off the full-shell battleRuntime import"
    },
    {
      "number": 5,
      "id": "BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Move direct-condition-removal proof module off the full-shell battleRuntime import"
    },
    {
      "number": 6,
      "id": "BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT",
      "status": "ready-for-research",
      "title": "Audit remaining full-shell proof consumers and append the next implementation batch"
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
| 2 | BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS - Move See Invisibility proof module off the full-shell battleRuntime import | ready-for-implementation-after-light-research | BRQNT-SPLIT-01-MIRROR-IMAGE-PROOF-IMPORTS | Second small proof-module migration so the lane proves it can advance. |
| 3 | BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS - Move spell-facts proof module off the full-shell battleRuntime import | ready-for-implementation-after-light-research | BRQNT-SPLIT-02-SEE-INVISIBILITY-PROOF-IMPORTS | Migrate a one-test proof module with broader spell fact imports. |
| 4 | BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS - Move object-contact-damage proof module off the full-shell battleRuntime import | ready-for-implementation-after-light-research | BRQNT-SPLIT-03-SPELL-FACTS-PROOF-IMPORTS | Migrate a medium proof module after the small modules have landed. |
| 5 | BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS - Move direct-condition-removal proof module off broad full-shell dependency if present | ready-for-implementation-after-light-research | BRQNT-SPLIT-04-OBJECT-CONTACT-PROOF-IMPORTS | Migrate another medium proof module and remove any newly unused shell import. |
| 6 | BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT - Audit remaining full-shell proof consumers and append the next implementation batch | ready-for-research | BRQNT-SPLIT-05-DIRECT-CONDITION-REMOVAL-PROOF-IMPORTS | Refresh the inventory and append the next Ralph-sized batch. |

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

Status: `ready-for-implementation-after-light-research`

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

Status: `ready-for-implementation-after-light-research`

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

Status: `ready-for-implementation-after-light-research`

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

Status: `ready-for-implementation-after-light-research`

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

### Task 6 - BRQNT-SPLIT-06-REMAINING-FULL-SHELL-CONSUMER-AUDIT - Audit remaining full-shell proof consumers and append the next implementation batch

Status: `ready-for-research`

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
