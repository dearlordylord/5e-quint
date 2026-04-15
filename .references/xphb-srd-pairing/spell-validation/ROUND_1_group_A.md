# Round 1 Group A

Spells:

- `Aid`
- `Alarm`
- `Antimagic Field`
- `Banishment`
- `Bless`

## `Aid`

- Atoms used:
  - `spell_root`
  - `activate`
  - `choose`
  - `target`
  - `action_window`
  - `grant`
  - `heal`
  - `modify_max_hp`
  - `duration_window`
  - `persist`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `grants`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the spell is not a generic heal; it changes both current and maximum Hit Points at once
  - the target count cap is part of the rule shape, not a cosmetic detail
  - slot scaling is simple, but it is still a real multiplicative rule and not just flavor
- Verdict:
  - strengthens `grant`, `heal`, `modify_max_hp`, and `target`
  - falsifies any reading that `modify_max_hp` alone can carry the spell
  - the taxonomy is still too thin if it cannot distinguish "current HP rises because max HP rose" from ordinary healing

## `Alarm`

- Atoms used:
  - `spell_root`
  - `activate`
  - `choose`
  - `target`
  - `location`
  - `object`
  - `area`
  - `respond`
  - `duration_window`
  - `persist`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the ward is a trigger, not a stored payload
  - the alert mode is bifurcated into audible vs mental, and the mental mode has its own sleep-wake rider
  - the exemption list is part of the cast-time setup, not an afterthought
  - the trigger condition is intrusion, not generic proximity
- Verdict:
  - strengthens `attaches_to`, `choose`, `respond`, and `persist`
  - falsifies the current "anchored spells may be store/release" guess if that guess was meant to explain `Alarm`
  - the taxonomy lies if it treats this as a storage problem; it wants a first-class `trigger` or `alert` concept

## `Antimagic Field`

- Atoms used:
  - `spell_root`
  - `activate`
  - `self`
  - `area`
  - `suppress`
  - `block_targeting`
  - `block_travel`
  - `concentrate`
  - `duration_window`
  - `persist`
  - `break`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `suppresses`
  - `persists_until`
- What leaks into prose:
  - magical items become mundane inside the field
  - teleportation and planar travel fail, while portals temporarily close
  - summoned or created creatures wink out and then return
  - ongoing spells are suppressed and resume later, with suppressed time counting against duration
  - `Dispel Magic` is explicitly denied, which is not just another instance of suppression
- Verdict:
  - strengthens `suppress`, `block_targeting`, `block_travel`, `concentrate`, and `persist`
  - this is the cleanest support yet for `suppress` as a real atom
  - the taxonomy still overflattens suppression if it treats it as the same thing as prohibition

## `Banishment`

- Atoms used:
  - `spell_root`
  - `activate`
  - `target`
  - `apply_condition`
  - `duration_window`
  - `persist`
  - `break`
  - `move`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `modifies`
  - `branches_on_completion`
  - `persists_until`
- What leaks into prose:
  - the saving throw gate is central to the spell, but the current taxonomy has no save-resolution atom
  - the outcome depends on whether the target is native to the current plane
  - the harmless demiplane branch and the home-plane exile branch are materially different
  - the end-of-duration return logic is part of the spell shape, not a side effect
- Verdict:
  - strengthens `apply_condition`, `persist`, and `branches_on_completion`
  - falsifies the idea that `move` alone can represent the spell, because the important rule is planar transport plus branch-sensitive return logic
  - the taxonomy lies if it models this as just "movement with a condition"; it needs a first-class `transport` or `banish` concept and a save-resolution path

## `Bless`

- Atoms used:
  - `spell_root`
  - `activate`
  - `choose`
  - `target`
  - `action_window`
  - `concentrate`
  - `modify_roll`
  - `duration_window`
  - `persist`
- Relations used:
  - `roots`
  - `opens_window`
  - `requires`
  - `attaches_to`
  - `modifies`
  - `persists_until`
- What leaks into prose:
  - the spell only affects attack rolls and saving throws, not checks
  - the target count cap is part of the spell's core logic
  - the higher-slot scaling is a target-count increase, not a larger per-target bonus
  - the bonus is a die roll, so `modify_roll` has to mean more than flat numeric adjustment
- Verdict:
  - strengthens `modify_roll`, `choose`, `target`, and `persist`
  - does not falsify much, but it does pressure `modify_roll` to model additive dice cleanly
  - if the graph wants a `grant` atom, this is a good example of a granted persistent modifier rather than a direct effect

## Cross-Spell Findings

1. `Alarm` falsifies any reading of the anchored-spell hypothesis that reduces everything to `store` and `release`. It is a trigger/alert ward, not a container.
2. `Antimagic Field` validates `suppress` as a core atom. Suppression is not the same thing as prohibition, and the graph should stop pretending it is.
3. `Aid` and `Bless` both show that modifier spells need a better distinction between current HP change, max HP change, and additive roll bonuses.
4. `Banishment` is the clearest sign that the taxonomy is still missing save-resolution and transport/exile vocabulary. `move` and `branches_on_completion` are too blunt.
5. None of these five spells support the idea that the current atom graph is already complete. The broad shape is useful, but several rules still leak into prose because the graph undernames the actual operation.

Files edited:
- `.references/xphb-srd-pairing/spell-validation/ROUND_1_group_A.md`
