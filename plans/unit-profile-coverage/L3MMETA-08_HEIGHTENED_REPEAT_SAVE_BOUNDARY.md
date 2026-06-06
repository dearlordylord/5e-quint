# L3MMETA-08 Heightened Repeat-Save Boundary

## Scope

Task 8 resolves the Heightened Spell repeat-save lifecycle boundary as a
future implementation slice. It does not promote new runtime behavior.

RAW and domain checks consulted:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Heightened Spell`
- `packages/surface/content/hideous_laughter.dhall`
- `UBIQUITOUS_LANGUAGE.md#Spell Invocation`
- `UBIQUITOUS_LANGUAGE.md#Spell Effect`
- `UBIQUITOUS_LANGUAGE.md#Active Ongoing Feature Occurrences`
- `UBIQUITOUS_LANGUAGE.md#D20 Rolls`
- `UBIQUITOUS_LANGUAGE.md#Advantage and Disadvantage`

Heightened Spell costs 2 Sorcery Points when the caster casts a spell that
forces a creature to make a Saving Throw, and it gives one target of the spell
Disadvantage on saves against that spell. The RAW wording is not limited to the
initial Saving Throw. If a spell creates a Spell Effect that later asks the
same target to make another Saving Throw against that spell, the selected
Heightened target must still be identifiable at the later save hole.

## Current Runtime Boundary

The current runtime truthfully supports Heightened for initial save-gated
procedures:

- `saveGatedDamage`
- non-repeating `saveGatedCondition`
- `saveGatedConditionImmunity`
- `saveGatedAttackRollAdvantage`
- `command`

The current support gate deliberately rejects repeat-save lifecycles in
`packages/battle-runtime/src/battle-reducer/metamagic-support.ts`:

- `hideousLaughter`
- `greaseGroundHazard`
- `gustOfWindLine`
- `saveGatedCondition` when `effect.repeatSave !== null`

That rejection is the correct boundary until the runtime carries the
cast-selected Heightened target from the Spell Invocation into the later Spell
Effect save holes. Adding a selected-identity witness that only exercises the
initial save would overclaim the RAW sentence "saves against the spell."

## State-Shape Decision

Do not add a parallel Heightened registry keyed by spell id, source combatant,
or authored spell identity. Repeat-save hooks already read active effects that
represent the ongoing spell consequence. Heightened repeat-save state should
live on, or be derivable through, the same active-effect occurrence that later
creates the repeat-save hole.

For combatant-owned per-target effects such as `hideousLaughter`, do not store
the target id again. The repeat-save hole builder already receives the owning
combatant id as the target, so a stored `targetId` could disagree with the
active-effect owner. The smallest first-slice state shape is a presence-only
spell-save roll-mode rider attached to the repeat-save-capable spell effect
occurrence:

```typescript
type CombatantOwnedSpellEffectSavingThrowRollModeRider = {
  readonly kind: "heightenedSpellTargetDisadvantage";
};
```

The rider is absent when the cast was not Heightened. When present on a
combatant-owned per-target effect, it means that the active-effect owner is the
one Heightened target selected during the cast. This keeps invalid states
narrow: the repeat-save hole does not infer from authored identity, does not
duplicate target lists, does not store a second target id, and does not store
another copy of the active effect.

If a future slice introduces or reuses `BattleSpellEffectOccurrenceId` for these
repeat-save effects, the rider should remain occurrence-local. The occurrence
id is the identity of the Spell Effect; the rider is the selected roll-mode fact
for that occurrence.

## Recommended First Slice

Promote Heightened repeat-save carry-through for `hideousLaughter` first.

Why this is the narrowest runnable slice:

- It is a per-target combatant-owned active-effect lifecycle after the initial
  save. Hideous Laughter itself remains a target-list spell invocation and can
  target one additional creature per higher Spell Slot level; the rider belongs
  only on the selected Heightened target's failed active effect.
- The runtime already creates end-turn and damage-triggered repeat-save holes
  from the `hideousLaughter` active effect.
- Damage-triggered repeat saves already project Advantage; Heightened should
  compose through the existing Saving Throw roll-mode combination semantics so
  Advantage and Disadvantage cancel to a normal roll.
- It avoids the area-occurrence questions that `greaseGroundHazard` and
  `gustOfWindLine` must solve for later creatures entering or ending turns in a
  persisted area.

Recommended implementation steps:

1. Add an occurrence-local Saving Throw roll-mode rider to the
   `hideousLaughter` active effect shape, populated only when Heightened Spell
   was selected for that cast.
2. Thread the existing `heightenedSpellTargetId` from
   `saveMetamagicSelectionState` into `applyHideousLaughterEffects` only as an
   admission check: the rider may be attached to a failed target's effect when
   that failed target is the selected Heightened target. Do not store the target
   id on the `hideousLaughter` effect.
3. Apply the presence-only rider in
   `hideousLaughterRepeatSavingThrowOutcomeHole` for both end-turn repeat saves
   and damage-triggered repeat saves. Damage-triggered Advantage plus
   Heightened Disadvantage must project as normal roll mode.
4. Update the focused QNT owner so Heightened repeat-save roll-mode projection
   is modeled at the same boundary as the runtime.
5. Add focused runtime tests for initial failed save, end-turn repeat save, and
   damage-triggered repeat save cancellation.
6. Add or extend selected-identity MBT evidence only after the runtime and QNT
   owner carry the Heightened roll-mode fact through the Spell Effect
   occurrence.
7. Remove `hideousLaughter` from the repeat-save Heightened support rejection
   only after the above evidence exists. Leave `greaseGroundHazard`,
   `gustOfWindLine`, and repeating `saveGatedCondition` blocked.

## Deferred Area And Multi-Target Slices

`greaseGroundHazard` and `gustOfWindLine` should be later slices. They need
explicit persisted area occurrence identity plus a target-specific Heightened
rider that applies only to the selected target's saves against that casting.
Unlike combatant-owned `hideousLaughter`, an area occurrence is not owned by the
selected creature, so the area-slice rider may need an explicit selected target
id colocated with the persisted area occurrence. It must not infer from spell id
or area shape.

Repeating `saveGatedCondition` should also be a later slice unless it is scoped
to a concrete single-target profile. Multi-target repeating conditions need the
same occurrence-local selected-target rider shape as area spells, but without
area membership facts.

## Verification Guidance

No MBT run is needed for this boundary task because no runtime behavior changed.

The future `hideousLaughter` implementation should verify with:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime-metamagic-resource.test.ts src/unit-profile-admission-hideous-laughter-repeat-saves.test.ts`
- A focused selected-identity MBT run for Heightened Hideous Laughter, using the
  AGENTS.md timing/background protocol.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
