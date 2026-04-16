# Proposal: Crystal Ball widening

## Outcome: `structural_widening`

The Crystal Ball cannot be encoded because `magic_item` is not a valid `UnitRecord` kind. The surface type system defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy already names `magic_item_root` as a source atom and includes `attune`, `attunement_slot`, `grant_spell_access`, `grant_sense`, and `telepathic_link` — so the atom layer is partially prepared — but the surface type layer is not.

---

## Gap 1 (structural): `MagicItemRecord` + mechanics family

A new record type is required:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The simplest mechanics family for items like the Crystal Ball is an "attunement grant" family: while attuned (and touching, if specified), the item grants spell access and/or passive effects. The tracer would emit `magic_item_root → attune → grant_spell_access (+ any passive effects)`.

---

## Gap 2 (surface): Fixed item DC

`DcSource` currently has `caster_spell_save_dc` and `weapon_attack_dc`. Items like the Crystal Ball impose a hardcoded DC independent of the attuned caster's stats:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number }
  | { readonly kind: "fixed"; readonly dc: number };   // new
```

Evidence: *"you can cast Scrying (save DC 17)"*

---

## Gap 3 (surface): Dawn reset cadence

`RestResetCadence` has no "until next dawn" option. Crystal Ball of Telepathy recharges Suggestion at dawn:

```typescript
export type RestResetCadence =
  | { readonly kind: "short_or_long_rest" }
  | { readonly kind: "long_rest" }
  | { readonly kind: "short_rest" }
  | { readonly kind: "partial_short_full_long"; readonly shortRestRefill: number }
  | { readonly kind: "dawn" };   // new
```

Evidence: *"You can't cast Suggestion in this way again until the next dawn."*

---

## Gap 4 (surface): Cross-effect conditional expiry

The granted Detect Thoughts and Suggestion "end if the Scrying spell ends." No `Duration` variant can express a dependency on another named effect's lifecycle:

```typescript
// Possible new Duration variant:
| { readonly kind: "while_other_active"; readonly otherId: string }
```

This is low-pressure (only one item in this group), but is distinct from timed or concentration durations and cannot be expressed with the current closed set.

Evidence: *"it ends if the Scrying spell ends"*

---

## Gap 5 (surface): Concentration-waived granted spells

Both Crystal Ball of Mind Reading and Crystal Ball of Telepathy grant spells that do not require concentration to maintain. There is no surface field to express "this granted spell's concentration requirement is waived by the item."

A `grantSpellAccess` mechanic shape would need a `concentrationWaived: boolean` flag or equivalent.

Evidence: *"You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration"*

---

## Gap 6 (surface): Sensor-relative attachment

Several variant effects target creatures "within 30 feet of the spell's sensor." The Scrying sensor is a sub-entity created by the Scrying spell; targeting relative to it requires an `Attachment` origin that references a named sub-entity, not a point within range of the caster.

This is a new `Attachment` kind, tentatively:

```typescript
| { readonly kind: "sensor_of"; readonly spellId: string; readonly radiusFeet: number }
```

Evidence: *"targeting creatures you can see within 30 feet of the spell's sensor"*

---

## Summary

| Gap | Kind | Blocking? |
|-----|------|-----------|
| No `MagicItemRecord` | `new_subgraph` | Yes — primary block |
| Fixed item DC | `new_variant` (DcSource) | Yes — every Crystal Ball variant |
| Dawn reset | `new_variant` (RestResetCadence) | For Telepathy variant |
| Cross-effect expiry | `new_variant` (Duration) | For Mind Reading + Telepathy variants |
| Concentration waiver | `new_variant` (grant shape) | For Mind Reading + Telepathy variants |
| Sensor-relative attachment | `new_variant` (Attachment) | For Mind Reading + Telepathy + True Seeing variants |

All secondary gaps are contingent on the structural gap being resolved first.
