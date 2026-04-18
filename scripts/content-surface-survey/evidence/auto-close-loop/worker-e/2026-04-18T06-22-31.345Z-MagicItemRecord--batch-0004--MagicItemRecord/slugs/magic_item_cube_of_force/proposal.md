`Cube of Force` does not fit the current `MagicItemRecord` mechanics honestly.

Why it fails:

- The item has a single shared charge pool and a single recharge cadence:
  - "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."
- The item grants access to six different spells with different spell-defined casting times:
  - `Mage Armor` (action / longer-lived effect)
  - `Shield` (reaction)
  - `Tiny Hut` (minute / ritual spell)
  - `Private Sanctum`
  - `Resilient Sphere`
  - `Wall of Force`
- The current charge-based magic-item pattern stores the shared pool on `ActivatedAbilityMechanics.resource`, which also requires one item-level `activationCost`.
- That works for wands/staves whose spell list shares one usable item timing, but it is dishonest here:
  - authoring the item as `activationCost = action` would make `Shield` wrong;
  - authoring it as `activationCost = reaction` would make the non-reaction spells wrong;
  - authoring it as `free` would drop the timing constraint entirely;
  - authoring it as `passive` would preserve per-spell timing through `grant_spell_access`, but there is no place to represent the shared 10-charge pool or dawn recharge.

This forces a structural widening: the surface needs a way to model shared item resources independently from per-spell activation timing.

Likely widening directions:

1. Add a magic-item mechanics shape that carries shared item resources/reset/destruction separately from granted spell access.
2. Or widen `grant_spell_access` / magic-item composition so multiple spell grants can share one external `charge_pool` without collapsing to one item-level `activationCost`.

Evidence:

> "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table."

> "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."

Secondary note:

- The fixed save DC 17 is already representable via `grant_spell_access.dcOverride = { kind = "fixed", dc = 17 }`.
- The honest blocker is not the DC or the spell list; it is the combination of one shared item resource with heterogeneous spell casting times.
