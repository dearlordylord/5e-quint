# Cleanroom SDK Delivery — Ralph Queue

This is an execution queue, not a requirements authority. Each task hydrates its
canonical GitHub issue at run time and fails closed when that issue is not open,
runnable, or unblocked.

<!-- ralph-github-issues: required -->

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "GH-41",
      "status": "done",
      "title": "Reconcile shared D&D language to SRD 5.2.1",
      "dependencies": []
    },
    {
      "number": 2,
      "id": "GH-42",
      "status": "done",
      "title": "Curate source-ready cleanroom modeling assumptions",
      "dependencies": []
    },
    {
      "number": 3,
      "id": "GH-25",
      "status": "done",
      "title": "Repair the nine canonical RAW-to-Surface catalog omissions",
      "dependencies": []
    },
    {
      "number": 4,
      "id": "GH-61",
      "status": "ready-for-implementation",
      "title": "Define the strict Oracle Case and Trace algebra",
      "dependencies": []
    },
    {
      "number": 5,
      "id": "GH-43",
      "status": "ready-for-implementation",
      "title": "Audit redistributable cleanroom rules, identity, and licensing",
      "dependencies": [
        "GH-41",
        "GH-42"
      ]
    },
    {
      "number": 6,
      "id": "GH-44",
      "status": "ready-for-implementation",
      "title": "Enforce complete canonical Surface discovery and regeneration",
      "dependencies": [
        "GH-25"
      ]
    },
    {
      "number": 7,
      "id": "GH-47",
      "status": "ready-for-implementation",
      "title": "Drive spell execution from typed procedure facts",
      "dependencies": [
        "GH-25"
      ]
    },
    {
      "number": 8,
      "id": "GH-48",
      "status": "ready-for-implementation",
      "title": "Drive Unit mechanics from typed support profiles",
      "dependencies": [
        "GH-25"
      ]
    },
    {
      "number": 9,
      "id": "GH-49",
      "status": "ready-for-implementation",
      "title": "Drive Stat Block mechanics from typed support profiles",
      "dependencies": [
        "GH-25"
      ]
    },
    {
      "number": 10,
      "id": "GH-62",
      "status": "ready-for-implementation",
      "title": "Run stateless Character Creation through fresh Character Sheet",
      "dependencies": [
        "GH-61"
      ]
    },
    {
      "number": 11,
      "id": "GH-45",
      "status": "ready-for-implementation",
      "title": "Publish the strict SRD Surface aggregate and Draft 2020-12 schema",
      "dependencies": [
        "GH-44"
      ]
    },
    {
      "number": 12,
      "id": "GH-50",
      "status": "ready-for-implementation",
      "title": "Close composition and character-sheet authored-identity boundaries",
      "dependencies": [
        "GH-47",
        "GH-48",
        "GH-49"
      ]
    },
    {
      "number": 13,
      "id": "GH-55",
      "status": "ready-for-implementation",
      "title": "Capture interrupted-procedure facts in QNT and production state",
      "dependencies": [
        "GH-47"
      ]
    },
    {
      "number": 14,
      "id": "GH-63",
      "status": "ready-for-implementation",
      "title": "Run stateless Battle entry, Acts, and Runtime Hole continuations",
      "dependencies": [
        "GH-62"
      ]
    },
    {
      "number": 15,
      "id": "GH-46",
      "status": "ready-for-implementation",
      "title": "Prove portable Surface decoding and atomic rejection",
      "dependencies": [
        "GH-45"
      ]
    },
    {
      "number": 16,
      "id": "GH-56",
      "status": "ready-for-implementation",
      "title": "Resume Shield-interrupted procedures by capability and phase",
      "dependencies": [
        "GH-55"
      ]
    },
    {
      "number": 17,
      "id": "GH-51",
      "status": "ready-for-implementation",
      "title": "Introduce the atomic catalog-install and admission result boundary",
      "dependencies": [
        "GH-46",
        "GH-50"
      ]
    },
    {
      "number": 18,
      "id": "GH-57",
      "status": "ready-for-implementation",
      "title": "Calibrate typed cross-record and shared lifecycle interactions",
      "dependencies": [
        "GH-56"
      ]
    },
    {
      "number": 19,
      "id": "GH-52",
      "status": "ready-for-implementation",
      "title": "Admit complete Unit Authored Mechanics Graphs",
      "dependencies": [
        "GH-51"
      ]
    },
    {
      "number": 20,
      "id": "GH-53",
      "status": "ready-for-implementation",
      "title": "Admit complete Stat Block Authored Mechanics Graphs",
      "dependencies": [
        "GH-51"
      ]
    },
    {
      "number": 21,
      "id": "GH-54",
      "status": "ready-for-implementation",
      "title": "Consume admitted mechanics in binding and dynamic availability",
      "dependencies": [
        "GH-52",
        "GH-53"
      ]
    },
    {
      "number": 22,
      "id": "GH-29",
      "status": "ready-for-implementation",
      "title": "Generate the complete Cleanroom Mechanics Slice",
      "dependencies": [
        "GH-54"
      ]
    },
    {
      "number": 23,
      "id": "GH-58",
      "status": "ready-for-implementation",
      "title": "Derive the active executable QNT root and semantic closure",
      "dependencies": [
        "GH-29",
        "GH-57"
      ]
    },
    {
      "number": 24,
      "id": "GH-59",
      "status": "ready-for-implementation",
      "title": "Execute every derived QNT root in its real lane",
      "dependencies": [
        "GH-58"
      ]
    },
    {
      "number": 25,
      "id": "GH-60",
      "status": "ready-for-implementation",
      "title": "Replay runtime-bearing QNT through production Functional Reducers",
      "dependencies": [
        "GH-59"
      ]
    },
    {
      "number": 26,
      "id": "GH-64",
      "status": "ready-for-implementation",
      "title": "Expose the persistent Oracle CLI batch surface",
      "dependencies": [
        "GH-63"
      ]
    },
    {
      "number": 27,
      "id": "GH-65",
      "status": "ready-for-implementation",
      "title": "Expose the Oracle HTTP batch surface",
      "dependencies": [
        "GH-63"
      ]
    },
    {
      "number": 28,
      "id": "GH-66",
      "status": "ready-for-implementation",
      "title": "Prove Oracle transport equivalence and atomic failure behavior",
      "dependencies": [
        "GH-64",
        "GH-65"
      ]
    },
    {
      "number": 29,
      "id": "GH-40",
      "status": "ready-for-implementation",
      "title": "Package the calibrated source-free Opaque Oracle distribution",
      "dependencies": [
        "GH-29",
        "GH-60",
        "GH-66"
      ]
    },
    {
      "number": 30,
      "id": "GH-34",
      "status": "ready-for-implementation",
      "title": "Publish the single language-neutral Cleanroom Core",
      "dependencies": [
        "GH-43",
        "GH-29",
        "GH-60",
        "GH-63"
      ]
    },
    {
      "number": 31,
      "id": "GH-35",
      "status": "ready-for-implementation",
      "title": "Publish the minimal Rust Target Language Adapter",
      "dependencies": [
        "GH-34",
        "GH-40"
      ]
    },
    {
      "number": 32,
      "id": "GH-36",
      "status": "ready-for-implementation",
      "title": "Assemble the source-produced Cleanroom Harness",
      "dependencies": [
        "GH-34",
        "GH-35",
        "GH-40"
      ]
    }
  ]
}
-->

