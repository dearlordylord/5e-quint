## Shield of Missile Attraction

Top-level fit exists: this is a `magic_item` with `passive` mechanics.

It does not fit honestly in the current authored surface for two reasons:

1. The resistance rider is filtered by attack source, not by damage type.
   The item says: "you have Resistance to damage from attacks made with Ranged weapons."
   Current `grant_resistance` only accepts `damageType`, so it cannot express resistance keyed to the source of the damage event.

2. The curse is a forced target-redirection rule.
   The item says: "Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."
   The current surface has no effect/subgraph for intercepting an incoming attack target choice and replacing the defender with the cursed bearer.

## Proposed widenings

### Surface widening

- `grant_resistance.sourceFilter`
  - Kind: `new_variant`
  - Why: the resistance is not to a damage type like `fire` or `piercing`; it is to damage originating from a ranged-weapon attack.
  - Evidence: "Resistance to damage from attacks made with Ranged weapons."

One plausible shape:

```ts
type AttackSourceFilter =
  | { readonly kind: "weapon_category"; readonly category: "melee" | "ranged" }

// added to grant_resistance
readonly sourceFilter?: AttackSourceFilter
```

This keeps the existing `grant_resistance` atom and only widens its predicate.

### Atom / subgraph widening

- `redirect_attack_target`
  - Kind: `new_subgraph`
  - Why: the curse is not damage mitigation after the fact; it rewrites the target of a qualifying attack before resolution.
  - Evidence: "the curse causes you to become the target instead."

This needs a triggered interception shape roughly like:

- qualifying event: `ranged weapon attack targets creature within 10 feet of bearer`
- effect: replace target with bearer
- attachment: cursed bearer

That is materially different from any current atom in the TS surface. Existing `triggered_reaction` is wrong because the curse is automatic and passive, not a voluntary reaction that consumes a reaction quota.

## Honest classification

`atom_widening`

Reason: even if filtered resistance were added as a surface widening on `grant_resistance`, the curse still needs a new retargeting mechanic not present in the current authored surface/tracer.
