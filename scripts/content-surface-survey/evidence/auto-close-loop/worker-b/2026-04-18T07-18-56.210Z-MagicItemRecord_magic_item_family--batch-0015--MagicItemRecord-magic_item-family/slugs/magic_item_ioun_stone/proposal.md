# Proposal: `Ioun Stone`

## Verdict

`Ioun Stone` is a `structural_widening`, not a clean single-item encoding.

The blocker is not one missing passive atom. The SRD text is an umbrella entry for multiple distinct magic items:

- different rarities;
- different passive vs reactive vs storage mechanics;
- mutually exclusive benefits keyed by stone type.

A single `MagicItemRecord` has one `rarity`, one `description`, one `destruction` policy, and one `mechanics` payload. Encoding the grouped entry as one record would create an invalid state where one stone simultaneously grants every listed effect.

Evidence:

> "Many types of Ioun Stones exist, each type a distinct combination of shape and color."

> "The type of stone determines its rarity and effects."

## Needed structural widening

Add a record-level grouped-variant shape for SRD umbrella items, for example a `MagicItemRecord.variant_bundle` that contains a non-empty list of mutually exclusive child variants, each with its own:

- `id`
- `name` or variant label
- `rarity`
- `mechanics`
- `destruction`

That would let one umbrella heading author:

- `Absorption`
- `Agility`
- `Awareness`
- `Fortitude`
- `Greater Absorption`
- `Insight`
- `Intellect`
- `Leadership`
- `Mastery`
- `Protection`
- `Regeneration`
- `Reserve`
- `Strength`
- `Sustenance`

without pretending they are one combined item.

## Secondary gaps exposed by specific variants

Even after splitting the umbrella into child variants, several individual stones still pressure the surface:

### `modify_proficiency_bonus`

`Mastery` needs a direct PB modifier atom.

Evidence:

> "Your Proficiency Bonus increases by 1 while this pale green prism orbits your head."

### Hourly ongoing trigger

`Regeneration` needs a timed ongoing trigger such as `OngoingTrigger.on_elapsed_hours`.

Evidence:

> "You regain 15 Hit Points at the end of each hour if you have at least 1 Hit Point while this white spindle orbits your head."

### Stored-spell reservoir subgraph

`Reserve` needs an item-storage model, not just `grant_spell_access`:

- spells are cast into the item;
- storage is bounded by total spell levels;
- the stored spell later uses the original caster's slot level / DC / attack bonus / spellcasting ability;
- releasing the stored spell frees capacity.

Evidence:

> "This vibrant purple prism stores spells cast into it, holding them until you use them. The stone can store up to 4 levels of spells at a time."

### Spell-level burn tracking on reactive cancel

`Absorption` / `Greater Absorption` need a reaction-shaped cancel that also tracks cumulative canceled spell levels until burnout.

Evidence:

> "Once the stone has canceled 20 levels of spells, it burns out, turns dull gray, and loses its magic."

## What already fits if split into separate items

Several variants would fit today as ordinary passive magic items once modeled individually:

- `Protection` via `modify_ac`
- `Awareness` via `modify_roll_advantage` on `initiative` and `ability_check` with `skillFilter = perception`
- `Agility` / `Fortitude` / `Insight` / `Intellect` / `Leadership` / `Strength` via `modify_ability_score` with `maximum = 20`
- `Sustenance` likely remains out of combat / caller-owned, depending on whether survival-needs suppression belongs in scope

## Files intentionally not written

Per protocol, I did **not** write:

- `content/magic_item_ioun_stone.dhall`
- `content/magic_item_ioun_stone.json`
- `content/magic_item_ioun_stone.trace.md`

because there is no honest single-record encoding for the assigned grouped unit.
