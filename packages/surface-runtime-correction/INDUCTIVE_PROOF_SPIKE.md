# Inductive Proof Spike

This worktree adds proof-oriented invariants to the isolated algebra QNT specs.
The goal is to separate small algebra facts that can be checked inductively from
the larger randomized MBT replay story.

## Apalache-checked Inductive Invariants

These modules now have invariants shaped for `quint verify --inductive-invariant`
with explicit state-variable domain constraints before derived facts:

- `action-economy-algebra-mbt.qnt`
  - `qRestrictedUnitActionOrder` stays in `0..4`.
  - The encoded unit-action count stays in `0..2`.
  - The encoded unit-action count equals the count of represented restricted
    unit actions A and B, so the compact order code cannot represent duplicate
    or impossible unit-action ownership.
  - Turn action and bonus action flags remain boolean.
- `conditions-algebra-mbt.qnt`
  - Cached `qHasIncapacitated` equals its derived condition projection.
  - Cached `qHasProne` equals its derived condition projection.
  - `qUnconscious` implies stored `qProne`, matching the reducer behavior where
    applying Unconscious also applies Prone and removing Unconscious leaves Prone.
- `death-saves-algebra-mbt.qnt`
  - Success and failure counters stay in `0..3`.
  - `dead`, `stable`, and `hpRegained` are mutually exclusive terminal facts.
  - Dead states have three failures.
  - Stable and HP-regained states reset the death-save counters.

Verification commands:

```sh
export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH"
pnpm exec quint verify packages/surface-runtime-correction/action-economy-algebra-mbt.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1
pnpm exec quint verify packages/surface-runtime-correction/conditions-algebra-mbt.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1
pnpm exec quint verify packages/surface-runtime-correction/death-saves-algebra-mbt.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1
```

## Simulation-checked Invariants

`initiative-algebra-mbt.qnt` now has a preserved invariant for the current MBT
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
pnpm exec quint run packages/surface-runtime-correction/initiative-algebra-mbt.qnt --invariant invariant --max-samples 2000 --max-steps 40
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
- `qHoles == openCreationHoles(qDraft)`;
- `qFinalization == finalizeDraft(qDraft)`;
- `Ready` is equivalent to no holes and all required manifest fields being
  filled;
- accepted and init results have no issue sets.

This is currently simulation-checked rather than Apalache-checked because the
draft record and fill issue sets are larger than the small algebra domains above.
