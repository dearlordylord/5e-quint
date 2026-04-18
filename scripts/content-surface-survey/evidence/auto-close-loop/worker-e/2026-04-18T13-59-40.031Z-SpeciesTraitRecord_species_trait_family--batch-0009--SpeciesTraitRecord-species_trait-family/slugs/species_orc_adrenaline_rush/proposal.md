`Adrenaline Rush (Orc)` fits the existing `species_trait` top-level kind and the `activation` mechanics family, but the current activation surface cannot encode its core economy honestly.

Required widening: add a `ClassFeatureActivationCost` variant for "take a named standard action using your bonus-action quota" (for example, `dash_as_bonus_action` or a parameterized `bonus_action_as_standard_action { action: "dash" }`).

Why this is needed:

- The trait's primary mechanic is not "spend a bonus action and gain temp HP."
- The trait's primary mechanic is "take the Dash action as a Bonus Action."
- The Temporary Hit Points rider is conditional on that Dash use: "When you do so..."

Why existing shapes are insufficient:

- `activationCost = { kind = "bonus_action" }` captures the quota spent, but loses the fact that the granted action is specifically `Dash`.
- `activationCost = { kind = "standard_action", action = "dash" }` captures `Dash`, but lies about the quota spent.
- `grant_extra_action` is wrong because the trait does not grant an extra action; it authorizes a specific existing action in a different action-economy slot.

With the new activation-cost variant, the rest of the trait fits cleanly:

- `resource.cap = { kind = "proficiency_bonus" }`
- `resetCadence = { kind = "short_or_long_rest" }`
- a direct self-attached `grant_temp_hp` effect with amount derived from proficiency bonus

Evidence:

> "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus."
