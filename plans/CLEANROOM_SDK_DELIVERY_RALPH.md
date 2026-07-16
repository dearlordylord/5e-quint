# Cleanroom SDK Delivery — Ralph Queue

This is an execution projection, not a requirements authority. Every runnable
task hydrates its canonical GitHub issue at claim time; issue bodies own scope,
acceptance, WIP disposition, and focused verification.

<!-- ralph-github-issues: required -->

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "GH-41", "status": "done", "title": "Reconcile shared D&D language to SRD 5.2.1", "dependencies": [] },
    { "number": 2, "id": "GH-42", "status": "done", "title": "Curate source-ready cleanroom modeling assumptions", "dependencies": [] },
    { "number": 3, "id": "GH-25", "status": "done", "title": "Repair the nine canonical RAW-to-Surface catalog omissions", "dependencies": [] },
    { "number": 4, "id": "GH-44", "status": "done", "title": "Enforce complete canonical Surface discovery and regeneration", "dependencies": ["GH-25"] },
    { "number": 5, "id": "GH-47", "status": "done", "title": "Drive spell execution from typed procedure facts", "dependencies": ["GH-25"] },
    { "number": 6, "id": "GH-92", "status": "ready-for-implementation", "title": "Derive presentation-free Oracle facts from production owners", "dependencies": [] },
    { "number": 7, "id": "GH-152", "status": "done", "title": "Define closed schema-owned roles for every decoded Surface string", "dependencies": ["GH-44"] },
    { "number": 8, "id": "GH-98", "status": "ready-for-implementation", "title": "Generate the strict SRD Surface aggregate and bounded Draft 2020-12 schema pair", "dependencies": ["GH-44"] },
    { "number": 9, "id": "GH-100", "status": "ready-for-implementation", "title": "Deliver the canonical weapon-attack interruption frame", "dependencies": ["GH-47"] },
    { "number": 10, "id": "GH-154", "status": "ready-for-implementation", "title": "Admit Character Build mechanics through one exact profile graph", "dependencies": ["GH-25"] },
    { "number": 11, "id": "GH-113", "status": "ready-for-implementation", "title": "Project Stat Block mechanics into typed creatures and available Acts", "dependencies": ["GH-25"] },
    { "number": 12, "id": "GH-93", "status": "ready-for-implementation", "title": "Compose the lifecycle-safe Oracle Case and Trace wire algebra", "dependencies": ["GH-92"] },
    { "number": 13, "id": "GH-97", "status": "ready-for-implementation", "title": "Publish the fail-closed redistributable corpus audit", "dependencies": ["GH-153", "GH-41", "GH-42"] },
    { "number": 14, "id": "GH-99", "status": "ready-for-implementation", "title": "Publish and read the Surface pair through one atomic leased store", "dependencies": ["GH-98"] },
    { "number": 15, "id": "GH-46", "status": "ready-for-implementation", "title": "Prove portable Surface decoding and atomic rejection", "dependencies": ["GH-98"] },
    { "number": 16, "id": "GH-101", "status": "ready-for-implementation", "title": "Select spell-cast interruption frames from typed invocations", "dependencies": ["GH-100"] },
    { "number": 17, "id": "GH-108", "status": "ready-for-implementation", "title": "Deliver next-turn command movement interruption frames", "dependencies": ["GH-100"] },
    { "number": 18, "id": "GH-110", "status": "ready-for-implementation", "title": "Project Unit mechanics through Character Sheet and Battle handoff", "dependencies": ["GH-155"] },
    { "number": 19, "id": "GH-114", "status": "ready-for-implementation", "title": "Execute typed Stat Block attack and multi-part Act procedures", "dependencies": ["GH-113"] },
    { "number": 20, "id": "GH-94", "status": "ready-for-implementation", "title": "Publish equivalent strict Oracle schemas and canonical value semantics", "dependencies": ["GH-93"] },
    { "number": 21, "id": "GH-102", "status": "ready-for-implementation", "title": "Deliver spell-attack interruption frames", "dependencies": ["GH-101"] },
    { "number": 22, "id": "GH-103", "status": "ready-for-implementation", "title": "Deliver the attack-burst attack-hit interruption frame", "dependencies": ["GH-101"] },
    { "number": 23, "id": "GH-105", "status": "ready-for-implementation", "title": "Deliver damage-only save-gated interruption frames", "dependencies": ["GH-101"] },
    { "number": 24, "id": "GH-111", "status": "ready-for-implementation", "title": "Initialize Battle creatures from passive Unit mechanics", "dependencies": ["GH-110"] },
    { "number": 25, "id": "GH-112", "status": "ready-for-implementation", "title": "Execute active Unit mechanics through Battle Acts and reactions", "dependencies": ["GH-110"] },
    { "number": 26, "id": "GH-95", "status": "ready-for-implementation", "title": "Generate the portable Oracle fixture corpus through an Effect CLI", "dependencies": ["GH-94"] },
    { "number": 27, "id": "GH-104", "status": "ready-for-implementation", "title": "Deliver the attack-burst resolution interruption frame", "dependencies": ["GH-103"] },
    { "number": 28, "id": "GH-106", "status": "ready-for-implementation", "title": "Deliver after-damage reaction interruption frames", "dependencies": ["GH-101", "GH-105"] },
    { "number": 29, "id": "GH-115", "status": "ready-for-implementation", "title": "Thread authored selection and parsed mechanics through composition", "dependencies": ["GH-47", "GH-155", "GH-110", "GH-111", "GH-112", "GH-113", "GH-114"] },
    { "number": 30, "id": "GH-62", "status": "ready-for-implementation", "title": "Run stateless Character Creation through fresh Character Sheet", "dependencies": ["GH-95"] },
    { "number": 31, "id": "GH-107", "status": "ready-for-implementation", "title": "Deliver reaction-forced movement interruption frames", "dependencies": ["GH-105", "GH-106"] },
    { "number": 32, "id": "GH-116", "status": "ready-for-implementation", "title": "Separate durable Character Sheet facts from encounter Execution State", "dependencies": ["GH-115"] },
    { "number": 33, "id": "GH-56", "status": "ready-for-implementation", "title": "Resume Shield-interrupted procedures by capability and phase", "dependencies": ["GH-102", "GH-104"] },
    { "number": 34, "id": "GH-121", "status": "ready-for-implementation", "title": "Enter Characters and Stat Blocks into stateless Oracle Battle evaluation", "dependencies": ["GH-62"] },
    { "number": 35, "id": "GH-51", "status": "ready-for-implementation", "title": "Introduce the atomic catalog-install and admission result boundary", "dependencies": ["GH-46", "GH-116"] },
    { "number": 36, "id": "GH-119", "status": "ready-for-implementation", "title": "Preserve the typed Magic Missile cross-record interruption rule", "dependencies": ["GH-56"] },
    { "number": 37, "id": "GH-120", "status": "ready-for-implementation", "title": "Resume interrupted procedures through the shared damage lifecycle", "dependencies": ["GH-56", "GH-107"] },
    { "number": 38, "id": "GH-52", "status": "ready-for-implementation", "title": "Admit complete Unit Authored Mechanics Graphs", "dependencies": ["GH-51"] },
    { "number": 39, "id": "GH-53", "status": "ready-for-implementation", "title": "Admit complete Stat Block Authored Mechanics Graphs", "dependencies": ["GH-51"] },
    { "number": 40, "id": "GH-122", "status": "ready-for-implementation", "title": "Trace selected Oracle Acts through Runtime Hole continuation replay", "dependencies": ["GH-121"] },
    { "number": 41, "id": "GH-117", "status": "ready-for-implementation", "title": "Bind selected Authored Mechanics Graphs from the admitted catalog", "dependencies": ["GH-52", "GH-53"] },
    { "number": 42, "id": "GH-64", "status": "ready-for-implementation", "title": "Expose persistent Oracle CLI identity and batch evaluation", "dependencies": ["GH-122"] },
    { "number": 43, "id": "GH-65", "status": "ready-for-implementation", "title": "Expose and launch the loopback Oracle HTTP identity and batch service", "dependencies": ["GH-122"] },
    { "number": 44, "id": "GH-118", "status": "ready-for-implementation", "title": "Discover dynamic availability from bound admitted mechanics", "dependencies": ["GH-117"] },
    { "number": 45, "id": "GH-66", "status": "ready-for-implementation", "title": "Prove Oracle transport equivalence and atomic failure behavior", "dependencies": ["GH-64", "GH-65"] },
    { "number": 46, "id": "GH-29", "status": "ready-for-implementation", "title": "Generate the complete Cleanroom Mechanics Slice", "dependencies": ["GH-118"] },
    { "number": 47, "id": "GH-58", "status": "ready-for-implementation", "title": "Derive the active executable QNT root and semantic closure", "dependencies": ["GH-29", "GH-119", "GH-120", "GH-108"] },
    { "number": 48, "id": "GH-59", "status": "ready-for-implementation", "title": "Execute every derived QNT root in its real lane", "dependencies": ["GH-58"] },
    { "number": 49, "id": "GH-60", "status": "ready-for-implementation", "title": "Replay runtime-bearing QNT through production Functional Reducers", "dependencies": ["GH-59"] },
    { "number": 50, "id": "GH-40", "status": "ready-for-implementation", "title": "Package the calibrated source-free Opaque Oracle distribution", "dependencies": ["GH-29", "GH-60", "GH-66"] },
    { "number": 51, "id": "GH-34", "status": "ready-for-implementation", "title": "Publish the single language-neutral Cleanroom Core", "dependencies": ["GH-97", "GH-29", "GH-60", "GH-122"] },
    { "number": 52, "id": "GH-35", "status": "ready-for-implementation", "title": "Publish the minimal Rust Target Language Adapter", "dependencies": ["GH-34", "GH-40"] },
    { "number": 53, "id": "GH-36", "status": "ready-for-implementation", "title": "Assemble the source-produced Cleanroom Harness", "dependencies": ["GH-34", "GH-35", "GH-40"] },
    { "number": 54, "id": "GH-153", "status": "done", "title": "Traverse decoded Surface strings with finite tuple-aware schema lockstep", "dependencies": ["GH-152"] },
    { "number": 55, "id": "GH-155", "status": "ready-for-implementation", "title": "Replay renamed Unit mechanics through the Character Build lifecycle", "dependencies": ["GH-154"] }
  ]
}
-->

