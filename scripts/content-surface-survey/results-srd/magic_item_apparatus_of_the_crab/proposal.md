# Proposal: Apparatus of the Crab — Structural Widening

## Outcome

`structural_widening` — the unit cannot be encoded. Multiple structural gaps block honest encoding at every layer.

---

## Gap 1 (Blocker): No `magic_item` UnitRecord kind

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. No `MagicItemRecord` exists. The v4 taxonomy names `magic_item_root` as a source atom but the surface never defined a corresponding record shape, mechanics family, or tracer branch.

Every magic item in the SRD encounters this gap first. Resolving it requires at minimum:

- A `MagicItemRecord` type with a `kind: "magic_item"` discriminant
- One or more mechanics families under `MagicItemMechanics`
- A new tracer branch `traceMagicItemUnit` in `tracer.ts`

The Apparatus of the Crab is an extreme pressure case that illuminates several sub-gaps within that family.

---

## Gap 2: Vehicle/object family

The apparatus has an independent stat block — AC 20, HP 200, Speed 30 ft./Swim 30 ft., immunity to Poison and Psychic damage — and functions as a piloted vehicle. Occupants operate it from inside; the apparatus acts as the mechanical agent during its pilot's turn.

No mechanics family models an object with its own stats that creatures inhabit and pilot. This is structurally different from:

- `activate` (class feature) — applies effects to the activating creature or targets
- `on_hit_trigger` (mastery) — weapon-hit rider
- Any spell family — spells don't have independent stat blocks

Required shape (sketch):

```
VehicleObjectMechanics = {
  family: "vehicle_object",
  stats: { ac, hp, speed, swimSpeed, immunities, ... },
  pilot: { required: true, count: 1 },
  ...
}
```

---

## Gap 3: Lever multi-mode activation family

Ten levers, each with an Up and a Down effect. A creature inside takes a Utilize action to move up to two levers. After use each lever resets to neutral. The 20 possible effects include:

- Movement gating (legs extend/retract)
- Window shutter controls (flavor, not mechanical)
- Claw extension/retraction (state prerequisites)
- Claw melee attacks (Up: damage; Down: condition)
- Directional movement and turning
- Light emission
- Depth control (sink/rise in liquid)
- Hatch control

No mechanics family models a multi-mode control panel where a single action dispatches to one of N discrete effect branches, each with independent prerequisites and outcomes. This is structurally distinct from all existing families.

The closest analogues in v4 are `choose` (procedure atom) and `charge` (resource atom), but neither provides the per-lever stateful slot model with Up/Down dispatch.

---

## Gap 4 (Surface): Fixed numeric attack bonus

Lever 5 claw attacks use **+8 to hit** — a hardcoded integer bonus. `DcSource` has two variants:

- `caster_spell_save_dc` — spell DC from caster stats
- `weapon_attack_dc` — 8 + ability mod + PB formula

Neither covers a literal numeric bonus on an object's built-in attack. A third variant is needed:

```typescript
{ kind: "fixed_attack_bonus"; bonus: number }
```

---

## Gap 5 (Surface): Grappled condition variant

Lever 5 Down applies the **Grappled** condition (escape DC 15). The `Condition` type currently has only `"prone"`. Grappled is a distinct SRD condition and needs its own variant.

```typescript
export type Condition = "prone" | "grappled";
```

The escape DC also requires a surface shape: a fixed numeric DC unrelated to attacker stats.

---

## Gap 6 (Minor): Pressure damage per minute

Below 900 feet, the apparatus takes 2d6 Bludgeoning damage **each minute** from pressure. This is a time-indexed environmental damage source with no existing surface shape. It is a minor secondary mechanic; resolving gaps 1–5 is prerequisite.

---

## Proposed widening priority

| Priority | Gap | Kind | Scope |
|---|---|---|---|
| 1 | `magic_item` UnitRecord kind | `new_subgraph` | Blocks all magic items |
| 2 | Vehicle/object family | `new_subgraph` | Blocks vehicle-type items |
| 3 | Lever multi-mode activation | `new_subgraph` | Apparatus-specific (but likely recurs for multi-function items) |
| 4 | Fixed numeric attack bonus | `new_variant` of `DcSource` | Recurs for items with hardcoded attack bonuses |
| 5 | Grappled condition | `new_variant` of `Condition` | Recurs for any unit applying Grappled |
| 6 | Pressure damage per minute | `new_variant` | Apparatus-specific |

Gaps 1–2 are cross-item structural requirements. Gaps 4–5 will recur in other magic items (e.g., any item with a self-contained melee or ranged attack). Gap 3 is novel to this item's control-panel design.
