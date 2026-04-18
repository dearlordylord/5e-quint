`Ioun Stone` is a magic-item collection record, and most variants fit the existing surface cleanly:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`: passive `modify_ability_score`
- `Awareness`: passive `modify_roll_advantage` on `initiative` and Wisdom (`perception`) checks
- `Mastery`: passive `modify_proficiency_bonus`
- `Protection`: passive `modify_ac`
- `Regeneration`: passive `operations` with hourly cadence, HP-threshold predicate, and `heal_hp`

The collection still does not fit honestly as-authored because three gaps remain.

`Reserve` forces a structural widening. It is not "grant spell access" and not a normal charge-cast item. The stone must:

- accept arbitrary level-1-to-4 spells cast into it,
- track occupied spell-level capacity up to 4,
- preserve original caster metadata for each stored spell,
- later release one stored spell as though the wearer cast it,
- remove the released spell from storage.

That is a dedicated storage/release mechanic, not a passive or ordinary activation family. The v4 taxonomy hints at this with `stored_spell`, `store`, and `release`, but the current TS surface has no honest family for it.

`Sustenance` forces a new effect variant. Current passive atoms cover combat and movement-facing benefits, but none mean "the wearer no longer needs food or drink."

`Absorption` and `Greater Absorption` mostly fit the existing triggered-reaction surface for the cancellation itself, but their burnout rule needs lifetime progress from trigger context:

- reaction to a qualifying spell cast by a visible creature,
- cancel the triggering spell,
- add the triggering spell's level to a cumulative absorbed-total,
- destroy the item's magic after 20 absorbed spell levels.

Current activation resources are modeled as costs the item spends, with reset cadences. They do not model a monotonic lifetime intake total driven by the triggering spell's level.

Because those gaps affect whole variants rather than minor secondary riders, the honest classification for the `Ioun Stone` collection is `structural_widening`, and no placeholder `content/magic_item_ioun_stone.dhall` was authored.
