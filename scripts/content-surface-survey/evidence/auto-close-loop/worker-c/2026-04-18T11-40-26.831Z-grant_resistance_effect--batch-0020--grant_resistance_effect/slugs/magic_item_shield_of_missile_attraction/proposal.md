`Shield of Missile Attraction` is not cleanly authorable against the current surface.

What fits now:
- The non-cursed rider is a normal `magic_item` passive:
  `condition = holding_item`
  `grant_resistance` with `sourceFilter = { kind = "attack", weaponFilter = { kind = "weapon_category", category = "ranged" } }`

What does not fit:
- The curse is a deterministic attack-retarget mechanic:
  "Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."
- No existing `EffectAtom` rewrites the target of an already-declared attack.
- No existing passive-item trigger grammar listens for "an attack targets a creature within N feet of you". `PassiveOperation` only supports fixed elapsed-time cadence.

Required widening:
- New effect atom: `retarget_triggering_attack`
  Semantics: when a qualifying triggering attack is in flight, replace its target with the bearer / attached creature.
- New passive trigger variant: attack-target event scoped around the bearer
  Example shape: an attack with a ranged weapon targets a creature within 10 feet of the bearer.

Additional modeling pressure:
- The curse begins on attunement and explicitly survives simply removing the shield:
  "Attuning to it curses you... Removing the Shield fails to end the curse on you."
- Current magic-item passives are item-state grants, not attunement-born persistent curse state with a distinct removal condition (`Remove Curse` or similar magic).
- I am not classifying this as `structural_widening` because the main hard blocker is still the missing attack-retarget atom/trigger. But if curse-lifecycle fidelity becomes required, the surface will also need a way to model attunement-triggered persistent effects that outlast holding the item.
