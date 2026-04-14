# MONFAC2 Research: Monster Combat Modifier Trait Surface

Date: 2026-04-14

Task: `MONFAC2 - Monster Combat Modifier Trait Surface`

## Outcome

Choose `Magic Resistance` as the first implementation family.

`MONFAC2` should move from `ready-for-research` to `ready-for-implementation-after-light-research`.

## Why This Family

The current `combatModifierTrait` backlog in the shipped catalog is a small, explicit set:

- `Pack Tactics` on `Kobold Warrior`
- `Bloodied Frenzy` on `Berserker`
- `Magic Resistance` on `Pseudodragon`
- `Blood Frenzy` on `Sahuagin Warrior`

`Magic Resistance` is the cleanest first generic surface because:

- it is an exact repeated SRD phrase used across many monsters, not a one-off clause;
- it fits the existing generic saving-throw lane instead of needing a new attack-position or environment owner;
- it does not require sunlight/illumination state;
- it does not combine multiple unrelated predicates into one trait family.

## RAW Check

Relevant SRD text:

- `.references/srd-5.2.1/Monsters/Monsters-P-S.md` > `Pseudodragon`
  - `Magic Resistance.` The pseudodragon has Advantage on saving throws against spells and other magical effects.
- `.references/srd-5.2.1/Rules-Glossary.md`
  - `Saving Throw`
  - `Advantage`

Relevant ubiquitous language:

- `Saving Throw`
- `Advantage`
- `Attack Roll`
- `Ability Check`
- `Bloodied`

## Rejected Candidates

### `Pack Tactics`

Do not choose this first.

- It is still unsupported in the current integrated baseline, but it needs new target-adjacency combat-state queries on the attack lane.
- That makes it a valid later family, but it is a broader first implementation than `Magic Resistance`, which can reuse the existing save-resolution owner.

### `Sunlight Sensitivity`

Do not choose this first. It is environment-gated:

- SRD: while in sunlight, the creature has Disadvantage on ability checks and attack rolls.
- That requires a durable `inSunlight` or equivalent illumination predicate.
- It also spans both attack-roll and ability-check modifiers, which widens the first trait slice.

This should stay a later task under an environment-owned surface.

### `Bloodied Frenzy`

Do not combine this with `Blood Frenzy`.

- SRD: while Bloodied, the berserker has Advantage on attack rolls and saving throws.
- Predicate is about the acting creature's HP state.
- It spans two modifier lanes: attack rolls and saving throws.

This is a separate `bloodiedSelf` family, not the same surface as `Magic Resistance`.

### `Blood Frenzy`

Do not combine this with `Bloodied Frenzy`.

- SRD: the sahuagin has Advantage on attack rolls against any creature that doesn't have all its Hit Points.
- Predicate is about the target missing HP, not the acting creature being Bloodied.
- It only affects attack rolls.

This is a separate `targetMissingHp` family.

## Existing Surface Reuse

Current runtime facts relevant to `Magic Resistance`:

- spell save resolution already owns generic saving-throw mechanics;
- `resolveSave` already knows save ability, DC, and roll, but not yet whether the save came from a spell or another magical effect;
- `InitCreatureConfig` and `BattleCreatureState` already carry generic projected monster state, so this trait should project there rather than through monster-name special cases.

## Implementation Handoff

Implement `Magic Resistance` as a generic save-modifier trait surface with this shape:

1. Add an authored executable trait kind for save-modifier traits instead of leaving `Magic Resistance` as `kind: "text"`.
2. Project that authored trait through `statBlockToInitCreatureConfig` into generic battle/init state.
3. Extend save contexts so save resolution can ask whether the current save is against:
   - a spell
   - another magical effect
4. Apply Advantage generically during save resolution when the creature has the matching save-modifier trait and the save source qualifies.
5. Convert `Pseudodragon` `Magic Resistance` from unsupported text to the new generic trait.
6. Leave `Pack Tactics`, `Sunlight Sensitivity`, `Bloodied Frenzy`, and `Blood Frenzy` as explicit unsupported text with their current durable reasons.
