# Proposal: Dagger of Venom

## Outcome: `structural_widening`

The unit cannot be encoded. The primary blocker is that `magic_item` is not a valid
`UnitRecord` kind in `src/surface/types.ts`. The union is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

`magic_item_root` is listed in the v4 taxonomy atom inventory but has no corresponding
record type in the surface.

---

## Gap 1 — Missing `magic_item` kind (structural)

A `MagicItemRecord` top-level kind and at least one mechanics family are required.
Magic items have two mechanically distinct sub-patterns illustrated by this item alone:

- **Passive property** (always-on): +1 bonus to attack/damage rolls. No activation cost,
  no resource, no reset. This maps loosely to an `item_property_root` subgraph but there
  is no family for "passive continuous weapon enhancement" in the current surface.

- **Activated charge** (bonus-action, limited use): Coat blade with poison. Has a
  use-count resource, an activation cost, and a non-rest reset cadence (dawn).

Both patterns share the `magic_item_root` source atom but have distinct procedure shapes.
A minimal `MagicItemRecord` would need at least one family (e.g. `activated_charge`) to
cover the poison coating mechanic, and a separate family or a passive modifier shape for
the always-on +1.

---

## Gap 2 — Missing `dawn` reset cadence (surface widening)

`RestResetCadence` covers short rest, long rest, short-or-long rest, and partial-short
full-long. The dagger resets "until the next dawn" — a calendar-time reset that does not
map to any rest kind. A new variant is needed:

```typescript
| { readonly kind: "dawn" }
```

Evidence: *"The weapon can't be used this way again until the next dawn."*

---

## Gap 3 — Missing `poisoned` condition (surface widening)

`Condition` is currently `"prone"` only. The poison save failure applies the Poisoned
condition, which is a standard SRD condition with distinct mechanical effects
(disadvantage on attack rolls and ability checks). The type must be widened:

```typescript
export type Condition = "prone" | "poisoned";
```

Evidence: *"…have the Poisoned condition for 1 minute."*

---

## Gap 4 — Missing `fixed` DC source (surface widening)

`DcSource` has two variants:
- `caster_spell_save_dc` — derived from the caster's spellcasting stat
- `weapon_attack_dc` — `8 + attack ability mod + PB`

DC 15 is a fixed item-property DC, not computable from either formula. A new variant:

```typescript
| { readonly kind: "fixed"; readonly value: number }
```

Evidence: *"That creature must succeed on a DC 15 Constitution saving throw."*

---

## Summary of widening pressure

| Gap | Classification | Blocks encoding? |
|-----|---------------|-----------------|
| No `magic_item` UnitRecord kind | `structural_widening` | Yes — primary blocker |
| No `dawn` reset cadence | `surface_widening` | Yes — secondary |
| No `poisoned` condition | `surface_widening` | Yes — secondary |
| No `fixed` DC source | `surface_widening` | Yes — secondary |

All four gaps must be closed before this unit can be encoded honestly. The structural gap
takes precedence; the surface gaps are listed here to inform the widening plan.
