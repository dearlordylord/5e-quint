# Proposal: Mithral Armor — Structural Widening

## Unit

**Mithral Armor** — *Armor (Any Medium or Heavy, Except Hide Armor), Uncommon*

> Mithral is a light, flexible metal. Armor made of this substance can be worn under normal clothes. If the armor normally imposes Disadvantage on Dexterity (Stealth) checks or has a Strength requirement, the mithral version of the armor doesn't.

---

## Why it doesn't fit

### 1. No `magic_item` kind in `UnitRecord` (primary blocker — structural)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy lists `magic_item_root` as a source atom, confirming the intent, but the surface type system has not yet grown this branch.

### 2. No `passive_property` family (primary blocker — structural)

All existing mechanics families require some form of activation:
- Spell families (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`) are cast using a slot and casting time.
- `ClassFeatureActivationMechanics` requires an `activationCost` (free or bonus action) and a `UseCountResource`.
- `OnHitTriggerMechanics` (mastery) fires via an `on_hit_window`.

Mithral Armor's mechanics are **equip-time passive overrides**. They have no activation cost, no resource, no trigger, and no duration — they are simply always active while the item is worn. A new family, e.g. `passive_property`, is needed for this shape.

### 3. `RollKind` missing `"ability_check"` (surface widening)

The Stealth penalty suppression targets Dexterity (Stealth) **ability checks**. The current `RollKind` union is:

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

`"ability_check"` is missing. This is needed both for Mithral Armor and for any future passive or active modifier that affects skill/ability checks (Bless-on-checks, Guidance, Bardic Inspiration, etc.).

### 4. No atom for "removes roll disadvantage passively" (atom widening)

The v4 effect atom `modify_roll_advantage` exists, but is always used as an on-hit rider (mastery) or as a reaction effect (e.g., Cutting Words). There is no passive-scope variant. Options:

- Extend `modify_roll_advantage` with a `passive` flag/variant indicating no trigger required.
- Add a dedicated `suppress_roll_disadvantage` effect atom for passive disadvantage removal.

Either way, the tracer has no code path for a passive effect emitting this atom.

### 5. No atom for "removes equipment prerequisite" (atom widening)

Mithral Armor removes the **Strength requirement** from the base armor's stat block entry. No existing v4 atom covers suppressing or overriding equipment prerequisites. The closest candidate `alter_item_kind` changes what *kind* of item something is — that is not the same as overriding a prerequisite property on an existing item kind.

A candidate atom: `remove_equipment_prerequisite`, with a closed `prerequisite` enum (e.g., `"strength_requirement"`).

---

## Proposed widening summary

| Kind | Name | Justification |
|---|---|---|
| `new_subgraph` | `MagicItemRecord` + `passive_property` family | No magic item kind or passive-property mechanics family in `UnitRecord` |
| `new_variant` | `RollKind: "ability_check"` | Stealth checks are ability checks; current union omits them |
| `new_atom` | passive-scope `modify_roll_advantage` or `suppress_roll_disadvantage` | Passive disadvantage removal has no atom or tracer path |
| `new_atom` | `remove_equipment_prerequisite` | No atom for suppressing armor/weapon Strength requirements |

---

## Notes on `passive_property` family shape

A minimal `passive_property` family for Mithral Armor would look like:

```
MagicItemRecord {
  kind: "magic_item"
  mechanics: {
    family: "passive_property"
    effects: [
      { kind: "suppress_roll_disadvantage", on: ["ability_check"], scope: "stealth" },
      { kind: "remove_equipment_prerequisite", prerequisite: "strength_requirement" }
    ]
  }
}
```

The key invariant: no `activationCost`, no `resource`, no `trigger`. Effects are always active while the item is equipped (and attuned, if required — Mithral Armor does not require attunement).

This shape also covers Adamantine Armor (critical hit suppression — a different atom) and similar always-on armor enhancements, so it is not single-item pressure.
