# L3MSPELL-03 Continual Flame Component Boundary

Task 3 resolved the costly consumed Material component residual for Continual
Flame. No runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1106-1115 for
  Continual Flame.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` lines 122-138 for
  spell component, hand access, material cost, focus, and consumption rules.
- `UBIQUITOUS_LANGUAGE.md` lines 226-236 for Spell Slot and Spell Component.
- `UBIQUITOUS_LANGUAGE.md` lines 238-255 for Spell Definition, Spell
  Invocation, and Spell Effect ownership.

Relevant RAW facts:

- Continual Flame is a level-2 Action spell with Touch range and an
  until-dispelled duration.
- Its components are V, S, and costly consumed M: ruby dust worth 50+ GP.
- A caster must be able to provide required components to cast a spell.
- Material components need hand access; focus or Component Pouch substitution
  applies only when the material is both nonconsumed and costless.
- Continual Flame's battle-visible spell effect is the object-attached Bright
  Light and Dim Light emitter, not an inventory mutation.

## Existing Boundary

`packages/surface/content/continual_flame.json` already records the Material
component text, `materialCostGp: 50`, and `materialConsumed: true` as authored
Spell Definition facts.

`plans/unit-profile-coverage/unit-claims.jsonl` keeps Continual Flame as
`profile-subset-supported` under `spell.invocation-object-light`. The supported
battle subset owns Magic Action and level-2-or-higher Spell Slot spend, the
caller-supplied touched object fact, the source-owned object-attached light
emitter, and until-dispelled persistence.

Battle-runtime object-light support consumes caller/table object facts and
records battle-visible Spell Effect state. It does not own a material component
inventory, component availability derivation, component hand/access legality, a
Component Pouch or Spellcasting Focus substitution decision, or a consumed
material spend ledger.

## Boundary Decision

Costly consumed Material component availability and consumption for Continual
Flame are outside the current battle-runtime boundary. They belong to a future
character inventory/equipment spell-component legality owner.

Do not add a battle-runtime ruby-dust stock field, component-spend list, copied
equipment inventory, or spell-local inventory flag. When a future component
legality owner exists, it should consume the existing Surface component facts
and the canonical character equipment/inventory facts, then pass only an
admitted Spell Invocation into battle. Battle runtime should continue to own
Spell Slot spending and the object-attached light Spell Effect.

## Plan Impact

- L3MSPELL-03 can close as boundary resolved.
- L3MSPELL-04 should be revised, not unblocked as written: Continual Flame light
  projection is already represented by the existing `spell.invocation-object-light`
  profile, so the remaining useful work is evidence consolidation rather than a
  new full runtime promotion.
- L3MSPELL-12 should include this note and the updated generated ledgers when
  consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding component availability or consumption fields to
  `BattleState`. That would duplicate future character inventory/equipment
  facts and make a spell-local inventory state diverge from the canonical owner.
- Round 2: retained the existing Surface component facts as authored Spell
  Definition data. The missing execution owner is component legality, not
  object-light projection or battle Spell Effect lifecycle.