## Operator policy

Each concurrent lane uses a distinct linked launcher worktree, run ID, and
output branch. The runner's
remote issue claim prevents two runs from taking the same canonical leaf. A
task landed directly with `--commit-to-base` closes its issue automatically. An
integration-branch task stays open and claimed until that branch is accepted;
then use `pnpm exec tsx scripts/ralph-issue-context.ts complete` with that run's
persisted owner token and output branch to verify the exact accepted commit,
close the issue, and lease-release the claim.

The built-in `--task` selection is the thin lane projection. There are no lane
files because a second plan would duplicate task status and dependency truth.

Never run more than one MBT process across lanes. Follow `AGENTS.md` for the
required process checks, background timing wrapper, progress observation, and
seed reproduction.

Create the four frontier launcher worktrees from the same accepted base:

```bash
git worktree add -b launcher/cleanroom-gh41 ../dnd-cleanroom-gh41 master
git worktree add -b launcher/cleanroom-gh42 ../dnd-cleanroom-gh42 master
git worktree add -b launcher/cleanroom-gh25 ../dnd-cleanroom-gh25 master
git worktree add -b launcher/cleanroom-gh61 ../dnd-cleanroom-gh61 master
```

Then run these four commands concurrently, one in each of four separate
terminals:

```bash
(cd ../dnd-cleanroom-gh41 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base master --task 1 --run-id cleanroom-gh41 --output-branch ralph/cleanroom-gh41/integration)
(cd ../dnd-cleanroom-gh42 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base master --task 2 --run-id cleanroom-gh42 --output-branch ralph/cleanroom-gh42/integration)
(cd ../dnd-cleanroom-gh25 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base master --task 3 --run-id cleanroom-gh25 --output-branch ralph/cleanroom-gh25/integration)
(cd ../dnd-cleanroom-gh61 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base master --task 4 --run-id cleanroom-gh61 --output-branch ralph/cleanroom-gh61/integration)
```

The linked worktrees share the runner's Git-common-directory MBT lock. Keep the
lock around every MBT command as instructed by the generated prompts.

## Tasks

### Task 1 - GH-41

