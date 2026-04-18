## Cube of Force

Outcome: `surface_widening`

`Cube of Force` is a real `magic_item`, and the current surface already has the key atoms for most of it:

- shared `charge_pool`
- `dawn` recharge
- `grant_spell_access`
- item-level `dcOverride`
- attunement on `MagicItemRecord`

The honest-fit failure is narrower than a missing top-level family: the current magic-item `activation` mechanics force a single `activationCost` for the whole item. That works for items whose entire spell menu uses the same timing, but `Cube of Force` mixes:

- `Shield` as a reaction
- `Mage Armor`, `Resilient Sphere`, and `Wall of Force` as action casts
- `Tiny Hut` and `Private Sanctum` as longer casts

Encoding the item as one `activation` with `activationCost = { kind = "action" }` would lie about `Shield`. Encoding it as a reaction would lie about the other five faces. Splitting the item into multiple activated parts would duplicate the shared 10-charge pool, which is not honest modeling.

### Proposed widening

Add a surface way to model a shared charge-backed spell menu where each granted spell can keep its own casting-time / trigger shape.

Two plausible shapes:

1. Widen `grant_spell_access` with an optional per-spell activation timing/trigger override for item-granted casts, while keeping the shared `charge_pool` on the enclosing item.
2. Add a dedicated magic-item spell-menu variant under existing magic-item mechanics that carries:
   - one shared `charge_pool`
   - one shared reset cadence
   - a list of spell grants, each with its own cast timing and optional `dcOverride`

No new v4 atom is forced by this unit. The gap is in the authored surface shape, not the atom inventory.

### Evidence

> "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table."

> "Shield | 1"

> "Tiny Hut | 3"

> "Private Sanctum | 4"
