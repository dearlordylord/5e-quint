## Cube of Force

`Cube of Force` does not fit the current magic-item surface honestly.

Why it fails:

- The item grants access to multiple named spells with one shared pool: 10 starting charges, 1d6 expended charges regained daily at dawn.
- The granted spells have mixed native casting shapes:
  - `Shield` is a reaction spell.
  - `Mage Armor`, `Resilient Sphere`, and `Wall of Force` are action-shaped.
  - `Tiny Hut` and `Private Sanctum` are long-cast spells.
- The current surface can model:
  - passive `grant_spell_access`;
  - activated magic items with `charge_pool` + `resetCadence`;
  - triggered-reaction magic items;
  - composite items with multiple parts.

But it cannot model this combination honestly:

- If authored as one `activation` magic item, the activation cost would have to be fixed, which lies about `Shield` being a reaction and the long-cast spells keeping their own cast times.
- If authored as passive `grant_spell_access`, there is nowhere to put the shared `charge_pool` and `dawn` recharge.
- If split into composite parts, each part would need its own resource header, which would duplicate the single shared 10-charge pool the item actually has.

This is a surface gap, not an atom gap. The needed concepts already exist in the taxonomy:

- `grant_spell_access`
- `charge`
- `attunement_slot`

What is missing is a magic-item shape that lets one shared resource/reset cadence govern multiple granted spells regardless of whether the granted spell's native casting time is action, reaction, or long-cast.

Suggested widening:

- Add a magic-item mechanics variant that combines:
  - a shared `charge_pool`;
  - a shared `resetCadence`;
  - a list of `grant_spell_access` effects;
  - optional item-level equipment gating such as `holding_item`.

Evidence from the unit text:

> "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table."

> "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."
