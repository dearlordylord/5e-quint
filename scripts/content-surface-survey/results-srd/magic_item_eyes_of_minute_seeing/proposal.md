## Eyes of Minute Seeing

Outcome: `surface_widening`

### Why it does not fit cleanly

`Eyes of Minute Seeing` is still an existing top-level kind and family:

- `kind = "magic_item"`
- `mechanics.family = "passive"`

The first half of the item fits the current surface directly:

- `grant_sense` with `sense = "darkvision"` and `rangeFeet = 1`

The problem is the second half:

> "Advantage on Intelligence (Investigation) checks made to examine something within that range."

The surface already has:

- `modify_roll_advantage`
- `skillFilter` for `investigation`

But it does **not** have a way to say that the advantage applies only when:

- the check is for examining something, and
- the thing being examined is within 1 foot

Current passive gating is limited to `EquipmentPredicate` (`always`, `wearing_armor`, `wielding_weapon`), which is not enough here.

### Narrowest honest widening

Add a new passive/context gate variant rather than inventing a new atom.

Candidate direction:

- widen passive grant gating beyond equipment-only predicates, or
- add a roll-context predicate usable by `modify_roll_advantage` / `modify_roll_numeric`

Example shape direction:

```ts
type RollContextPredicate =
  | {
      readonly kind: "examining_within_range";
      readonly rangeFeet: number;
    };
```

Then the item could honestly express:

- passive `grant_sense(darkvision, 1 ft)`
- passive `modify_roll_advantage` on `ability_check`
  with `skillFilter = investigation`
  and a context predicate limiting it to examination within 1 foot

### Why this is `surface_widening`, not `atom_widening`

No new v4 atom is forced:

- `grant_sense` already exists
- `modify_roll_advantage` already exists

What is missing is only a surface shape for the context gate on the existing roll-modifier atom.
