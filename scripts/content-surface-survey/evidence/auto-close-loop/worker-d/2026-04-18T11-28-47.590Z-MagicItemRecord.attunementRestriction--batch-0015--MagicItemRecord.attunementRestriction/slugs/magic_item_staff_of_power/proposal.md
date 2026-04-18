## Staff of Power

Outcome: `surface_widening`

The item fits the existing `magic_item` + `composite` family for its held passive bonuses and charge-cast spell table, but two rules are still outside the current authored surface.

### 1. Last-charge outcome is degradation, not destruction

RAW:

> If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges.

Why this is a surface gap:

- `ItemDestructionPolicy` can model `none`, `last_charge_roll` destruction, and deterministic break-on-empty.
- Staff of Power instead has a **multi-outcome empty-pool state change**:
  - on `1`: keep only a subset of passive properties;
  - on `20`: regain charges immediately;
  - otherwise: neither destruction nor simple no-op.

Needed widening:

- a new surface variant for charge-pool empty outcomes, or a more general activation/resource lifecycle hook that can:
  - degrade the item to a reduced mechanics payload;
  - recharge from empty on a specific random-table outcome.

### 2. Retributive Strike needs current-pool-based damage and activation-carried destruction

RAW:

> You can take a Magic action to break the staff over your knee or against a solid surface. The staff is destroyed and releases its magic in an explosion that fills a 30-foot Emanation originating from itself. You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion. If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw. On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff. On a successful save, a creature takes half as much damage.

What already exists:

- `standard_action` with `action = "magic"`
- `random_table`
- `transport_exile`
- `save_gate`
- area emanation attachments

What is still missing:

- damage amount derived from the item's **current remaining charge count** rather than fixed dice, slot scaling, or charges spent on the activation;
- explicit **item self-destruction caused by a specific activation**, rather than top-level empty-pool destruction policy.

Needed widening:

- a new `DiceAmount` / damage-scaling variant like "current_resource_count" or equivalent;
- a new activation/lifecycle surface hook for item destruction on resolution.
