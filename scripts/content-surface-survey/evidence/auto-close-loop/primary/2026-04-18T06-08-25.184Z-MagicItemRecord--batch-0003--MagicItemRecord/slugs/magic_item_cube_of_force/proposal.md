`Cube of Force` does not fit the current `magic_item` surface honestly.

Why it fails:

- The item has a single shared charge pool and recharge cadence:
  - "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."
- The item grants access to multiple spells with different native casting-time shapes:
  - `Mage Armor` (action)
  - `Shield` (reaction)
  - `Tiny Hut` (1 minute / ritual)
  - `Private Sanctum` (10 minutes)
  - `Resilient Sphere` (action)
  - `Wall of Force` (action)
- The current surface offers two partial fits, but neither is honest:
  - `PassiveMechanics` + `grant_spell_access` preserves spell-specific casting times, but has no place for the shared `charge_pool` and `dawn` recharge.
  - `ActivatedAbilityMechanics` can express the shared `charge_pool` and `dawn` recharge, but forces one item-level `activationCost`, which would lie about `Shield` being a reaction and about the minute-cast spells.

Why this is `structural_widening` rather than `surface_widening`:

- No single existing mechanics family can express "shared spell-access grants with shared item resource, while each granted spell keeps its own casting-time family."
- Existing `composite` magic-item mechanics do not solve it, because splitting the six spells into separate activated parts would duplicate the charge pool and recharge state instead of modeling the one shared pool the item actually has.

Suggested widening:

- Add a new magic-item mechanics shape, or widen the existing one, so a magic item can carry:
  - one shared resource header (`charge_pool`, reset cadence, destruction policy interaction),
  - a list of `grant_spell_access` entries,
  - without imposing one shared activation cost on all granted spells.
- This would let items like `Cube of Force` preserve the granted spell's own casting time and trigger semantics while still spending from the same item-owned charge pool.

Non-blocking note:

- The fixed save DC is already representable with `grant_spell_access.dcOverride = { kind = "fixed", dc = 17 }`.
