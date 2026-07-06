# Inductive Proof Spike

This worktree adds proof-oriented invariants to the isolated algebra QNT specs.
The goal is to separate small algebra facts that can be checked inductively from
the larger randomized MBT replay story.

## Bounded Inductive Proof Lane

`pnpm --filter @dnd/shared-algebras proof:inductive` runs the active
`*-inductive.qnt` modules through the package-local bounded harness. The lane is
not part of default `pnpm test`; default tests keep a fast reminder and a
classification guard so a new inductive module cannot be added without entering
the active lane or the state-space repair list.

Each module runs as a separate `quint verify` command with:

- `--inductive-invariant invariant`;
- `--invariant invariant`;
- `--max-steps 1`;
- the shared proof module timeout from `scripts/qnt-proof-harness.ts`.

The active inductive modules are classified as:

- legacy root algebra proof machines:
  - `action-economy-algebra-inductive.qnt`;
  - `conditions-algebra-inductive.qnt`;
  - `death-saves-algebra-inductive.qnt`.
- rule-core owned proof machines:
  - `rule-core/action-turn-procedures-inductive.qnt`;
  - `rule-core/attack-damage-composition-inductive.qnt`;
  - `rule-core/damage-component-adjustments-inductive.qnt`;
  - `rule-core/hit-point-damage-inductive.qnt`;
  - `rule-core/hit-point-recovery-inductive.qnt`;
  - `rule-core/movement-spatial-grapple-inductive.qnt`;
  - `rule-core/reactions-continuations-concentration-inductive.qnt`;
  - `rule-core/spell-procedure-profiles-inductive.qnt`;
  - `rule-core/stat-block-controls-inductive.qnt`;
  - `rule-core/unit-feature-procedure-profiles-inductive.qnt`;
  - `rule-core/zero-hit-point-lifecycle-inductive.qnt`.

No modules are currently classified as requiring state-space repair before they
can enter the active bounded lane.

## Root Algebra Inductive Invariants

These modules now have invariants shaped for `quint verify --inductive-invariant`
with explicit state-variable domain constraints before derived facts:

- `action-economy-algebra-inductive.qnt`
  - `qRestrictedUnitActionOrder` stays in `0..4`.
  - The encoded unit-action count stays in `0..2`.
  - The encoded unit-action count equals the count of represented restricted
    unit actions A and B, so the compact order code cannot represent duplicate
    or impossible unit-action ownership.
  - Turn action and bonus action flags remain boolean.
- `conditions-algebra-inductive.qnt`
  - Cached `qHasIncapacitated` equals its derived condition projection.
  - Cached `qHasProne` equals its derived condition projection.
  - `qUnconscious` implies stored `qProne`, matching the reducer behavior where
    applying Unconscious also applies Prone and removing Unconscious leaves Prone.
- `death-saves-algebra-inductive.qnt`
  - Success and failure counters stay in `0..3`.
  - `dead`, `stable`, and `hpRegained` are mutually exclusive terminal facts.
  - Dead states have three failures.
  - Stable and HP-regained states reset the death-save counters.

Verification command:

```sh
pnpm --filter @dnd/shared-algebras proof:inductive
```

## Simulation-checked Invariants

`initiative-algebra-invariant.qnt` now has a preserved invariant for the current
MBT
action space:

- round stays positive;
- `stillToAct` stays nonempty;
- `alreadyActed ++ stillToAct` remains monotone by initiative score;
- every entry's score matches its fixture creature identity;
- initiative entries are unique by creature id;
- entries and reported ties mention only known fixture creature ids;
- reported tie lists have no duplicate creature ids;
- non-`decide` insert statuses have no reported tie, while `decide` statuses
  carry a nonempty tie;
- reported tie lists stay bounded by the current fixture tie width.

This invariant passes randomized simulation:

```sh
pnpm exec quint run packages/shared-algebras/proofs/initiative-algebra-invariant.qnt --invariant invariant --max-samples 2000 --max-steps 40
```

It is not yet Apalache-shaped because the module stores initiative state as
lists and permits transition-level insertion/removal. A full inductive proof
would need a small finite list-domain predicate, probably generated from the
fixture entries, before using the invariant as `--inductive-invariant`.

## Character Creation Slice

`character-creation-runtime.mbt.qnt` now has a reducer-state invariant:

- `qDraft.revision >= 0`;
- `qDraft.revision <= 6`, matching the current manifest/action slice;
- revision is bounded by the number of filled draft flags;
- `init` result states carry `emptyDraft`;
- dependent draft flags imply their prerequisite flags, for example
  advancement and fighter choices imply primary class, background choices imply
  background, equipment purchase implies class and background equipment, and
  loadout choices imply equipment purchase;
- the draft frontier projection matches `openCreationHoles(qDraft)`;
- `qFinalization == finalizeDraft(qDraft)`;
- `Ready` is equivalent to no holes and all required manifest fields being
  filled;
- accepted and init results have no issue sets.

This is currently simulation-checked rather than Apalache-checked because the
draft record and fill issue sets are larger than the small algebra domains above.
