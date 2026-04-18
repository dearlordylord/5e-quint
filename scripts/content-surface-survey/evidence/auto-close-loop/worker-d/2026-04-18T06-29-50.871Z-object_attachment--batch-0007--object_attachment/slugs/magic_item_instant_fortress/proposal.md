`Instant Fortress` does not fit the current authored surface honestly.

Why it stops before authoring:

- The item is activated repeatedly "as a Magic action" with no use-count, charge pool, or rest-based reset. Current `ActivatedAbilityMechanics` requires both `resource` and `resetCadence`, so there is no honest way to encode an unlimited reusable activation.
- The core effect is not just a passive grant or a spell-access grant. The statuette becomes a persistent physical tower with durable state: occupied area is pushed clear, the tower can revert only if empty, damage persists across shrinking/re-expansion, and the door obeys a separate Bonus Action command. That wants explicit object/structure creation semantics, not a proxy `grant_spell_access` or a misleading `alter_item_kind` placeholder.
- The closest existing surface atom, `alter_item_kind`, is too weak on its own. It can rename the form, but it cannot carry the tower's created footprint, persistent HP/AC/resistances, empty-only revert gate, or commandable door behavior.

Narrowest honest classification: `surface_widening`.

Concrete widenings forced by the text:

1. `ActivationResource` needs an unlimited/reusable variant, or `ActivatedAbilityMechanics` must allow no resource at all for repeatable item activations.
2. `EffectAtom` needs a surface form for persistent object/structure creation, corresponding to the existing v4 `create_object` taxonomy atom.
3. The surface likely also needs an item/object attachment or created-object handle so follow-up operations can refer to "the tower" for reverting, door commands, and persistent damage state.

Evidence from the unit text:

> "As a Magic action, you can place this 1-inch adamantine statuette on the ground ... cause it to grow rapidly into a square adamantine tower."

> "Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."

> "Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower."

> "The door opens only at your command, which you can issue as a Bonus Action."

> "Shrinking the tower back down to statuette form doesn't repair damage to the tower."
