# SRDINV16 Recursive Planning Review

Task 185 reviewed the SRDINV12-SRDINV15 authoring closeouts and refreshed the
generated SRD Unit inventory. SRD level-1 inventory is not complete, so this
review keeps the lane open with a concrete character-creation owner-evidence
batch rather than a recursive-only continuation.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-required` rows: 121
- Level-1 `catalog-installed-owner-evidence-present` rows: 19
- Level-1 `catalog-only/dead-for-now` rows: 4
- Level-1 `non-runtime` rows: 12
- Character-creation or progression mechanic rows requiring owner evidence:
  77
- Class-container rows requiring owner evidence: 12
- Class-feature rows requiring owner evidence: 12
- Equipment rows requiring owner evidence: 10
- Mastery rows requiring owner evidence: 4
- Spell Access rows requiring owner evidence: 6

SRDINV12-SRDINV15 closed the expressible level-1 authored-record absence
frontier. The remaining level-1 pressure is now owner-evidence closure:
118 rows name `character-creation-runtime` or `Surface class container plus
character-creation-runtime`, 2 Primary Ability rows name
`shared-algebras/multiclass-prerequisite-algebra`, and Wizard Ritual Adept names
future spell-access/invocation runtime evidence.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Classes/Barbarian.md` for Core Barbarian Traits,
  level-1 and multiclass entry traits, Rage, Unarmored Defense, and Weapon
  Mastery.
- `.references/srd-5.2.1/Classes/Bard.md` for Core Bard Traits, Bardic
  Inspiration, Spellcasting, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Cleric.md` for Core Cleric Traits,
  Spellcasting, Divine Order, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Druid.md` for Core Druid Traits,
  Spellcasting, Druidic, Primal Order, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Fighter.md` for the already-covered Fighter
  owner-evidence baseline and Weapon Mastery comparison.
- `.references/srd-5.2.1/Classes/Monk.md` for Core Monk Traits, Martial Arts,
  and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Paladin.md` for Core Paladin Traits,
  Spellcasting, Weapon Mastery, Lay On Hands closure context, and multiclass
  entry traits.
- `.references/srd-5.2.1/Classes/Ranger.md` for Core Ranger Traits,
  Spellcasting, Favored Enemy, Weapon Mastery, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Rogue.md` for Core Rogue Traits, Expertise,
  Thieves' Cant, Weapon Mastery, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Sorcerer.md` for Core Sorcerer Traits,
  Spellcasting, Innate Sorcery, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Warlock.md` for Core Warlock Traits, Eldritch
  Invocations, Pact Magic, and multiclass entry traits.
- `.references/srd-5.2.1/Classes/Wizard.md` for the already-covered Wizard
  owner-evidence baseline, Primary Ability, multiclass entry traits,
  Spellcasting, Ritual Adept, and Arcane Recovery closure context.

`UBIQUITOUS_LANGUAGE.md` was checked for Class, Character Sheet, Class Feature,
Spell Access, Spell Definition, Spell Slot, Pact Slot, Proficiency Bonus,
Proficiency Level, Weapon Mastery, Multiclassing, Ability Check, Attack Roll,
Saving Throw, Armor Class, and the Character Sheet versus Stat Block ownership
distinction.

## Appended Batch

The next batch is grouped by character-creation evidence boundary:

- `SRDINV17`: close character-creation owner evidence for authored class
  containers, core traits, starting equipment, and multiclass-entry facts.
- `SRDINV18`: close character-creation owner evidence for authored level-1
  class-feature records retained on CharacterBuilds or discovered as choices.
- `SRDINV19`: close character-creation owner evidence for non-Wizard level-1
  Spell Access records without admitting individual Spell Definitions as
  runtime-supported.
- `SRDINV20`: close character-creation owner evidence for non-Fighter level-1
  Weapon Mastery choices while leaving mastery property execution separate.
- `SRDINV21`: recursive planning review after the owner-evidence batch lands.

This deliberately does not start spell Unit Surface blockers, authored
executable spell runtime, or battle-runtime MBT planning. Those remain
downstream of the next recursive review after the level-1 character-creation
evidence denominator has been reduced and the remaining non-character-creation
evidence rows are explicit.

## /simplify Convergence

- Round 1: selected character-creation owner-evidence closure because the
  refreshed level-1 denominator has no missing class containers and no
  missing authored records, but still has 121 owner-evidence-required rows.
- Round 2: split the batch by evidence boundary: class container/source facts,
  class features, Spell Access, and Weapon Mastery. This keeps individual Spell
  Definition pressure and mastery property execution from being admitted by
  character-creation evidence work.
- Round 3: no important changes found. The two shared-algebra Primary Ability
  rows and Wizard Ritual Adept remain visible for SRDINV21 instead of being
  hidden inside the character-creation batch.
