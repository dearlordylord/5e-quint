# Level 1-2 Legal Character Vertical

## Term Status

`Level 1-2 Legal Character Vertical` is a temporary cleanroom/harness milestone,
not repo-wide ubiquitous language and not an SRD domain term. Do not add it to
`UBIQUITOUS_LANGUAGE.md`, do not treat it as a permanent package concept, and
do not let it rename existing domain boundaries such as Character Draft,
Character Build, Character Sheet, Creature, Battle, or Settlement.

The term exists to tell a cleanroom implementer what source-visible capability
must be reproducible before the next fresh cleanroom run is considered useful:
a narrow, source-shaped lifecycle path that composes the existing character
creation, sheet, battle, and settlement owners without becoming a parallel
adapter layer.

## Goal

Build the first programmatic legal character lifecycle vertical for the
cleanroom harness using SRD level 1 and level 2 play:

`legal character creation -> finalized CharacterBuild -> CharacterSheet -> battle
creature projection -> legal battle operation -> CharacterSheet settlement`

The first target is one canonical Fighter level 1 and level 2 path. The path is
temporary scaffold evidence: it proves that the lifecycle spine composes, not
that every SRD level 1-2 class, species, background, spell, equipment, and
multiclass combination is complete.

## Scoped Meaning

For this plan, `legal` means the vertical enters each layer through that layer's
existing source-owned public boundary:

- character creation starts from `createCharacterDraft`, discovers holes, fills
  those holes through `fillCreationHoles`, and reaches `finalizeCharacterDraft`
  as `ready`;
- the sheet is created through `createFreshCharacterSheet` and therefore keeps
  mutable in-play state distinct from build-derived capacities;
- battle entry uses `characterSheetBattleInit`, so Character Sheet facts are
  projected into a creature-facing battle combatant rather than re-authored;
- the battle operation is selected through battle-runtime discovery and resolved
  through public battle-runtime subject resolution;
- settlement uses `settleCharacterSheetFromBattle`, preserving CharacterBuild
  identity and writing only accepted battle-owned deltas back to sheet state.

This does not mean TypeScript has made every structurally constructible illegal
object impossible in all internal tests. It means the cleanroom-facing lifecycle
is driven by source-owned operations that reject unsupported or illegal inputs
at typed/parser/result boundaries, and the cleanroom harness must reproduce that
shape rather than constructing final states directly.

## Current State

The source repo already has the pieces needed for a narrow vertical:

- `@dnd/character-creation-runtime` owns draft discovery, batch fills,
  finalization, and supported level-2 Fighter progression.
- `@dnd/character-sheet-runtime` owns playable sheet state, HP capacity/current
  HP, rest/resource state, and sheet parsers.
- `@dnd/character-battle-runtime` owns sheet-to-battle initialization and
  battle-to-sheet settlement.
- `CHARACTER.LIFECYCLE.LAYER_PROJECTION` already has a deterministic replay
  witness for one Fighter draft, one Skeleton Shortsword attack, and settlement.

The cleanroom gap is source-visible lifecycle pressure: a cleanroom implementer
can currently satisfy too much by replaying projection-shaped functions instead
of demonstrating that the existing source-owned public boundaries compose into a
legal lifecycle. The next repair should first make that lifecycle visible in
source tests and cleanroom harness inputs before promoting any production API.

## Non-Goals

- Do not widen to all level 1-2 SRD content in the first slice.
- Do not add PHB+ authored identity.
- Do not duplicate CharacterBuild-derived capacities on CharacterSheet or battle
  state.
- Do not make battle own character creation, sheet, or progression facts.
- Do not add cleanroom-only adapters that bypass source runtime shapes.

## Proposed Slices

1. **Name and document the vertical.**
   Keep `Level 1-2 Legal Character Vertical` inside this plan and cleanroom
   harness handoff material only. Do not link it from repo-wide domain language
   unless it is renamed into a permanent domain concept.

2. **Extract the canonical Fighter path into source-owned test support.**
   Move the fixed draft-fill sequence currently embedded in
   `character-layer-projection-lifecycle.mbt.test.ts` into a focused helper that
   returns typed `CharacterBuild`/`CharacterSheet` evidence for the supported
   Fighter L1/L2 path. Keep it in test support unless a production caller needs
   it.

3. **Prove the vertical before promoting any production facade.**
   The cleanroom harness may use test-support helpers or replay fixtures to
   exercise the lifecycle, but it should not create a new source package concept
   merely to name this temporary milestone. If app or MCP later needs one
   operation, promote only the repeated source-shaped protocol and keep it as
   composition over existing creation, sheet, battle-init, battle runtime, and
   settlement functions.

   Decision: the first implementation should avoid a new production facade. It
   should extract the canonical Fighter L1/L2 path into source-owned test
   support and prove the vertical through focused tests and QNT coverage first.

