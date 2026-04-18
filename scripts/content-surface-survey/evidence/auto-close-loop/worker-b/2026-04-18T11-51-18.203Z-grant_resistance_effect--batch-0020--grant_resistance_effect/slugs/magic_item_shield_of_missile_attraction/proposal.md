## Shield of Missile Attraction

Verdict: `structural_widening`

The item does not fit the current magic-item surface honestly.

What fits now:

- The first sentence is a standard passive magic-item grant:
  - `condition = { kind = "holding_item" }`
  - `grant_resistance` with `sourceFilter = { kind = "attack", weaponFilter = { kind = "weapon_category", category = "ranged" } }`

What does not fit:

- The curse is not an activated ability.
- The curse is not a reaction that spends `reaction_quota`.
- The curse is not a passive timed operation; `PassiveOperation` only supports `elapsed_time`.
- The effect is not any existing atom in the current surface:
  - it does not negate the attack,
  - it does not reflect the attack,
  - it does not merely block targeting,
  - it deterministically retargets a qualifying ranged-weapon attack to the bearer.

Missing pieces forced by the text:

1. A passive triggered subgraph for non-spell, non-reaction item riders.
   Evidence:
   `Whenever an attack with a Ranged weapon targets a creature within 10 feet of you`

2. A target-redirection effect atom.
   Evidence:
   `the curse causes you to become the target instead`

3. A passive-operation trigger variant for nearby attack-targeting events, with filters for:
   - weapon category = ranged
   - radius = 10 feet from bearer

Why this is `structural_widening`, not just `surface_widening`:

- Even if a `redirect_targeting` atom existed, there is no honest family/mechanics slot that can host an always-on automatic triggered curse on a magic item without pretending it is an activation or reaction.
- The current top-level magic-item families are:
  - passive
  - activation
  - triggered_reaction
  - spawned_creature
  - composite of the above
- None matches an automatic passive trigger.

Why I did not author partial content:

- Authoring only the resistance half would silently omit the item's defining cursed behavior.
- The task explicitly prefers no trace over a misleading one.
