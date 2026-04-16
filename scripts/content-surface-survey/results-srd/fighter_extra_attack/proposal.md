# Extra Attack surface gap

`Extra Attack` does not fit the current authored class-feature surface honestly.

## Why it does not fit

The SRD text is passive and modifies the `Attack` action itself:

> You can attack twice instead of once whenever you take the Attack action on your turn.

The current class-feature surface only models `activation` features with:

- an `activationCost`
- a consumable `resource`
- a `resetCadence`
- an `effect` limited to `grant_extra_action` or `heal_hp`

`Extra Attack` has none of those shapes. It is not an activated feature, does not spend a pool or quota, and does not grant an extra action. It changes the number of attacks inside one `Attack` action.

## Required widenings

1. New class-feature family: `passive`

Justification: the rule is always on once acquired, and applies whenever the creature takes the `Attack` action on its turn.

2. New effect / atom support for attack-count modification

Suggested effect shape:

```json
{
  "kind": "modify_attack_count",
  "attacksPerAttackAction": {
    "kind": "threshold_tiers",
    "axis": "class",
    "base": 2,
    "tiers": [
      { "atLevel": 11, "value": 3 },
      { "atLevel": 20, "value": 4 }
    ]
  }
}
```

This corresponds to the taxonomy's `scale_attack_count` atom.

## Evidence

SRD 5.2.1, Fighter, Level 5: Extra Attack:

> You can attack twice instead of once whenever you take the Attack action on your turn.
