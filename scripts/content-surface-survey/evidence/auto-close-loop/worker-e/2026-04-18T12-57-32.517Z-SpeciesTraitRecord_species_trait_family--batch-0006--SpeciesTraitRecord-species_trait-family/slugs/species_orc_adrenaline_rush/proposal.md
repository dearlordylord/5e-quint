`species_orc_adrenaline_rush` fits the existing `species_trait` + `activation` family structurally:

- activation cost: `bonus_action`
- resource: `use_count` with `cap = proficiency_bonus`
- reset cadence: `short_or_long_rest`
- secondary rider: `grant_temp_hp` with amount derived from Proficiency Bonus

The blocker is the primary mechanic:

> "You can take the Dash action as a Bonus Action."

The current surface has no honest way to represent "this activation performs a specific standard action". Existing shapes do not fit:

- `grant_extra_action` is incorrect. That means an additional action quota, not "take Dash as the bonus-action activation".
- `grant_extra_action` + `restrict_action_set` is still incorrect because it would model a bonus-action activation that grants another action, which the trait does not do.
- Encoding only `grant_temp_hp` would be incomplete and misleading because the temporary HP is explicitly contingent on taking Dash through the trait.

Proposed widening: add a new effect atom or equivalent action-resolution primitive such as `perform_standard_action`, parameterized by `StandardActionKind`.

Suggested shape:

```ts
{
  readonly kind: "perform_standard_action";
  readonly action: StandardActionKind;
}
```

Why this is an atom widening rather than structural or surface:

- The top-level kind already exists: `species_trait`.
- The mechanics family already exists: `activation`.
- The missing concept is a new deterministic mechanics atom, not just a new variant of an existing surface type.

With that atom, Adrenaline Rush could encode as:

- activation cost: `bonus_action`
- effect bundle:
  - `perform_standard_action { action: "dash" }`
  - `grant_temp_hp { amount: proficiency_bonus }`

That would preserve the real rule shape without inventing an extra action.
