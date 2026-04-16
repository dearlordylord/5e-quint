# Eldritch Blast widening

`Eldritch Blast` does not force a new atom in taxonomy v4. It forces authored-surface access to the existing `scale_attack_count` concept.

## Why the current surface is insufficient

The closed spell `activation` shape supports:

- a fixed list of `phases`
- damage scaling via `DiceAmount`
- target-count scaling for `choose_up_to` only via slot-based `linear`

That is enough for `Fire Bolt` and enough to approximate `Magic Missile`, but not enough for `Eldritch Blast`.

`Eldritch Blast` upgrades by increasing the number of beams, and each beam is its own attack roll:

> "The spell creates two beams at level 5, three beams at level 11, and four beams at level 17. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam."

This is not:

- damage scaling: each beam still deals `1d10` Force damage
- target-count scaling alone: the rule is about repeated attacks, not just how many creatures may be chosen

## Proposed surface widening

Add a way for an `attack_roll` activation phase to scale its repetition count by level, using the existing taxonomy atom `scale_attack_count`.

One possible shape:

```json
{
  "kind": "attack_roll",
  "attachment": { "kind": "target", "selection": { "mode": "one" } },
  "attackKind": "ranged_spell_attack",
  "repeat": {
    "kind": "threshold_tiers",
    "axis": "character",
    "base": 1,
    "tiers": [
      { "atLevel": 5, "value": 2 },
      { "atLevel": 11, "value": 3 },
      { "atLevel": 17, "value": 4 }
    ]
  },
  "retargetPerRepeat": true,
  "onHit": { "kind": "damage", "damageType": "force", "amount": { "kind": "fixed", "expr": { "dice": 1, "dieSize": 10 } } },
  "onMiss": { "kind": "none" }
}
```

## Why this is the right widening

- It stays within the existing `activation` family.
- It uses an existing v4 atom family member: `scale_attack_count`.
- It preserves the SRD distinction that each beam is separately targeted and separately resolved.
