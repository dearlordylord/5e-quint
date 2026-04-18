`Gem of Seeing` does not fit the current surface honestly.

Why it almost fits:
- It is a `magic_item`.
- It uses an `activation`-shaped resource model: 3-charge pool, `Magic` action, 1 charge spent, `dawn` recharge of `1d3`.
- Its payload is otherwise a standard timed `grant_sense` effect: Truesight 120 feet for 10 minutes.

What does not fit:
- The benefit is not unconditional for the 10-minute window. RAW says: "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."
- The current surface has `EquipmentPredicate.peering_through_item`, but only as:
  - a passive gate on `PassiveMechanics`, or
  - an activation gate on `ActivatedAbilityHeader.condition`.
- Neither shape means "the timed effect exists for 10 minutes, but only applies while this predicate is true during that window."

Why existing families would be dishonest:
- Encoding it as a passive item would lose the charge spend and 10-minute activation window.
- Encoding it as a plain activation with `grant_sense` would incorrectly make Truesight unconditional for the whole 10 minutes.
- Encoding `condition = { kind = "peering_through_item" }` on the activation would only gate use, not ongoing applicability during the duration.

Suggested widening:
- `surface_widening`
- Add an effect-application predicate for duration-bearing activated abilities, or a conditioned ongoing grant shape that can say:
  - activate now,
  - persist for 10 minutes,
  - while predicate `peering_through_item` holds, apply `grant_sense(truesight, 120)`.

Concrete proposal:
- New variant on the activation-side delivery surface, for example a conditioned direct effect or conditioned operation:
  - `ActivationPhase.direct` effect entry widened to carry an optional runtime predicate, or
  - `ActivatedAbilityMechanics` widened with a conditional ongoing grants list scoped by `duration`.

Evidence:
> "As a Magic action, you can expend 1 charge. For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."
