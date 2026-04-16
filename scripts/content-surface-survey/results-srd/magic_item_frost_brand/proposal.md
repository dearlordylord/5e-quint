# Proposal: Frost Brand — Structural Widening

## Outcome

`structural_widening` — No `magic_item` kind exists in `UnitRecord`. Content files were not authored.

---

## Primary Gap: Missing `MagicItemRecord` Kind

`src/surface/types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom, but no corresponding `MagicItemRecord` type or mechanics family has been added to the surface schema. This is the single blocker that prevents encoding any magic item.

---

## Secondary Gaps (would remain even after adding `MagicItemRecord`)

### 1. No passive-while-holding mechanics family

Frost Brand grants Fire Resistance unconditionally while the weapon is held/attuned — no activation, no attack roll, no per-turn trigger. The existing mechanics families are:

| Family | Requires |
|---|---|
| `ActivationMechanics` (spell) | action/bonus action/reaction to cast |
| `OngoingEffectMechanics` (spell) | spell cast, concentration or timed duration |
| `ClassFeatureActivationMechanics` | explicit activation cost (even if `free`) |
| `OnHitTriggerMechanics` (mastery) | weapon hit event |

None fits a passive "always active while attuned and holding." A new mechanics family such as `passive_while_attuned` or `passive_while_holding` is needed, or the existing schema needs an `equip_effect` concept.

**Evidence:** "while you hold the weapon, you have Resistance to Fire damage"

### 2. `RestResetCadence` does not cover time-based recharge

The flame-extinguishing property recharges after 1 hour — not after a rest. The current `RestResetCadence` union:

```typescript
type RestResetCadence =
  | { kind: "short_or_long_rest" }
  | { kind: "long_rest" }
  | { kind: "short_rest" }
  | { kind: "partial_short_full_long"; shortRestRefill: number };
```

A new variant is needed:

```typescript
| { kind: "time_based"; hours: number }
```

**Evidence:** "Once used, this property can't be used again for 1 hour."

### 3. No `extinguish_flames` effect atom in v4

The draw-action property extinguishes nonmagical flames in a 30-foot radius. The v4 effect atom inventory (`TAXONOMY_atoms_graph.md §9`) does not include any atom for environmental flame manipulation. Closest existing atoms:

- `damage` — no
- `apply_condition` — no
- `create_object` / `alter_item_kind` — too narrow

A new atom `extinguish_flames` (or a more general `modify_environment`) would be required.

**Evidence:** "When you draw this weapon, you can extinguish all nonmagical flames within 30 feet of yourself."

---

## What Is Expressible Without Widening

The on-hit 1d6 Cold damage rider is the one property that maps cleanly to existing atoms. Once a `MagicItemRecord` type exists with an appropriate mechanics family, this would encode as:

```
on_hit_window → damage (1d6 cold, fixed)
```

using the `damage_on_hit` `OngoingOperation` shape already defined.

---

## Out-of-Core Properties (Not Widening Pressure)

- **Light emission in freezing temperatures** — the trigger ("In freezing temperatures") is DM-adjudicated environmental state. Per `ARCHITECTURE.md`, DM rulings and notification surfaces are caller-owned. This is a `dm_agenda` fragment within an otherwise-structural unit; it does not add separate widening pressure.

---

## Summary of Required Widenings

| # | Kind | Name | Priority |
|---|---|---|---|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` kind in `UnitRecord` | Blocker |
| 2 | `new_subgraph` | Passive-while-holding/attuned mechanics family | High |
| 3 | `new_variant` | `RestResetCadence: { kind: "time_based"; hours: number }` | Medium |
| 4 | `new_atom` | `extinguish_flames` (or `modify_environment`) | Low |
