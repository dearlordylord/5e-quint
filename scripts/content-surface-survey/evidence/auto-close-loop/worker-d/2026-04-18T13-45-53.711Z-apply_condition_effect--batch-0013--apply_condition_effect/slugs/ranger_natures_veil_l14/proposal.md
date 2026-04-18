`Nature's Veil` is a `class_feature` that otherwise fits the existing `activation` family:

- `activationCost = { kind = "bonus_action" }`
- self-targeted direct application
- `apply_condition "invisible"`
- long-rest reset
- duration can follow the package's existing `timed { unit = "round", amount = 1 }` convention for "until the end of your next turn"

The blocker is the use-count formula.

RAW says:

> "You can use this feature a number of times equal to your Wisdom modifier (minimum of once)"

The current surface has:

- `UseCountCap = { kind: "ability_modifier", ability: Ability }`

but that shape has no field for the RAW floor. Encoding Nature's Veil as plain `ability_modifier` would be false for rangers with Wisdom modifier 0 or lower, because the authored surface would allow 0 or negative uses instead of the required minimum 1.

Recommended widening:

- `new_variant`: widen `UseCountCap.kind = "ability_modifier"` with an optional `minimum` field, e.g. `{ kind: "ability_modifier", ability: "wis", minimum: 1 }`

Why this is only `surface_widening`, not `structural_widening`:

- No new top-level unit kind is needed.
- No new mechanics family is needed.
- No new v4 atom is needed.
- The missing concept is a parameter on an existing resource-cap variant.
