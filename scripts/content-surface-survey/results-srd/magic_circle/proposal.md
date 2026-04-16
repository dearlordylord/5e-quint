# Proposal: Magic Circle widening gaps

## Summary

Magic Circle is a level-3 abjuration with a 1-minute casting time, a timed (non-concentration) duration of 1 hour, and a cylinder area effect. It applies multiple persistent effects to chosen creature types (Celestials, Elementals, Fey, Fiends, or Undead) within or relative to the area. It does not fit the current surface honestly.

**Classification: `atom_widening`**

The narrowest honest classification: one new atom is needed (`block_condition_from_source`) and several new surface variants.

---

## Gap inventory

### 1. `area.shape.cylinder` (surface_widening)

The `Attachment` area shape currently only supports `sphere`. Magic Circle creates a 10-ft-radius, 20-ft-tall cylinder. A `cylinder` variant is needed:

```
{ kind: "cylinder"; radiusFeet: number; heightFeet: number }
```

### 2. `Duration` slot-scaling (surface_widening)

The current `Duration` type has three variants: `instantaneous`, `concentration`, and `timed`. None support slot-level scaling. Magic Circle's duration increases by 1 hour per slot above 3. A slot-scaled timed variant is needed, analogous to the existing `SlotScaling<T>` pattern:

```
{ kind: "slot_scaled_timed"; base: DurationValue; perSlotAboveBase: DurationValue; baseLevel: number }
```

### 3. `OngoingOperation.block_travel` (surface_widening)

"The creature can't willingly enter the Cylinder by nonmagical means." The v4 taxonomy has `block_travel` as an effect atom, but it is not surfaced in the `OngoingOperation` union. A new operation variant is needed:

```
{ kind: "block_travel"; scope: "enter_area" | "leave_area" }
```

### 4. `OngoingOperation.save_gate_on_entry_attempt` (surface_widening)

"If the creature tries to use teleportation or interplanar travel to do so, it must first succeed on a Charisma saving throw." This is a save gate triggered by a specific movement modality (magical travel), not a cast-time phase. No `OngoingOperation` variant covers a save gate fired by a creature action against the area. A new operation variant is needed with a movement-event trigger.

### 5. `OngoingOperation.modify_roll_advantage_scoped` (surface_widening)

"The creature has Disadvantage on attack rolls against targets within the Cylinder." The v4 atom `modify_roll_advantage` exists but is not in the `OngoingOperation` union. Moreover, the rider applies to specific creature types (those matching the cast-time filter), not to the caster or a marked target. The operation needs both a new union variant and a creature-scope predicate.

### 6. `creature_type_filter` (surface_widening)

The effects apply only to creature types chosen at cast time. No current surface type models a creature-type scope predicate on an area attachment or its operations. A closed enum + "chosen at cast" pattern (parallel to `AnchoredFilter.creature_exemption_list`) is needed:

```
{ kind: "creature_type_filter"; types: ReadonlyArray<CreatureKind>; chosenAtCast: true }
```

This would require adding `CreatureKind` as a new surface primitive (Celestial, Elemental, Fey, Fiend, Undead, etc.).

### 7. `block_condition_from_source` — new atom (atom_widening)

"Targets within the Cylinder can't be possessed by or gain the Charmed or Frightened condition from the creature."

This is **not** `block_targeting` (which prevents a creature from being chosen as a targeting selection). It is **not** `remove_condition` (which clears an existing condition). It is ongoing condition-source immunity: creature type X cannot impose condition Y on targets inside the area. No v4 atom covers this shape. A new atom is warranted:

```
block_condition_from_source
  scope: "targets_inside_area" | "targets_outside_area"
  conditions: ReadonlyArray<Condition>   // Charmed, Frightened
  sourceFilter: creature_type_filter     // the same filter from above
```

The possession clause ("can't be possessed by") maps loosely to `block_targeting` but is better handled by the same new atom with a special condition value (`possession`), or by extending `Condition` to include it.

### 8. `area_effect_direction_toggle` (surface_widening)

"You can cause its magic to operate in the reverse direction." At cast time the caster chooses whether the circle is exclusionary (keeps affected creatures out) or containment (keeps them in). This binary mode has no current representation in any spell family.

---

## Not a structural_widening

The `ongoing_effect` family is the correct conceptual home — Magic Circle is a persistent area effect with no concentration. The gaps are all within the surface vocabulary (shapes, operation kinds, effect atoms), not at the family level. A future `ongoing_effect` encoding of Magic Circle would look like:

- `family: "ongoing_effect"`
- `attachment: { kind: "area", shape: { kind: "cylinder", ... }, filter: creature_type_filter, direction: "exclusion" | "containment" }`
- `operations: [block_travel, save_gate_on_entry_attempt, modify_roll_advantage_scoped, block_condition_from_source]`
- `duration: { kind: "slot_scaled_timed", base: 1h, perSlotAboveBase: 1h, baseLevel: 3 }`

---

## Widening priority

| Gap | Kind | Severity |
|-----|------|----------|
| `block_condition_from_source` | new atom | atom_widening |
| cylinder shape | new variant | surface_widening |
| slot-scaled duration | new variant | surface_widening |
| creature_type_filter | new primitive + variant | surface_widening |
| `block_travel` in OngoingOperation | new variant | surface_widening |
| `save_gate_on_entry_attempt` | new variant | surface_widening |
| `modify_roll_advantage_scoped` | new variant | surface_widening |
| area_direction_toggle | new variant | surface_widening |
