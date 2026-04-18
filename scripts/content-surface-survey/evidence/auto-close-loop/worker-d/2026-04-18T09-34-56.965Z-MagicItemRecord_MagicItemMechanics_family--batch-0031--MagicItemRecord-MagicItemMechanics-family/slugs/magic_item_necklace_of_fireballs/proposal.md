## Necklace of Fireballs

Outcome: `surface_widening`

The unit fits the existing `magic_item` top-level kind and the existing
`activation` mechanics family, but it does not fit the current
activation-shaped surface honestly because non-spell activated abilities
have no authored range.

What already fits:

- `magic_item` record
- `activation` family
- `activationCost = { kind = "standard_action", action = "magic" }`
- `resource = charge_pool` with `initialCount = 1d6 + 3`
- `resetCadence = never`
- `save_gate` payload with fixed `dc = 15`
- `damage.amount = resource_spent_linear` using the built-in Necklace of
  Fireballs pressure shape:
  - base `7d6`
  - `+1d6` per bead spent
  - maximum `12d6`

What does **not** fit:

- The bead is thrown "up to 60 feet away".
- `ActivatedAbilityMechanics` has no `range` field.
- Its phases are traced with an implicit `{ kind = "self" }` range, which
  would make an area save-gate read as if it originates only from self.
- Encoding the unit anyway would produce a knowingly false trace.

Suggested widening:

- Add a non-spell activation range field, ideally on the shared activated
  ability header so magic items / class features / species traits can all
  use it:
  - `ActivatedAbilityHeader.range : Range`

Why this is the narrow fix:

- The family already exists.
- The atoms already exist.
- The resource-spent damage scaling already exists specifically for this
  item.
- Only the delivery range for non-spell activations is missing.
