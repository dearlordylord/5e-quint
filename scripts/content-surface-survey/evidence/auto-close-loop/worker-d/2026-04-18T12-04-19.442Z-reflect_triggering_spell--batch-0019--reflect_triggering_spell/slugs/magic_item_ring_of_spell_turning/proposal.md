## Ring of Spell Turning

Outcome: `surface_widening`

The unit almost fits the existing `magic_item` surface honestly:

- The passive half fits `PassiveMechanics`:
  - Advantage on saving throws against spells via `modify_roll_advantage` with `on: ["saving_throw"]` and `saveSourceFilter: { kind: "spell_or_other_magical_effect" }`.
- The reaction trigger and core reflection behavior already fit the existing reaction surface:
  - `ReactionTrigger.kind = "spell_save_outcome"`
  - `EffectAtom.kind = "reflect_triggering_spell"`
  - `EffectAtom.kind = "negate_triggering_spell"` for the "no effect on you" rider

The blocker is that `TriggeredReactionAbilityMechanics` currently requires an item-local `resource` and `resetCadence`. `Ring of Spell Turning` does not have charges, uses, or a recharge rule. Its only cost is the normal reaction economy.

Evidence from the unit text:

> "While wearing this ring, you have Advantage on saving throws against spells."

> "If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you."

> "If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster..."

Why this is a surface widening, not structural or atom widening:

- `magic_item` already exists.
- `composite` magic-item mechanics already exist for passive + activated/reaction parts.
- The needed trigger and effect atoms already exist in the current surface/tracer.
- What is missing is a way to author a triggered-reaction magic-item part that consumes only `reaction_quota` and does not invent a false item resource/reset loop.

Proposed widening:

- Add a new variant or optional path on non-spell `TriggeredReactionAbilityMechanics` allowing **no item-local activation resource/reset cadence**.
- The reaction part should be authorable as:
  - equipment gate / attunement gate as usual
  - `activationCost = { kind = "reaction", trigger = ... }`
  - no `resource`
  - no `resetCadence`

Without that widening, any authored JSON would have to lie by adding fake uses, charges, or recharge timing that the ring does not have.
