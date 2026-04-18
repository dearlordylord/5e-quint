# Proposal: True Polymorph surface widenings

## Classification: `atom_widening`

True Polymorph (Level 9 Transmutation, SRD 5.2.1) was explicitly anticipated by the surface designers — `saveAppliesIf: "unwilling_target"` and `Duration.permanentIfMaintainedFull` were both added with True Polymorph as the named pressure case, and the `transform_target` atom comment lists it alongside Shapechange and Wild Shape. Despite this, three of four mechanical gaps block honest encoding.

## What fits

- `activation` family with a `save_gate` phase ✓
- `saveAppliesIf: "unwilling_target"` ✓ (designed for this spell)
- `Duration.concentration` with `permanentIfMaintainedFull: true` ✓ (designed for this spell)
- `transform_target` atom shape (retained fields, tempHpFromForm, actionRestriction, revertTriggers) ✓
- `no_speech_no_spells` action restriction ✓
- `revertTriggers: [zero_hp, spell_ends, temp_hp_depleted]` ✓

## Gap 1: `PolymorphFormSource.creatureType = "any"` (surface_widening)

**RAW**: "the new form can be any kind you choose that has a Challenge Rating equal to or less than the target's Challenge Rating or level."

`PolymorphFormSource.creatureType` is typed as `CreatureType`, a closed 14-member enum. Polymorph constrains the form to `"beast"`. True Polymorph imposes no creature-type constraint. There is no `"any"` sentinel or union variant.

**Proposed fix**: Widen `PolymorphFormSource.creatureType` to `CreatureType | "any"`. The `"any"` sentinel means the caster may choose any creature type at cast time; no runtime narrowing is applied.

## Gap 2: `transform_object_to_creature` (atom_widening)

**RAW**: "the object shape-shifts into a creature (the object must be neither worn nor carried) ... You can turn an object into any kind of creature, as long as the creature's size is no larger than the object's size and the creature has a Challenge Rating of 9 or lower. The creature is Friendly to you and your allies. In combat, it takes its turns immediately after yours, and it obeys your commands."

This mode transforms an `object` attachment into a creature with a bounded CR. No existing atom covers object-as-source transformation. `transform_target` is creature→creature. The `spawned_creature` family creates creatures from nothing (or a catalog ref); it does not consume an existing object as source.

**Proposed atom**:
```typescript
{
  readonly kind: "transform_object_to_creature";
  readonly newForm: PolymorphFormSource;   // reuses existing type; crBound = { kind: "fixed", cr: 9 }
  readonly sizeConstraint: "no_larger_than_object";
  readonly control: {
    readonly disposition: "friendly";
    readonly turnOrder: "immediately_after_caster";
    readonly commandCost: { kind: "no_action_required" };
    readonly controlDuration?: DurationValue;  // "more than 1 hour → no longer controlled"
  };
  readonly revertTriggers: ReadonlyNonEmptyArray<PolymorphRevertTrigger>;
}
```

The `controlDuration` field handles the "after 1 hour you no longer control the creature" clause — a timed control window inside the spell's broader concentration/permanent window.

## Gap 3: `transform_creature_to_object` (atom_widening)

**RAW**: "If you turn a creature into an object, it transforms along with whatever it is wearing and carrying into that form, as long as the object's size is no larger than the creature's size. The creature's statistics become those of the object, and the creature has no memory of time spent in this form after the spell ends and it returns to normal."

This is an entirely new transformation direction. The target creature becomes an object; its game statistics are replaced by the object's; the creature has no awareness during the transformation. Upon spell end, it reverts. No existing atom models this:
- `transform_target` is creature→creature.
- `apply_condition` (incapacitated, etc.) does not replace statistics with an object's stat block.
- `block_targeting` / `block_travel` are narrow scope restrictions, not full stat replacement.

**Proposed atom**:
```typescript
{
  readonly kind: "transform_creature_to_object";
  readonly sizeConstraint: "object_no_larger_than_creature";
  readonly revertTriggers: ReadonlyNonEmptyArray<PolymorphRevertTrigger>;
  readonly memoryBlocked: true;   // RAW: "has no memory of time spent in this form"
}
```

The form the object takes is a player-narrated choice (the spell text says "that form" but leaves the specific object to the caster); no catalog-ref is needed.

## Gap 4: Multi-type target attachment (surface_widening)

**RAW**: "Choose one creature or nonmagical object that you can see within range."

The three operational modes branch on whether the target is a creature or nonmagical object. The current `Attachment` union has `kind: "target"` (creatures) and `kind: "object"` (objects) as separate variants. There is no combined "creature or object" variant. The three modes also can't be expressed as phases in sequence — they are mutually exclusive paths chosen at cast time based on target type.

One option: introduce a new `kind: "creature_or_object"` attachment variant that resolves to whichever the caster selects, and model the three operational branches as a `CastTimeEffectModeChoice`-like structure on the `save_gate` onFail. This would require both an attachment widening and a new branch mechanism on `ActivationPhase.save_gate.onFail` (currently `onFail: EffectAtom`, which cannot carry the three-way branch natively).

## Encoding decision

No `content/true_polymorph.dhall` is produced. A partial encoding covering only the creature→creature mode would omit two of three core operational modes of the spell, producing a misleading trace. The surface already shows explicit design intent for this spell; the remaining gaps are concrete and should be widened rather than worked around.
