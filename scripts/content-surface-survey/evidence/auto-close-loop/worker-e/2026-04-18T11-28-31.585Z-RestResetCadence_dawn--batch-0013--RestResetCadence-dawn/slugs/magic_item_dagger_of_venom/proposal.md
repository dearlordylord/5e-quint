`Dagger of Venom` does not fit the current surface honestly, so no `content/magic_item_dagger_of_venom.dhall` was authored.

Why it fails:

- The passive weapon bonus is fine:
  - `modify_roll_numeric` on `attack_roll`
  - `modify_damage_numeric`
  - both scoped by `weaponFilter = { kind = "specific_item", itemId = "magic_item_dagger_of_venom" }`
- The activated poison coating is the blocker.

Blocking shape:

- The item has a `bonus_action` activation, `use_count` 1, `dawn` reset, and a bounded armed window:
  - "The poison remains for 1 minute or until an attack using this weapon hits a creature."
- During that armed window, a later weapon hit must open a delayed `save_gate`:
  - DC 15 Constitution save
  - on fail: `damage` 2d10 poison
  - on fail: `apply_condition` poisoned
- The poisoned condition then has its own independent duration:
  - "for 1 minute"

Why existing families are insufficient:

- `MagicItemMechanics.composite` can combine passive and activated parts, but `ActivatedAbilityMechanics` only resolves `phases` at activation time.
- Spell `ongoing_effect` has the right persistent-operation grammar (`on_caster_attack_hit`), but that family is spell-only and cannot carry magic-item activation cost/resource/reset semantics.
- `TriggeredReactionAbilityMechanics` is not a fit because the coating is not a reaction window.
- There is no honest way to encode the later save-gated hit rider as a one-shot activation without lying about when the save and poison damage occur.
- There is also no current way to put a standalone timed duration on the `Poisoned` condition applied by that later item rider.

Recommended widening:

1. Add a non-spell activated ongoing family, or widen `ActivatedAbilityMechanics` so a magic item can carry:
   - activation cost/resource/reset
   - a bounded duration / early-end window
   - ongoing operations such as `on_caster_attack_hit`
2. Add support for a timed condition rider on later save results, so item-triggered conditions can outlast the armed coating window when RAW says they do.