## Operator policy

The task index contains only canonical runnable leaves plus the five integrated
leaves retained as `done`. Non-runnable specifications, aggregate outcomes, and
retained failed/oversized outcome parents are intentionally absent.

Before every launch, validate the live GitHub/body projection and recompute the
local frontier:

```bash
pnpm exec tsx scripts/ralph-issue-context.ts validate-plan --plan plans/CLEANROOM_SDK_DELIVERY_RALPH.md
node scripts/ralph-task-index.cjs plans/CLEANROOM_SDK_DELIVERY_RALPH.md --runnable-tsv
```

The first frontier is Tasks 6–11. Use distinct launcher worktrees/run IDs/output
branches and no more than four concurrent Ralph agents. Create all six launcher
worktrees from this accepted planning branch:

```bash
git worktree add -b launcher/cleanroom-gh92 ../dnd-cleanroom-gh92 wayfinder/cleanroom-ralph-redesign
git worktree add -b launcher/cleanroom-gh96 ../dnd-cleanroom-gh96 wayfinder/cleanroom-ralph-redesign
git worktree add -b launcher/cleanroom-gh98 ../dnd-cleanroom-gh98 wayfinder/cleanroom-ralph-redesign
git worktree add -b launcher/cleanroom-gh100 ../dnd-cleanroom-gh100 wayfinder/cleanroom-ralph-redesign
git worktree add -b launcher/cleanroom-gh109 ../dnd-cleanroom-gh109 wayfinder/cleanroom-ralph-redesign
git worktree add -b launcher/cleanroom-gh113 ../dnd-cleanroom-gh113 wayfinder/cleanroom-ralph-redesign
```