Canonical issue: [Reconcile shared D&D language to SRD 5.2.1](https://github.com/dearlordylord/5e-quint/issues/41)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 2 - GH-42

Canonical issue: [Curate source-ready cleanroom modeling assumptions](https://github.com/dearlordylord/5e-quint/issues/42)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 3 - GH-25

Canonical issue: [Repair the nine canonical RAW-to-Surface catalog omissions](https://github.com/dearlordylord/5e-quint/issues/25)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 4 - GH-61

Canonical issue: [Define the strict Oracle Case and Trace algebra](https://github.com/dearlordylord/5e-quint/issues/61)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 5 - GH-43

Canonical issue: [Audit redistributable cleanroom rules, identity, and licensing](https://github.com/dearlordylord/5e-quint/issues/43)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 6 - GH-44

Canonical issue: [Enforce complete canonical Surface discovery and regeneration](https://github.com/dearlordylord/5e-quint/issues/44)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 7 - GH-47

Canonical issue: [Drive spell execution from typed procedure facts](https://github.com/dearlordylord/5e-quint/issues/47)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 8 - GH-48

Canonical issue: [Drive Unit mechanics from typed support profiles](https://github.com/dearlordylord/5e-quint/issues/48)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 9 - GH-49

Canonical issue: [Drive Stat Block mechanics from typed support profiles](https://github.com/dearlordylord/5e-quint/issues/49)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 10 - GH-62

Canonical issue: [Run stateless Character Creation through fresh Character Sheet](https://github.com/dearlordylord/5e-quint/issues/62)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 11 - GH-45

Canonical issue: [Publish the strict SRD Surface aggregate and Draft 2020-12 schema](https://github.com/dearlordylord/5e-quint/issues/45)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 12 - GH-50

Canonical issue: [Close composition and character-sheet authored-identity boundaries](https://github.com/dearlordylord/5e-quint/issues/50)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 13 - GH-55

Canonical issue: [Capture interrupted-procedure facts in QNT and production state](https://github.com/dearlordylord/5e-quint/issues/55)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 14 - GH-63

Canonical issue: [Run stateless Battle entry, Acts, and Runtime Hole continuations](https://github.com/dearlordylord/5e-quint/issues/63)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 15 - GH-46

Canonical issue: [Prove portable Surface decoding and atomic rejection](https://github.com/dearlordylord/5e-quint/issues/46)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 16 - GH-56

Canonical issue: [Resume Shield-interrupted procedures by capability and phase](https://github.com/dearlordylord/5e-quint/issues/56)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 17 - GH-51

Canonical issue: [Introduce the atomic catalog-install and admission result boundary](https://github.com/dearlordylord/5e-quint/issues/51)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 18 - GH-57

Canonical issue: [Calibrate typed cross-record and shared lifecycle interactions](https://github.com/dearlordylord/5e-quint/issues/57)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 19 - GH-52

Canonical issue: [Admit complete Unit Authored Mechanics Graphs](https://github.com/dearlordylord/5e-quint/issues/52)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 20 - GH-53

Canonical issue: [Admit complete Stat Block Authored Mechanics Graphs](https://github.com/dearlordylord/5e-quint/issues/53)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 21 - GH-54

Canonical issue: [Consume admitted mechanics in binding and dynamic availability](https://github.com/dearlordylord/5e-quint/issues/54)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 22 - GH-29

Canonical issue: [Generate the complete Cleanroom Mechanics Slice](https://github.com/dearlordylord/5e-quint/issues/29)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 23 - GH-58

Canonical issue: [Derive the active executable QNT root and semantic closure](https://github.com/dearlordylord/5e-quint/issues/58)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 24 - GH-59

Canonical issue: [Execute every derived QNT root in its real lane](https://github.com/dearlordylord/5e-quint/issues/59)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 25 - GH-60

Canonical issue: [Replay runtime-bearing QNT through production Functional Reducers](https://github.com/dearlordylord/5e-quint/issues/60)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 26 - GH-64

Canonical issue: [Expose the persistent Oracle CLI batch surface](https://github.com/dearlordylord/5e-quint/issues/64)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 27 - GH-65

Canonical issue: [Expose the Oracle HTTP batch surface](https://github.com/dearlordylord/5e-quint/issues/65)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 28 - GH-66

Canonical issue: [Prove Oracle transport equivalence and atomic failure behavior](https://github.com/dearlordylord/5e-quint/issues/66)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 29 - GH-40

Canonical issue: [Package the calibrated source-free Opaque Oracle distribution](https://github.com/dearlordylord/5e-quint/issues/40)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 30 - GH-34

Canonical issue: [Publish the single language-neutral Cleanroom Core](https://github.com/dearlordylord/5e-quint/issues/34)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 31 - GH-35

Canonical issue: [Publish the minimal Rust Target Language Adapter](https://github.com/dearlordylord/5e-quint/issues/35)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.

### Task 32 - GH-36

Canonical issue: [Assemble the source-produced Cleanroom Harness](https://github.com/dearlordylord/5e-quint/issues/36)

Ralph-only: fetch this issue into the shared task context and fail closed if it is unavailable, closed, non-runnable, or blocked. The issue body owns requirements; do not copy them into this plan.
