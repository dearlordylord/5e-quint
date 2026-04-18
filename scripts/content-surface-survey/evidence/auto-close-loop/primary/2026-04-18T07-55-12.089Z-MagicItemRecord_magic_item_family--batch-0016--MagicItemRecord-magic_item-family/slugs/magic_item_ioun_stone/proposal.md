# Ioun Stone

`Ioun Stone` fits the existing top-level `magic_item` kind as a variant collection with shared attunement, so this is not a missing `UnitRecord` kind problem. The blocker is that the official collection contains several variant mechanics that the current surface cannot encode honestly inside `PassiveMechanics`, `ActivatedAbilityMechanics`, or `TriggeredReactionAbilityMechanics`.

## Why This Stops

- `Regeneration` is a recurring while-orbiting effect: `You regain 15 Hit Points at the end of each hour if you have at least 1 Hit Point while this white spindle orbits your head.`
  The current non-spell surface has passive grants and activations, but no non-spell ongoing/recurring operation family.
- `Absorption` and `Greater Absorption` need a reaction that cancels a triggering spell and spends a variable amount from a 20-level pool based on the triggering spell's level: `Once the stone has canceled 20 levels of spells...`
  `charge_pool` exists, but there is no honest way to express reaction-context variable spend for a non-spell ability.
- `Reserve` is a stored-spell reservoir, not a fixed spell grant:
  `Any creature can cast a spell of level 1 through 4 into the stone... While this stone orbits your head, you can cast any spell stored in it.`
  The current magic-item families do not represent storing arbitrary incoming spells with original-caster metadata for later release.
- `Mastery` needs a global proficiency-bonus modifier:
  `Your Proficiency Bonus increases by 1...`
  No current effect atom models that.

## Proposed Widenings

1. Add a non-spell ongoing-effect mechanics family for magic items.
   This should parallel spell-side recurring operations closely enough to encode hour-end healing and similar timed while-equipped benefits.

2. Add non-spell variable charge spending derived from reaction context.
   Absorption stones need “consume spell level from pool” rather than fixed 1-use or fixed-charge activation.

3. Add a `modify_proficiency_bonus` effect atom.
   `Mastery` is a direct pressure case.

4. Add a stored-spell reservoir item subgraph/family.
   This needs to represent:
   - accepting arbitrary incoming level-1-to-4 spells into capacity
   - preserving original slot/DC/attack/spellcasting ability
   - releasing one stored spell later through the wearer

## Notes

- Several variants are already representable with existing surface:
  `Agility`, `Awareness`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Protection`, and `Strength`.
- `Sustenance` is a secondary narrative/needs-suppression rider and is not the primary blocker.
- Because this task is for the whole `Ioun Stone` unit, encoding only the representable variants would be misleading. No `content/magic_item_ioun_stone.dhall` was authored.
