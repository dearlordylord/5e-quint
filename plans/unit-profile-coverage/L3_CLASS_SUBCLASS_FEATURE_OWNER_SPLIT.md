# L3 Class And Subclass Feature Owner Split

Date: 2026-05-22

## Decision

Task 33 replaces the generic level-3 class-feature follow-up wording with
checker-visible owner splits for every remaining level-3 class-feature row.
This task does not promote new battle-runtime behavior, add PHB+ content, or
install new Surface Units.

The rows now fall into three owner shapes:

- battle-runtime executable follow-up: attack riders, healing actions, movement
  releases, and cantrip damage replacement;
- Character Creation or Character Sheet durable-fact follow-up: proficiency
  choices, selected feature options, spellbook additions, Hit Point Maximum, and
  Armor Class formulas;
- runtime-detached closure: Hunter's Lore table/stat-block knowledge.

## Source Check

Local RAW checked:

- `.references/srd-5.2.1/Classes/Barbarian.md`: Primal Knowledge and Frenzy.
- `.references/srd-5.2.1/Classes/Cleric.md`: Disciple of Life and Preserve
  Life.
- `.references/srd-5.2.1/Classes/Druid.md`: Land's Aid.
- `.references/srd-5.2.1/Classes/Fighter.md`: Remarkable Athlete.
- `.references/srd-5.2.1/Classes/Monk.md`: Open Hand Technique.
- `.references/srd-5.2.1/Classes/Paladin.md`: Channel Divinity and Sacred
  Weapon.
- `.references/srd-5.2.1/Classes/Ranger.md`: Hunter's Lore and Hunter's Prey.
- `.references/srd-5.2.1/Classes/Rogue.md`: Steady Aim, Fast Hands, and
  Second-Story Work.
- `.references/srd-5.2.1/Classes/Sorcerer.md`: Draconic Resilience.
- `.references/srd-5.2.1/Classes/Warlock.md`: Dark One's Blessing.
- `.references/srd-5.2.1/Classes/Wizard.md`: Evocation Savant and Potent
  Cantrip.

Ubiquitous-language terms checked:

- Ability Check, Saving Throw, Attack Roll, Advantage, Bonus Action, Magic
  Action, Reaction, Temporary Hit Points, Hit Point Maximum, Damage Type,
  Resistance, Immunity, Speed, Movement, and Opportunity Attack.

## Closure

No row is treated as supported from authored identity or catalog admission.
`scripts/srd-unit-inventory.cjs` is the executable source for the generated
inventory text:

- rows that need runtime work remain `level-3-follow-up-required`, but their
  `ownerEvidence` requirement names the concrete owner and mechanic split;
- Hunter's Lore is `catalog-only/dead-for-now` because the RAW effect is
  disclosure of existing Stat Block facts about a marked target, not a battle
  state change;
- supported rows already covered before this task remain unchanged.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed that feature rows with attack, healing, movement, resource, or
  cantrip consequences need explicit runtime or Character Sheet owners.
- Confirmed that Hunter's Lore is knowledge disclosure and should not duplicate
  Immunity, Resistance, or Vulnerability facts beside the target Stat Block.
- Kept subclass features tied to selected subclass ownership without adding
  PHB+ authored identity or autonomous-control behavior.

Round 2 architecture and connascence pass:

- The strong coupling between row id and owner split is localized in one
  checker map, the same source that generates `srd-unit-inventory.json`.
- No Unit claim was added for missing Surface Units, avoiding claims that would
  reference unknown Unit ids.
- No duplicate runtime state was added; follow-up text names the canonical
  owner expected to derive from existing Surface, CharacterBuild, Stat Block,
  and battle state facts.

## Verification For This Closure

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

MBT is not required because this task changes only coverage/planning artifacts
and does not modify QNT, runtime behavior, catalog admission, or supported
profile evidence.