Launch Tasks 6–9 as the first capacity batch:

```bash
(cd ../dnd-cleanroom-gh92 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 6 --run-id cleanroom-gh92 --output-branch ralph/cleanroom-gh92/integration)
(cd ../dnd-cleanroom-gh96 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 7 --run-id cleanroom-gh96 --output-branch ralph/cleanroom-gh96/integration)
(cd ../dnd-cleanroom-gh98 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 8 --run-id cleanroom-gh98 --output-branch ralph/cleanroom-gh98/integration)
(cd ../dnd-cleanroom-gh100 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 9 --run-id cleanroom-gh100 --output-branch ralph/cleanroom-gh100/integration)
```

When a slot is free, launch the remaining first-frontier tasks:

```bash
(cd ../dnd-cleanroom-gh109 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 10 --run-id cleanroom-gh109 --output-branch ralph/cleanroom-gh109/integration)
(cd ../dnd-cleanroom-gh113 && scripts/ralph-run.sh plans/CLEANROOM_SDK_DELIVERY_RALPH.md --base wayfinder/cleanroom-ralph-redesign --task 11 --run-id cleanroom-gh113 --output-branch ralph/cleanroom-gh113/integration)
```

After every accepted integration, update the task status through the normal
Ralph completion flow, pull the accepted plan state into every idle launcher,
rerun both validation commands above, and launch only rows newly emitted by
`--runnable-tsv`. Never infer a wave from this prose or from a retained parent.
The live issue claim still prevents duplicate execution. Follow `AGENTS.md` for
the shared verification lock and one-MBT-at-a-time policy.

## Tasks

Each task section contains exactly one canonical issue link. Ralph hydrates the
issue body and fails closed if its live state, label, blocker set, or claim is
not runnable.

