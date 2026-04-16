# Proposal: Glamoured Studded Leather — structural_widening

## Unit

**Glamoured Studded Leather** — Armor (Studded Leather Armor), Rare (SRD 5.2.1)

Two mechanics:
1. Passive +1 AC bonus while wearing.
2. Bonus Action: change visual appearance until property reused or armor doffed.

## Primary gap: no `magic_item` kind in `UnitRecord`

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `MagicItemRecord`. The item has rarity, item-category metadata, and mechanics that don't correspond to any existing record shape. This alone blocks encoding — no valid JSON can be produced without widening `UnitRecord`.

## Secondary gaps (within a hypothetical `MagicItemRecord`)

### 1. Passive always-on AC bonus — no matching family

The +1 AC is a passive effect active at all times while wearing. It has no activation trigger, no resource consumption, and no duration window — it simply applies while the item is equipped.

All existing families require an activation:
- `activation` (spell/class feature) — requires `activate` procedure + optional resource
- `ongoing_effect` — requires spell-slot cost and concentration or timed duration
- `triggered_reaction` — requires a trigger event
- `on_hit_trigger` — requires a weapon hit

A new **`passive_always_on`** family (or `while_worn` family) is needed for `MagicItemMechanics`. Graph shape would be:

```
magic_item_root → [no procedure node] → modify_ac(+1) → self
```

The `modify_ac` effect atom exists in v4. What's missing is the family that hosts it without a procedure.

### 2. Activated glamour property — no item-property activation family

The glamour property is consumed via Bonus Action and has no use-count limit (unlimited uses). This doesn't fit `ClassFeatureActivationMechanics` (which requires `className` + `acquiredAtLevel` and belongs to a class). It needs a distinct **`activated_property`** family for magic items that:
- Consumes `bonus_action_quota`
- Has no `use_count` resource (or an unlimited sentinel)
- Grants `alter_item_kind` effect (v4 atom exists)
- Applies a novel expiry

The `alter_item_kind` v4 atom is the right effect atom here. The machinery around it is absent.

### 3. `item_doffed` expiry — no matching lifecycle atom

The glamour expires "until you use this property again or doff the armor." The "use this property again" case is a self-reset (re-triggering the property replaces the prior state). The "doff the armor" case has no equivalent atom:

- `turn_start_window` / `turn_end_window` — turn-scoped
- `rest_window` — rest-scoped
- `expire` — time-scoped
- `dismiss` / `break` — explicit caster action

None model "effect ends when the item is removed from the wearer." A new `item_doffed` lifecycle atom or `equip_window` window atom is needed.

## Widening summary

| Gap | Kind | Urgency |
|---|---|---|
| No `magic_item` kind in `UnitRecord` | `new_subgraph` (record + kind) | Blocks all magic items |
| No passive always-on family | `new_subgraph` (mechanics family) | Blocks Adamantine Armor, Armor +1/+2/+3, Cloak of Protection, etc. |
| No item-property activation family | `new_subgraph` (mechanics family) | Blocks rechargeable/activatable item properties |
| No `item_doffed` expiry atom | `new_variant` (lifecycle) | Blocks effects that last "while worn" with explicit removal |

## Atom coverage

The v4 atom `alter_item_kind` (effect) is used by the glamour property and is already in the taxonomy. `modify_ac` (effect) covers the passive AC bonus. Both atoms are available — the missing piece is the surrounding record/family structure, not the atoms themselves.
