# Proposal: magic_item_dust_of_sneezing_and_choking

## Outcome: `atom_widening`

Three surface gaps block honest encoding. Two are `surface_widening` (new variants of existing types); one is `atom_widening` (new concept not in v4 taxonomy).

---

## Gap 1 — `suffocating` state (atom_widening)

**Evidence:** "On a failed save, a creature begins sneezing uncontrollably; it has the Incapacitated condition and **is suffocating**."

**Problem:** "Suffocating" is not in the 15-condition `CONDITIONS` array (`blinded`, `charmed`, … `unconscious`). It is a distinct SRD mechanical state defined in Playing-the-Game/Suffocation: a creature without air exhausts its held-breath capacity and then begins dropping to 0 HP on failed Con saves at the start of each turn. It is not a condition and cannot be modeled as `apply_condition`.

**This gap is integral, not secondary.** An encoding that models only `apply_condition incapacitated` and omits suffocating understates the item's threat (incapacitated creatures are still alive and stable; suffocating creatures die unless the effect ends quickly).

**Proposed addition:** A new `EffectAtom` variant:

```typescript
| { readonly kind: "apply_suffocating" }
```

Or, if the broader suffocation rules merit a richer shape, a paired atom that encodes the SRD suffocation progression (can hold breath for Con-mod minutes, then 0-HP save each turn). Either way, v4 taxonomy does not currently contain a suffocation atom.

---

## Gap 2 — `save_gate.autoSuccessForCreatureTypes` (surface_widening)

**Evidence:** "Constructs, Elementals, Oozes, Plants, and Undead succeed on the save automatically."

**Problem:** `save_gate` has no field for creature-type-based automatic success. The existing `TargetTypeFilter` on `Attachment` excludes types from targeting entirely — but RAW says these types are still in the area and still "make" the save, they just auto-succeed. The distinction matters for completeness and could matter for future interaction rules (counterspelling the effect, tracking who was affected, etc.).

**Proposed addition:** A new optional field on `save_gate` activation phases (and the ongoing `save_gate` OngoingEffect variant):

```typescript
readonly autoSuccessForCreatureTypes?: ReadonlyNonEmptyArray<CreatureType>;
```

When present, creatures of the listed types resolve the save as an automatic success without rolling.

---

## Gap 3 — `DurationEndTrigger.target_targeted_by_named_spell` (surface_widening)

**Evidence:** "The effect also ends on any creature targeted by a *Lesser Restoration* spell."

**Problem:** `DurationEndTrigger` has no variant for "this creature is targeted by a specific named spell." The existing variants watch for things the *target does* (`target_makes_attack_roll`, `target_deals_damage`, `target_casts_spell`, `target_takes_damage`, etc.) — not for spells cast *at* the target by others.

**Proposed addition:** A new `DurationEndTrigger` variant:

```typescript
| {
    readonly kind: "target_targeted_by_named_spell";
    readonly spellId: string;
  }
```

This would encode "the ongoing effect on this creature ends when it is targeted by the named spell" — a pattern that could recur for other magical cures or dispel-like effects.

---

## Encoding shape (if all three gaps were filled)

The item would encode as `ActivatedAbilityMechanics` (activation family) with:

```
activationCost: standard_action (utilize)
resource: use_count, cap: fixed 1
resetCadence: never
destruction: permanent_on_empty

phase: save_gate
  attachment: area, emanation 30 ft, origin: self
  ability: con
  dc: fixed 15
  autoSuccessForCreatureTypes: [construct, elemental, ooze, plant, undead]
  onFail: composite [
    apply_condition: incapacitated,
    apply_suffocating     <-- Gap 1
  ]
  onSuccess: none
  repeatSave:
    cadence: end_of_target_turn
    onSuccess: ends_on_target

duration (on the activation header):
  timed, until-ended-by:
    earlyEnd: [target_targeted_by_named_spell: lesser_restoration]  <-- Gap 3
```

Gap 2 (`autoSuccessForCreatureTypes`) would attach to the `save_gate` phase rather than the area attachment, preserving RAW semantics.
