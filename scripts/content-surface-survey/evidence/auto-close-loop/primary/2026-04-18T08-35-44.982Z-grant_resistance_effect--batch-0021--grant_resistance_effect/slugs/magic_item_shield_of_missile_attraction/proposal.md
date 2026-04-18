`Shield of Missile Attraction` does not fit cleanly in the current surface.

What fits today:

- `magic_item` record kind
- `passive` mechanics family
- `condition = { kind = "holding_item" }`
- `grant_resistance` with `sourceFilter = { kind = "attack", weaponFilter = { kind = "weapon_category", category = "ranged" } }`

What does not fit:

- The curse forces target substitution for an incoming ranged-weapon attack aimed at a nearby creature.

Why this is an `atom_widening`:

- The missing concept is not a new top-level unit family. The item is still a passive magic item.
- The missing concept is not just a new variant of an existing surface shape. No existing `EffectAtom`, `Attachment`, `ReactionTrigger`, or `OngoingOperation` variant expresses "this attack now targets a different creature."
- The rule is deterministic core mechanics, not DM agenda.

Required widening:

- New effect atom: `redirect_incoming_attack_target`

Suggested semantics:

- Passive rider on the shield bearer while holding the shield.
- Watches incoming attacks made with ranged weapons.
- Scope restriction: only when the original target is a creature within 10 feet of the bearer.
- On trigger, replace the original target with the bearer before the attack resolves.

RAW evidence:

> Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead.

Encoding note:

- Authoring only the resistance half would produce a misleading partial trace, because the curse is a substantial mechanical rider rather than flavor text.
