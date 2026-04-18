`Tome of Understanding` does not fit the current surface honestly because the item's activation is gated by a long study procedure rather than an action-economy cost.

What fits already:

- `magic_item` top-level kind exists.
- `activation` mechanics family exists.
- The permanent reward fits `modify_ability_score` with:
  - `ability = "wis"`
  - `delta = 2`
  - `maximum = 30`
- The item's recharge fits `RestResetCadence.elapsed_days` with a century-scale cooldown starting when the resource is spent.

What is missing:

- A new `ClassFeatureActivationCost` / shared activation-cost variant for non-combat, long-form study or use-time requirements.

Why this is a surface widening rather than an atom widening:

- No new v4 effect atom is required. The effect is already expressible by existing `modify_ability_score`.
- No new top-level family is required. This is still an activated magic item.
- The missing piece is a variant of an existing surface shape: activation cost / procedure timing.

Evidence from the unit text:

> "If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines, your Wisdom increases by 2, to a maximum of 30."

Suggested widening:

- Add an activation-cost variant for extended study / elapsed-use requirements, for example a shape that can express:
  - total time required (`48 hours`)
  - completion window (`within 6 days`)

Without that widening, encoding the item as `{ kind = "free" }` or an action-based activation would produce a false trace that omits the book's actual gating mechanic.
