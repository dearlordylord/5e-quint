# Adrenaline Rush (Orc)

Outcome: `atom_widening`

## Why it stops

`Adrenaline Rush` fits the existing top-level shape as a `species_trait` with `activation` mechanics:

- `activationCost = { kind = "bonus_action" }`
- `resource.cap = { kind = "proficiency_bonus" }`
- `resetCadence = { kind = "short_or_long_rest" }`
- the temporary Hit Point rider fits existing `grant_temp_hp`

The blocker is the trait's primary action-economy rule:

> "You can take the Dash action as a Bonus Action."

The current surface has no honest way to encode "perform a named standard action using your bonus action":

- `grant_extra_action` is wrong. It models an additional action to spend later, as in Action Surge, not a bonus-action Dash.
- A bare `bonus_action` activation plus only `grant_temp_hp` would be incomplete and misleading, because the temporary Hit Points are conditional on actually taking the Dash action.
- Omitting the Dash portion would discard the trait's core mechanic.

## Proposed widening

Add a new effect atom for action-economy remapping, e.g. `take_standard_action_as_bonus_action` or equivalent.

Minimal semantics needed for this unit:

- spend `bonus_action_quota`
- perform one named `StandardActionKind` immediately
- allow other riders in the same activation to key off that action having been taken

For `Adrenaline Rush`, the authored shape would then be:

- activated `species_trait`
- bonus-action cost
- PB uses, short-or-long-rest reset
- direct self phase containing:
  - new action-remap atom for `dash`
  - `grant_temp_hp` with amount = PB

## Classification rationale

This is `atom_widening`, not `surface_widening` or `structural_widening`:

- the unit kind and mechanics family already exist
- the missing piece is a deterministic mechanics atom absent from both the authored surface and the v4 atom inventory
