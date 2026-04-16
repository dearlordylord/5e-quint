# Proposal: Widenings Required for Boots of Speed

**Unit**: Boots of Speed  
**Slug**: `magic_item_boots_of_speed`  
**Outcome**: `structural_widening`

---

## Why no encoding was produced

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` variant. The surface has no payload family, no mechanics header, and no tracer path for magic items. This is not a missing shape within an existing family — the entire encoding path is absent.

Attempting to force Boots of Speed into a `ClassFeatureRecord` would be dishonest: the unit has no `className`, no `acquiredAtLevel`, and its two effects (speed doubling + OA-disadvantage rider) do not match any `ClassFeatureEffect` variant. Forcing it would produce a misleading trace. No encoding was authored.

---

## Gap 1 — Structural: `MagicItemRecord` and magic item family (primary blocker)

The taxonomy lists `magic_item_root` as a source atom (§1), and the content pipeline already has items encoded (e.g., `magic_item_adamantine_armor` in the survey queue). The surface needs:

- A `MagicItemRecord` type in `UnitRecord`
- A mechanics header capturing at minimum: attunement requirement, rarity
- One or more payload families (e.g., `active_property` for toggled effects, `passive_property` for always-on effects, `charged_property` for charge-based items)

Boots of Speed would fall under an `active_property` family: a Bonus-Action-activated effect with a duration budget and explicit deactivation.

---

## Gap 2 — Surface: `modify_speed` effect

The atom `modify_speed` exists in v4 (§9 Effect Atoms) but is not present in any surface type. The boots double the wearer's Speed — a multiplicative modifier (`×2`), not the additive flat bonus that `modify_numeric_bonus` covers.

**Required addition**: A `ModifySpeedEffect` surface type with at least:
- `kind: "modify_speed"`
- `mode: "double" | "add_feet" | "set_feet"` (or separate types)

The `double` variant is the pressure case from Boots of Speed. Longstrider's `+10 ft` and Slow's half-speed would be additional pressure.

---

## Gap 3 — Surface: OA-scoped disadvantage on others' attack rolls

The second effect imposes Disadvantage on *Opportunity Attacks made by other creatures against the wearer*. Two sub-gaps:

**3a. `RollKind` does not include `opportunity_attack`.**  
Currently `RollKind = "attack_roll" | "saving_throw"`. Opportunity Attacks are a specific trigger-subtype of attack roll. The boots' effect applies only to OAs, not all attacks. Widening options:
- Add `"opportunity_attack"` to `RollKind` (allows `modify_roll_advantage` to scope to it).
- Or add an `attackSubKind` filter field to `ModifyRollAdvantageRider`.

**3b. The effect is directional: the roller is an enemy, the attachment is self.**  
The existing `ModifyRollAdvantageRider` (in `MasteryEffect`) modifies the *target creature's* rolls — the attachment is an enemy and the roller is the wearer. Here it's inverted: the attachment is the wearer (self), and the roller is an attacking enemy. The tracer would need a "modifies: incoming_attack_rolls" attachment variant or an explicit `attackerHasDisadvantage` flag.

---

## Gap 4 — Surface: `duration_budget` resource

The item's active time depletes from a shared 10-minute pool across all activations. This is structurally different from `UseCountResource`:

- `use_count` tracks discrete activations
- `duration_budget` tracks cumulative active *time* (minutes, seconds) against a cap

A new resource shape is needed:

```typescript
export type DurationBudgetResource = {
  readonly kind: "duration_budget";
  readonly totalMinutes: number;
  readonly resetCadence: RestResetCadence;
};
```

This shape would also cover other items with finite active-time budgets.

---

## Gap 5 — Surface: toggle deactivation

The boots activate on a Bonus Action and deactivate on a second Bonus Action (same gesture). No existing `ClassFeatureActivationCost` or effect lifecycle type models voluntary mid-duration termination via re-trigger. A magic item active-property family would need a `deactivation` field alongside `activationCost`:

```typescript
deactivation: { kind: "bonus_action_retrigger" } | { kind: "bonus_action" } | { kind: "never" }
```

---

## Gap 6 — Surface: attunement resource

The item requires attunement. The v4 taxonomy lists `attune` (procedure atom) and `attunement_slot` (resource atom), but neither appears in the current surface types. A `MagicItemRecord` would need:

```typescript
readonly attunement: boolean;
```

…and the tracer would need to emit `attunement_slot` + `attune` nodes when `attunement: true`.

---

## Summary table

| Gap | Kind | Blocker? |
|-----|------|----------|
| No `MagicItemRecord` / magic item family | `structural_widening` | **Yes** |
| `modify_speed` not surfaced | `surface_widening` | After structural gap |
| OA-scoped disadvantage on enemies' rolls | `surface_widening` | After structural gap |
| Duration-budget resource | `surface_widening` | After structural gap |
| Toggle deactivation | `surface_widening` | After structural gap |
| Attunement resource | `surface_widening` | After structural gap |

All secondary gaps are blocked by Gap 1. Once `MagicItemRecord` and a magic item active-property family are added to the surface, each of these gaps would each require a targeted widening pass.
