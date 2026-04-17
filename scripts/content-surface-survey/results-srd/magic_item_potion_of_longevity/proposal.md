# Proposal: Potion of Longevity — atom_widening

## Unit

**Potion of Longevity** — Magic Item, Very Rare, SRD 5.2.1

## Summary

The `magic_item` kind and `activation` family apply structurally (consumable potion, one-time use, `never` reset cadence). The unit cannot be honestly encoded because two mechanics have no representation in the current atom surface.

## Gap 1: `modify_age` effect atom

**RAW text:** "your physical age is reduced by 1d6 + 6 years, to a minimum of 13 years"

Physical age is a character-state quantity distinct from any existing EffectAtom target:

- Not HP, max HP, or temp HP
- Not AC, a condition, an ability score, a speed, or a sense
- Not a resistance, immunity, or roll modifier

No v4 effect atom in the TAXONOMY_atoms_graph.md covers age modification. A new atom is required:

```
modify_age
  direction: "decrease" | "increase"
  delta: DiceAmount          -- e.g. { kind: "fixed", expr: { dice: 1, dieSize: 6, flat: 6 } }
  floor?: number             -- e.g. 13 (minimum resulting age)
```

The `direction` split parallels `modify_max_hp`'s increase/decrease split. The `floor` field parallels `modify_max_hp.decrease.floor`.

SRD 5.2.1 defines no mechanical consequences for age (no stat thresholds, no condition triggers). Age is tracked as character-state metadata. This makes `modify_age` a narrative-state atom — it models a deterministic rule that produces no downstream combat-mechanical effect in core RAW. It is still a rule the SRD states, hence atom_widening rather than dm_agenda.

## Gap 2: Cumulative-probability activation gate

**RAW text:** "Each time you subsequently drink a Potion of Longevity, there is a 10 percent cumulative chance that you instead age by 1d6 + 6 years."

This mechanic requires:
1. Tracking how many times this item type has been consumed by the character (a cross-instance counter, not per-item charge).
2. Deriving a probability = 10% × prior consumption count.
3. Rolling against that probability at each subsequent consumption.
4. Branching on the outcome: decrease age (normal) vs. increase age (adverse).

No existing surface variant models this:

- `save_gate` / `ability_check_gate` resolve via d20 + modifier vs. DC, not a percentage roll.
- `use_count` / `charge_pool` resources count remaining uses, not prior cross-instance consumption.
- `RestResetCadence` variants address refill cadence, not probabilistic adversarial outcomes.

A proposed surface addition:

```
// New ActivationPhase or resource variant — cumulative probability gate
{
  kind: "cumulative_probability_gate",
  baseProbabilityPct: number,          // 10
  perPriorUsePct: number,              // 10 (additive per prior consumption)
  trackingKey: string,                 // "potion_of_longevity_consumed" — global character counter
  onTrigger: EffectAtom,               // age-increase effect
  onNoTrigger: EffectAtom              // age-decrease effect (normal)
}
```

Alternatively, this could be modeled as a `surface_widening` to `ActivationPhase` with a new `probability_gate` kind — the concept is deterministic (roll d100, compare to threshold%), but the threshold is stateful.

## Recommended classification

**`atom_widening`** — both gaps require new concepts not present in v4:
- `modify_age` is a genuinely new effect atom (age is not in the v4 effect atom inventory).
- The cumulative probability gate is a new activation-phase variant or resource mechanic.

The `magic_item` kind, `activation` family, `never` reset cadence, and `{ kind: "none" }` destruction policy all apply without change.
