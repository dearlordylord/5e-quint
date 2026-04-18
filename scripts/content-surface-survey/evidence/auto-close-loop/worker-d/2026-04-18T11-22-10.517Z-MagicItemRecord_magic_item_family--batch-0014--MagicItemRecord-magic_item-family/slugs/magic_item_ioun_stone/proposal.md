`Ioun Stone` does not fit the current authored surface as one honest magic-item collection record, so no `content/magic_item_ioun_stone.dhall` was authored.

Why it fails:

1. `Reserve` forces a missing magic-item payload shape.
`Reserve` is not just a passive or wearer-activated item. It supports:
- third-party storage: "Any creature can cast a spell of level 1 through 4 into the stone by touching it as the spell is cast."
- bounded stored payload capacity: "The stone can store up to 4 levels of spells at a time."
- later release by the current wearer using the original caster's slot level / DC / spell attack bonus / spellcasting ability.

The current magic-item families are `passive`, `activation`, `triggered_reaction`, `spawned_creature`, and `composite` over those families. None can represent "store arbitrary external spell payload now, release it later with preserved original cast metadata." The taxonomy mentions `stored_spell`, `store`, and `release`, but the authored TS surface does not expose a magic-item mechanics family that uses them.

2. `Sustenance` needs a new effect atom.
`Sustenance` says: "You don't need to eat or drink while this clear spindle orbits your head."
There is no existing passive atom for suppressing food / water requirements. This is not DM agenda; it is a deterministic ongoing state change, but it is outside the current effect union.

3. `Absorption` / `Greater Absorption` need a more expressive item-resource spend model.
The reaction half itself mostly matches existing surface pieces:
- reaction trigger on `creature_casts_spell`
- visibility gate
- spell-level ceiling
- `negate_triggering_spell`

But the burnout accounting is "Once the stone has canceled 20 levels of spells, it burns out". That is not a fixed 1-use or player-chosen charge spend. The amount consumed per cancellation equals the triggering spell's level, so the resource-spend side needs a trigger-derived variable cost. Current activation resources do not expose that for non-`grant_spell_access` item reactions.

Encodable subset, but not honest whole-unit encoding:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength` fit `modify_ability_score`.
- `Awareness` fits passive roll-advantage riders on `initiative` and Wisdom (Perception) checks.
- `Mastery` fits `modify_proficiency_bonus`.
- `Protection` fits `modify_ac`.
- `Regeneration` fits a passive hourly operation healing 15 HP at `HP >= 1`.

Those successes are not enough to author the whole collection honestly because the omitted variants are themselves named SRD stone types within the same unit, not minor secondary clauses on otherwise-complete variants.