### Task 1 - GH-41

Canonical issue: [Reconcile shared D&D language to SRD 5.2.1](https://github.com/dearlordylord/5e-quint/issues/41)

### Task 2 - GH-42

Canonical issue: [Curate source-ready cleanroom modeling assumptions](https://github.com/dearlordylord/5e-quint/issues/42)

### Task 3 - GH-25

Canonical issue: [Repair the nine canonical RAW-to-Surface catalog omissions](https://github.com/dearlordylord/5e-quint/issues/25)

### Task 4 - GH-44

Canonical issue: [Enforce complete canonical Surface discovery and regeneration](https://github.com/dearlordylord/5e-quint/issues/44)

### Task 5 - GH-47

Canonical issue: [Drive spell execution from typed procedure facts](https://github.com/dearlordylord/5e-quint/issues/47)

### Task 6 - GH-92

Canonical issue: [Derive presentation-free Oracle facts from production owners](https://github.com/dearlordylord/5e-quint/issues/92)

### Task 7 - GH-152

Canonical issue: [Define closed schema-owned roles for every decoded Surface string](https://github.com/dearlordylord/5e-quint/issues/152)

### Task 8 - GH-98

Canonical issue: [Generate the strict SRD Surface aggregate and bounded Draft 2020-12 schema pair](https://github.com/dearlordylord/5e-quint/issues/98)

### Task 9 - GH-100

Canonical issue: [Deliver the canonical weapon-attack interruption frame](https://github.com/dearlordylord/5e-quint/issues/100)

### Task 10 - GH-154

Canonical issue: [Admit Character Build mechanics through one exact profile graph](https://github.com/dearlordylord/5e-quint/issues/154)

### Task 11 - GH-113

Canonical issue: [Project Stat Block mechanics into typed creatures and available Acts](https://github.com/dearlordylord/5e-quint/issues/113)

### Task 12 - GH-93

Canonical issue: [Compose the lifecycle-safe Oracle Case and Trace wire algebra](https://github.com/dearlordylord/5e-quint/issues/93)

### Task 13 - GH-97

Canonical issue: [Publish the fail-closed redistributable corpus audit](https://github.com/dearlordylord/5e-quint/issues/97)

### Task 14 - GH-99

Canonical issue: [Publish and read the Surface pair through one atomic leased store](https://github.com/dearlordylord/5e-quint/issues/99)

### Task 15 - GH-46

Canonical issue: [Prove portable Surface decoding and atomic rejection](https://github.com/dearlordylord/5e-quint/issues/46)

### Task 16 - GH-101

Canonical issue: [Select spell-cast interruption frames from typed invocations](https://github.com/dearlordylord/5e-quint/issues/101)

### Task 17 - GH-108

Canonical issue: [Deliver next-turn command movement interruption frames](https://github.com/dearlordylord/5e-quint/issues/108)

### Task 18 - GH-110

Canonical issue: [Project Unit mechanics through Character Sheet and Battle handoff](https://github.com/dearlordylord/5e-quint/issues/110)

### Task 19 - GH-114

Canonical issue: [Execute typed Stat Block attack and multi-part Act procedures](https://github.com/dearlordylord/5e-quint/issues/114)

### Task 20 - GH-94

Canonical issue: [Publish equivalent strict Oracle schemas and canonical value semantics](https://github.com/dearlordylord/5e-quint/issues/94)

### Task 21 - GH-102

Canonical issue: [Deliver spell-attack interruption frames](https://github.com/dearlordylord/5e-quint/issues/102)

### Task 22 - GH-103

Canonical issue: [Deliver the attack-burst attack-hit interruption frame](https://github.com/dearlordylord/5e-quint/issues/103)

### Task 23 - GH-105

Canonical issue: [Deliver damage-only save-gated interruption frames](https://github.com/dearlordylord/5e-quint/issues/105)

### Task 24 - GH-111

Canonical issue: [Initialize Battle creatures from passive Unit mechanics](https://github.com/dearlordylord/5e-quint/issues/111)

### Task 25 - GH-112

Canonical issue: [Execute active Unit mechanics through Battle Acts and reactions](https://github.com/dearlordylord/5e-quint/issues/112)

### Task 26 - GH-95

Canonical issue: [Generate the portable Oracle fixture corpus through an Effect CLI](https://github.com/dearlordylord/5e-quint/issues/95)

### Task 27 - GH-104

Canonical issue: [Deliver the attack-burst resolution interruption frame](https://github.com/dearlordylord/5e-quint/issues/104)

### Task 28 - GH-106

Canonical issue: [Deliver after-damage reaction interruption frames](https://github.com/dearlordylord/5e-quint/issues/106)

### Task 29 - GH-115

Canonical issue: [Thread authored selection and parsed mechanics through composition](https://github.com/dearlordylord/5e-quint/issues/115)

### Task 30 - GH-62

Canonical issue: [Run stateless Character Creation through fresh Character Sheet](https://github.com/dearlordylord/5e-quint/issues/62)

### Task 31 - GH-107

Canonical issue: [Deliver reaction-forced movement interruption frames](https://github.com/dearlordylord/5e-quint/issues/107)

### Task 32 - GH-116

Canonical issue: [Separate durable Character Sheet facts from encounter Execution State](https://github.com/dearlordylord/5e-quint/issues/116)

### Task 33 - GH-56

Canonical issue: [Resume Shield-interrupted procedures by capability and phase](https://github.com/dearlordylord/5e-quint/issues/56)

### Task 34 - GH-121

Canonical issue: [Enter Characters and Stat Blocks into stateless Oracle Battle evaluation](https://github.com/dearlordylord/5e-quint/issues/121)

### Task 35 - GH-51

Canonical issue: [Introduce the atomic catalog-install and admission result boundary](https://github.com/dearlordylord/5e-quint/issues/51)

### Task 36 - GH-119

Canonical issue: [Preserve the typed Magic Missile cross-record interruption rule](https://github.com/dearlordylord/5e-quint/issues/119)

### Task 37 - GH-120

Canonical issue: [Resume interrupted procedures through the shared damage lifecycle](https://github.com/dearlordylord/5e-quint/issues/120)

### Task 38 - GH-52

Canonical issue: [Admit complete Unit Authored Mechanics Graphs](https://github.com/dearlordylord/5e-quint/issues/52)

### Task 39 - GH-53

Canonical issue: [Admit complete Stat Block Authored Mechanics Graphs](https://github.com/dearlordylord/5e-quint/issues/53)

### Task 40 - GH-122

Canonical issue: [Trace selected Oracle Acts through Runtime Hole continuation replay](https://github.com/dearlordylord/5e-quint/issues/122)

### Task 41 - GH-117

Canonical issue: [Bind selected Authored Mechanics Graphs from the admitted catalog](https://github.com/dearlordylord/5e-quint/issues/117)

### Task 42 - GH-64

Canonical issue: [Expose persistent Oracle CLI identity and batch evaluation](https://github.com/dearlordylord/5e-quint/issues/64)

### Task 43 - GH-65

Canonical issue: [Expose and launch the loopback Oracle HTTP identity and batch service](https://github.com/dearlordylord/5e-quint/issues/65)

### Task 44 - GH-118

Canonical issue: [Discover dynamic availability from bound admitted mechanics](https://github.com/dearlordylord/5e-quint/issues/118)

### Task 45 - GH-66

Canonical issue: [Prove Oracle transport equivalence and atomic failure behavior](https://github.com/dearlordylord/5e-quint/issues/66)

### Task 46 - GH-29

Canonical issue: [Generate the complete Cleanroom Mechanics Slice](https://github.com/dearlordylord/5e-quint/issues/29)

### Task 47 - GH-58

Canonical issue: [Derive the active executable QNT root and semantic closure](https://github.com/dearlordylord/5e-quint/issues/58)

### Task 48 - GH-59

Canonical issue: [Execute every derived QNT root in its real lane](https://github.com/dearlordylord/5e-quint/issues/59)

### Task 49 - GH-60

Canonical issue: [Replay runtime-bearing QNT through production Functional Reducers](https://github.com/dearlordylord/5e-quint/issues/60)

### Task 50 - GH-40

Canonical issue: [Package the calibrated source-free Opaque Oracle distribution](https://github.com/dearlordylord/5e-quint/issues/40)

### Task 51 - GH-34

Canonical issue: [Publish the single language-neutral Cleanroom Core](https://github.com/dearlordylord/5e-quint/issues/34)

### Task 52 - GH-35

Canonical issue: [Publish the minimal Rust Target Language Adapter](https://github.com/dearlordylord/5e-quint/issues/35)

### Task 53 - GH-36

Canonical issue: [Assemble the source-produced Cleanroom Harness](https://github.com/dearlordylord/5e-quint/issues/36)

### Task 54 - GH-153

Canonical issue: [Traverse decoded Surface strings with finite tuple-aware schema lockstep](https://github.com/dearlordylord/5e-quint/issues/153)

### Task 55 - GH-155

Canonical issue: [Replay renamed Unit mechanics through the Character Build lifecycle](https://github.com/dearlordylord/5e-quint/issues/155)