4. **Tighten the lifecycle witness.**
   Extend `CHARACTER.LIFECYCLE.LAYER_PROJECTION` only with facts needed to prove
   the public vertical boundary:
   no open creation holes before finalization, build identity unchanged through
   battle, sheet-owned HP settles battle-owned HP, and invalid battle/session
   handoffs are rejected at the boundary.

5. **Add cleanroom harness evidence after source behavior is clear.**
   Register the source-owned helper/API and QNT witness in the cleanroom branch
   coverage inputs so a cleanroom implementer must reproduce the vertical rather
   than only projection-shaped functions.

   Decision: use both source-side lifecycle witness pressure and cleanroom
   branch/harness pressure. The lifecycle witness proves the source composition;
   the cleanroom harness prevents a cleanroom implementation from passing with
   projection-shaped placeholders.

6. **Then add Wizard L1 as the second vertical.**
   Use Wizard L1 to exercise spellbook/prepared spell/Spell Slot and spell
   battle invocation behavior. Do this only after the Fighter vertical proves
   the lifecycle API shape.

## Implementation Tasks

1. Extract the Fighter lifecycle fixture from
   `packages/character-battle-runtime/src/character-layer-projection-lifecycle.mbt.test.ts`
   into source-owned test support. The helper should still drive creation
   through `createCharacterDraft`, `discoverCreationHoles`, `fillCreationHoles`,
   and `finalizeCharacterDraft`; it must not construct `CharacterBuild` by hand.

2. Add a focused source test that uses the extracted helper to create the
   canonical Fighter L1/L2 build, creates a fresh Character Sheet, enters battle
   through `characterSheetBattleInit`, resolves one public battle-runtime action,
   and settles through `settleCharacterSheetFromBattle`.

3. Tighten `character-layer-projection-lifecycle.mbt.qnt` and its TS replay only
   where the current witness is too projection-shaped. Prefer high-signal facts:
   no open holes before finalization, finalized build identity preserved, HP
   projected into battle, battle-owned HP delta settled back, and invalid
   boundary attempts rejected.

4. Update rules-kernel coverage registry rows only if markers, qnt owners,
   parity witnesses, or generated report entries change. Reuse
   `CHARACTER.LIFECYCLE.LAYER_PROJECTION`; do not add a duplicate obligation for
   the temporary cleanroom milestone.

5. Add cleanroom branch/harness evidence after the source test and witness shape
   are settled. The harness should force a cleanroom implementation to reproduce
   the same source-visible lifecycle sequence, not merely return the expected
   projection record.

6. Run focused verification for changed packages, then rules-kernel coverage if
   registry artifacts changed. Avoid battle MBT unless executable battle-runtime
   or QNT behavior changes beyond the deterministic lifecycle witness.

## Success Definition

Success for the first slice is concrete:

- A test can create the canonical Fighter L1/L2 character through the public
  creation protocol, not by constructing `CharacterBuild` by hand.
- The test can create a fresh `CharacterSheet` and enter battle through
  `characterSheetBattleInit`.
- The test can perform one legal battle operation through battle-runtime public
  discovery/resolution APIs.
- Settlement updates CharacterSheet HP and preserves CharacterBuild identity.
- Invalid creation/session/battle handoffs fail through typed results or parser
  issues, not by exposing a usable illegal state.
- Cleanroom harness coverage can force this same lifecycle shape without adding
  a broad level 1-2 combinatorial obligation.

## Verification

- Read the relevant SRD 5.2.1 passages before implementation:
  Character Creation, Character Sheet, The Order of Combat, Hit Points, Damage
  Rolls, Dropping to 0 Hit Points, and Fighter level 1-2 class features touched
  by the slice.
- Check `UBIQUITOUS_LANGUAGE.md` for Character Sheet, Hit Points, Creature,
  Battle, and related terms before naming new public concepts.
- Run reviewer-loop convergence after implementation: RAW traceability,
  ubiquitous-language/domain language, architecture/connascence, and code-review
  passes until no reasonable findings remain.
- Run focused package tests for changed character-creation, sheet, and
  character-battle files.
- Run rules-kernel coverage checks if obligation markers or generated coverage
  artifacts change.
- Run battle MBT only if executable battle-runtime/QNT behavior changes beyond
  deterministic lifecycle witness coverage.

## Default Decisions

None currently. Default future choices toward the smallest source-shaped slice:
canonical Fighter L1/L2 first, source-owned test support before production API,
tightened lifecycle witness plus cleanroom harness evidence, and no broad level
1-2 content widening until this lifecycle composes end to end.
