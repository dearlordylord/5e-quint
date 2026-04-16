# Proposal: Widening for `magic_item_luck_blade`

## Outcome: `structural_widening`

No `.dhall` or `.json` authored. The unit cannot be honestly encoded because
`magic_item` is not a member of `UnitRecord`.

---

## 1. Root structural gap: `MagicItemRecord` missing from `UnitRecord`

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The taxonomy (v4 §1) lists `magic_item_root` as a valid source atom alongside
`spell_root`, `class_feature_root`, etc., but no corresponding record type
exists in `types.ts` and no codepath exists in `tracer.ts`.

**Required additions:**

- `MagicItemRecord` — metadata + attunement flag + an array (or discriminated
  union) of item properties, each with its own mechanics shape.
- `MagicItemMechanics` — a new mechanics union covering the property families
  below.
- `tracer.ts` `traceUnit` switch must gain a `"magic_item"` arm.

---

## 2. New `RestResetCadence` variant: `dawn`

Both **Luck** and **Wish** reset at dawn. `RestResetCadence` currently has:

| Variant | Maps to |
|---|---|
| `short_or_long_rest` | either rest refills |
| `long_rest` | long rest only |
| `short_rest` | short rest only |
| `partial_short_full_long` | partial short, full long |

None covers a time-of-day reset. Magic items routinely use dawn (and dusk) as
recharge boundaries. A `{ kind: "dawn" }` variant is needed.

**Evidence:** "Once used, this property can't be used again until the next dawn."

---

## 3. New property family: `passive_item_bonus`

Luck Blade grants:

- +1 to attack rolls and damage rolls (while wielded)
- +1 to saving throws (while on person)

These are always-on numeric modifiers with no activation, no action cost, no
use-count. They are contingent on an equip/attunement state, not on a trigger
event. No existing mechanics family models this shape.

**Needed atoms / surface shapes:**

- A `passive_item_bonus` (or `item_passive`) family with:
  - `modifier` — which roll categories are affected (`attack_roll`,
    `damage_roll`, `saving_throw`)
  - `condition` — the attachment condition (`while_wielded` vs.
    `while_on_person`)
  - `delta` — numeric bonus amount

The `modify_roll_numeric` effect atom exists in v4 and would be used, but the
item surface needs a family wrapper that expresses the equip-conditionality
without requiring an action or use-count.

---

## 4. New property family: `item_activation_luck` (or generalised `item_activation`)

**Luck property:**
- No action cost (`no action required`)
- Gate: holder must not have the Incapacitated condition
- Effect: reroll one failed D20 Test; must use the second roll
- Resource: `use_count`, cap 1, resets at dawn

The `modify_roll_reroll` atom exists in v4 but `types.ts` has no surface shape
for:

1. A "triggered on failed roll" reroll (vs. a proactive pre-roll reroll).
2. A `must_use_second_roll` constraint (vs. keep-higher).
3. A `no_action` activation cost (vs. `free`, `bonus_action`, etc.).

`ClassFeatureActivationCost` covers `free` and `bonus_action`; a `no_action`
variant (specifically "no action required, outside normal action economy") may
be needed to distinguish from `free` (which implies it happens on your turn as
part of normal turn structure).

**Needed additions:**

- `RestResetCadence`: `dawn` variant (see §2).
- `ClassFeatureActivationCost` (or a new `ItemActivationCost`): `no_action`
  variant.
- New `OngoingOperation` or separate effect type capturing:
  - `modify_roll_reroll` on trigger `failed_d20_test`
  - `keep_second` constraint
- Condition gate: `not_incapacitated` filter (comparable to `no_action` cost).

---

## 5. New property family: `item_charge_spell`

**Wish property:**
- Initial charges: `1d3` (random, assigned at item creation — not a threshold
  or linear schedule)
- Per-use cost: 1 charge
- Effect: cast the named spell *Wish* at the caster's level
- Reset: dawn (but only partial — charges do not fully refill; the property
  reads as "no refill, dawn just gates whether you can use it again that day")
- Destruction: when charges reach 0, the property ceases to exist permanently

**Needed additions:**

- `ChargeResource.initialCount` supporting a dice expression (`1d3`) rather
  than a fixed integer.
- Property destruction on charge exhaustion — a `depletes_on_empty: true`
  flag or a `self_break` lifecycle atom attached to the charge pool.
- `grant_spell_access` via charge — the v4 atom exists but no surface type
  binds "expend 1 charge → cast `wish`" as an item mechanic.

---

## 6. Wish as `dm_agenda`-adjacent sub-property

The Wish spell itself is a `dm_agenda` unit (its core effect is open-ended
narrative adjudication). Any magic item encoding of "cast Wish" would carry the
same DM-agenda boundary. Future encoding work should either:

- Treat the Wish sub-property as a stub referencing `wish` by spell ID, with
  the `dm_agenda` flag propagated, or
- Scope the magic item encoding to "holds N charges, each grants one Wish cast"
  without claiming to model Wish's effects.

---

## Summary of required widenings

| # | Classification | Name | Needed for |
|---|---|---|---|
| 1 | `new_subgraph` | `MagicItemRecord` + `MagicItemMechanics` | Any magic item encoding |
| 2 | `new_variant` | `dawn` in `RestResetCadence` | Luck, Wish reset |
| 3 | `new_variant` | `passive_item_bonus` property family | +1 attack/damage/saves |
| 4 | `new_variant` | `no_action` activation cost | Luck (no action required) |
| 5 | `new_variant` | `modify_roll_reroll` on `failed_d20_test` + `keep_second` | Luck reroll |
| 6 | `new_variant` | charge resource with dice-expression initial count + `depletes_on_empty` | Wish charges |
| 7 | `new_variant` | charge-expend → cast named spell family | Wish spell cast |
