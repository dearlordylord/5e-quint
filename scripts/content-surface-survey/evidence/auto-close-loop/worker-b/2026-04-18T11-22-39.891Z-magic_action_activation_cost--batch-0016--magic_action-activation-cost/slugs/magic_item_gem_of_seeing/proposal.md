## Gem of Seeing

`Gem of Seeing` fits the existing `magic_item` top-level kind, and most of its mechanics already fit the current surface:

- charge-based magic-item activation
- `standard_action` with `magic`
- `charge_pool` resource with cap 3
- `dawn` partial recharge (`1d3`)
- `grant_sense` with `truesight` 120 ft

The blocker is narrower: the granted sense is not continuously active for the full 10-minute duration. The item says the bearer has Truesight **when they peer through the gem** during that window.

Current surface limitation:

- `EquipmentPredicate.kind = "peering_through_item"` exists, but it only gates an entire `PassiveMechanics` or `ActivatedAbilityHeader.condition`.
- An activated ability can have a `duration`, but its carried `EffectAtom`s cannot themselves be conditionally active during that duration.

Why the existing shapes are dishonest:

- Encoding the item as an `activation` with a timed `grant_sense` on `self` would overstate the rule to "you have Truesight for 10 minutes," even when not peering through the gem.
- Encoding it as a plain passive `grant_sense` gated by `peering_through_item` would lose the 1-charge / 10-minute activation window entirely.

Suggested widening:

- Add a new variant on the activated-duration surface so an activated ability can grant effects that apply only while a bounded equipment predicate holds during the active window.

One plausible shape:

```ts
type ConditionalGrantedEffect = {
  readonly condition: Exclude<EquipmentPredicate, { kind: "always" }>;
  readonly effect: EffectAtom;
};
```

and then allow `ActivatedAbilityMechanics` direct phases (or the duration-bearing activation header) to carry these conditional grants during the active window.

Evidence:

> "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."

