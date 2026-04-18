## Shield of Missile Attraction

Outcome: `atom_widening`

The item does not fit honestly as-authored, so no `content/magic_item_shield_of_missile_attraction.dhall` was created.

What fits today:

- The passive resistance rider fits existing `magic_item` + `passive` mechanics:
  - `grant_resistance`
  - `sourceFilter = { kind = "attack", weaponFilter = { kind = "weapon_category", category = "ranged" } }`

What does **not** fit:

- The curse is an always-on, automatic retargeting rule:
  - "Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."
- There is no existing effect atom for redirecting or retargeting an incoming attack to the wielder.
- There is also no non-spell passive trigger surface for "when a qualifying attack targets a nearby creature" on a magic item. `PassiveOperation` only supports elapsed-time cadence, not combat-event triggers.

Why this is `atom_widening` rather than `clean` or `surface_widening`:

- The missing mechanic is not just a new variant of an existing shape. The current v4 inventory in `TAXONOMY_atoms_graph.md` has no retarget / redirect-attack effect atom.
- Any honest encoding needs a deterministic atom along the lines of `retarget_incoming_attack` or `attract_qualifying_attack`, scoped to:
  - source attack kind: attacks made with ranged weapons
  - proximity condition: original target within 10 feet of the wielder
  - new target: the wielder

Evidence:

> "Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."

Secondary note:

- The attunement curse persistence clause ("Removing the Shield fails to end the curse on you") also suggests future lifecycle/state modeling for persistent curses, but the first blocking issue here is the missing attack-retarget mechanic itself.
