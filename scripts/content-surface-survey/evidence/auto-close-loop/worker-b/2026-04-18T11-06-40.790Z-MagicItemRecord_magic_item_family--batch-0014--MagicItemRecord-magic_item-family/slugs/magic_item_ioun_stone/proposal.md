## Ioun Stone

Outcome: `structural_widening`

`Ioun Stone` fits the existing `magic_item` collection record only partially.

The passive benefit variants are straightforward:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength` map to `modify_ability_score`.
- `Awareness` maps to `modify_roll_advantage` on `initiative` and `ability_check` with `skillFilter` = Perception.
- `Mastery` maps to `modify_proficiency_bonus`.
- `Protection` maps to `modify_ac`.
- `Regeneration` maps to a passive hourly `heal_hp` operation with `predicate` `HP >= 1`.
- `Sustenance` does not currently have a surfaced atom, but it is also not the main blocker here.

The item becomes non-encodable as one honest collection because `Reserve` needs mechanics the current surface does not have:

- item-owned spell storage with a capacity measured in spell levels;
- storing arbitrary incoming spells from any caster at cast time;
- later releasing a stored spell while preserving the original caster's slot level, spell save DC, spell attack bonus, and spellcasting ability.

That is not just one missing atom. It needs a dedicated stored-spell reservoir / release subgraph.

Secondary gaps:

- `Absorption` and `Greater Absorption` need a reaction resource cost derived from the triggering spell's level, because the burnout meter advances by absorbed spell levels, not by a flat use count.
- The shared orbiting rules need an explicit orbit-state lifecycle if the surface wants to represent the Magic action to start orbiting, the Utilize action to stow stones, and the three-stone concurrent cap rather than treating orbiting as caller-owned equipment state.

Because `Reserve` forces a new family/subgraph, I did not author `content/magic_item_ioun_stone.dhall` or a placeholder JSON/trace.
