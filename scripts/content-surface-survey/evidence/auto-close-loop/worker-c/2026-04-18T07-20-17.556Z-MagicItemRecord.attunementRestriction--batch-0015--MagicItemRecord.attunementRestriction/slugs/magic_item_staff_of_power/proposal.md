## Staff of Power

`Staff of Power` fits the existing top-level `magic_item` kind and broadly fits `MagicItemMechanics.composite` in shape:

- passive held bonuses
- charge-cast spell access
- a separate activated ability

I did **not** author a placeholder record because several core mechanics cannot be expressed honestly in the current surface.

### Required widening

1. New variant for spell-attack-only roll bonuses

- Why: the staff grants `+2` to spell attack rolls while also granting a separate `+2` to attack rolls made with the staff itself. The current surface can scope attack bonuses to all attack rolls or to weapon filters, but not to spell attacks only.
- Pressure text: "While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls."
- Why existing shapes do not work:
  - `modify_roll_numeric on: ["attack_roll"]` is too broad.
  - `weaponFilter` cannot express "spell attacks only".
  - Folding this into the quarterstaff bonus would be false, because the item grants both bonuses independently.

Suggested direction:

```ts
type RollKind =
  | "attack_roll"
  | "spell_attack_roll"
  | ...
```

or an equivalent attack-scope filter on `modify_roll_numeric`.

2. New item last-charge outcome subgraph

- Why: spending the last charge does **not** simply destroy the staff. On a `1`, it keeps only its weapon bonuses and loses its other properties; on a `20`, it immediately regains charges.
- Pressure text: "On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."
- Why existing shapes do not work:
  - `ItemDestructionPolicy.last_charge_roll` only models destruction on one threshold.
  - `ItemDestructionPolicy.permanent_on_empty` is also wrong.
  - The current surface cannot suppress only selected parts of a composite item or model a lucky recharge branch on the same trigger.

Suggested direction:

- a new composite-item lifecycle subgraph for "on last charge expended, roll d20, then suppress selected parts and/or refund charges by branch", likely reusing existing v4 ideas like `suppress` / `refund` rather than coercing this into `destruction`.

3. New variant for damage based on remaining charges in the item

- Why: Retributive Strike damage is not based on charges spent for the activation. It scales off the number of charges currently in the staff at the moment it is broken.
- Pressure text: "you take Force damage equal to 16 times the number of charges in the staff" and "a creature takes Force damage equal to 4 times the number of charges in the staff"
- Why existing shapes do not work:
  - `DiceAmount.resource_spent` is the wrong source.
  - `DiceAmount.linked` only links to damage instances, not resource pools.
  - No current numeric source can say "remaining charges × 16" or "remaining charges × 4".

Suggested direction:

```ts
| {
    readonly kind: "resource_remaining";
    readonly resource: "activation_resource";
    readonly multiplier: number;
  }
```

4. New resolution atom for chance-gated self outcome

- Why: Retributive Strike gives the wielder a 50 percent chance to escape the blast by instantly traveling to a random plane. This is not a save, attack roll, ability check, or player choice.
- Pressure text: "You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion."
- Why existing shapes do not work:
  - No existing `ActivationPhase` models a probabilistic branch.
  - Using `save_gate` or `ability_check_gate` would invent a roll the item does not call for.

Suggested direction:

- new resolution atom, e.g. `chance_gate` / `random_gate`, with explicit branch odds.

### Secondary pressure

- Retributive Strike also wants an item-centered emanation origin (`"originating from itself"`), not just caster-self / point-within-range / on-primary-target area origins.
- That is likely a `surface_widening`, but the item is already blocked by the missing chance-gate atom above.
