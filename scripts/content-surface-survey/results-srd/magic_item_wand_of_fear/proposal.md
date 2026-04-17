# Wand of Fear

`Wand of Fear` does not fit the current surface cleanly enough to author a truthful `content/magic_item_wand_of_fear.dhall`.

## Honest fit

The item's overall chassis already exists:

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `resource.kind = "charge_pool"` with cap 7
- `resetCadence.kind = "dawn"` with regain `1d6 + 1`
- `destruction.kind = "last_charge_roll"` with `d20`, destroy on `1`

If the wand only said "cast Command / Fear from it", that part would follow the existing `grant_spell_access` pattern used by other charge-based items.

## Surface gaps

Two parts are not representable honestly with the current surface.

### 1. Item-defined spell overrides

The wand does not merely grant the base spells:

- it fixes the save DC at `15`;
- it restricts `Command` to `"flee"` or `"grovel"` only;
- it changes `Fear` to a `60-foot Cone`.

Current `grant_spell_access` only carries:

- `spellId`
- `mode`

That means it can only reference the canonical authored spell and its normal parameters. Using it here would silently lie about the spell behavior.

Needed widening:

- a new `grant_spell_access` variant or nested override payload for item-scoped spell modifications, at minimum:
  - fixed save DC override;
  - spell-specific parameter overrides;
  - spell-specific choice restriction.

### 2. Holding gate

The activation is gated by holding the wand:

> "While holding the wand, you can cast ..."

Current gating options do not represent held-item state. `requiresAttunement` is insufficient because attuned-but-not-holding is a distinct state, and `EquipmentPredicate` only covers armor and weapon cases.

Needed widening:

- `EquipmentPredicate.holding_item` or equivalent held-item gate reusable across magic items.

## Classification

`surface_widening`

The top-level unit kind and family already exist, and the needed mechanics align with existing v4 atoms (`grant_spell_access`, charge pool, recharge, destruction). The missing pieces are representational variants on the authored surface, not a new source family or a new v4 atom.
