# Ring of Spell Turning

## Verdict

`surface_widening`

## Why It Stops

The item mostly fits the current magic-item surface:

- `magic_item` kind exists.
- `composite` mechanics can combine a passive part with a triggered-reaction part.
- The reaction half already has honest surface support:
  - `ReactionTrigger.spell_save_outcome`
  - `negate_triggering_spell`
  - `reflect_triggering_spell`

The blocker is the passive save rider.

## Missing Surface Shape

The current `SavingThrowSourceFilter` only supports:

- `spell_or_other_magical_effect`

That is too broad for this item. The SRD text is strictly spells:

> "While wearing this ring, you have Advantage on saving throws against spells."

Encoding this with `spell_or_other_magical_effect` would overstate the item's protection and produce a misleading trace.

## Proposed Widening

- Add a narrower `SavingThrowSourceFilter` variant for spells only.

Suggested shape:

```ts
export type SavingThrowSourceFilter =
  | { readonly kind: "spell" }
  | { readonly kind: "spell_or_other_magical_effect" };
```

## After Widening

The item should fit honestly as a `magic_item` with `family: "composite"`:

- Passive part:
  - condition: `wearing_item`
  - grant: `modify_roll_advantage` on `saving_throw`
  - `saveSourceFilter: { kind: "spell" }`
- Triggered-reaction part:
  - condition: `wearing_item`
  - activation cost: `reaction`
  - trigger: `spell_save_outcome`
    - `outcome: "success"`
    - `spellLevelAtMost: 7`
  - phase effect:
    - `negate_triggering_spell`
    - optionally `reflect_triggering_spell` gated by:
      - `spellTargetsOnlySelf: true`
      - `spellHasNoAreaOfEffect: true`

## Notes

There is a second modeling choice inside the reaction text:

> "you can take a Reaction to deflect the spell back at the spell's caster"

The current trigger grammar can express the stricter reflection predicates (`spellTargetsOnlySelf`, `spellHasNoAreaOfEffect`), but the optionality is attached to the reaction window as a whole rather than to a post-negation branch. That still appears workable within the existing triggered-reaction family once the passive filter is widened.
