# SRDINV21 Recursive Planning Review

Task 190 reviewed SRDINV17-SRDINV20 plus SRDINV18A and refreshed the generated
SRD Unit inventory. SRD level-1 inventory is not complete, so this review keeps
the lane open with a concrete promoted-runtime closure batch rather than a
recursive-only continuation.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-present` rows: 127
- Level-1 `catalog-installed-owner-evidence-required` rows: 13
- Level-1 `catalog-only/dead-for-now` rows: 4
- Level-1 `non-runtime` rows: 12
- Character-creation or progression mechanic rows: 100
- Class-feature rows: 20
- Spell Access rows: 7

SRDINV17-SRDINV20 and SRDINV18A closed the character-creation owner-evidence
frontier. The remaining level-1 pressure is now outside the
character-creation boundary:

- 12 Primary Ability rows require
  `shared-algebras/multiclass-prerequisite-algebra` owner evidence.
- Wizard Ritual Adept requires spell-access/invocation runtime owner evidence.
- Barbarian and Monk Unarmored Defense require character-sheet Armor Class
  derivation runtime evidence.
- Wizard Arcane Recovery requires character-sheet rest and Spell Slot recovery
  runtime evidence.
- Paladin Lay On Hands requires character-sheet healing resource action runtime
  evidence.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Character-Creation.md` for class Primary Ability,
  ability score assignment, multiclass prerequisites, multiclass Hit Dice,
  multiclass Spell Slots, and the rule that only one Armor Class formula is
  used at a time.
- `.references/srd-5.2.1/Playing-the-Game.md` for Armor Class as an attack-roll
  target number and the character-sheet versus stat-block AC distinction.
- `.references/srd-5.2.1/Rules-Glossary.md` for Armor Class, Short Rest, Long
  Rest, Hit Dice, Bonus Action, Poisoned, and rest benefits.
- `.references/srd-5.2.1/Classes/Barbarian.md` for Barbarian Primary Ability
  and Unarmored Defense.
- `.references/srd-5.2.1/Classes/Monk.md` for Monk Primary Ability and
  Unarmored Defense.
- `.references/srd-5.2.1/Classes/Paladin.md` for Paladin Primary Ability, Lay
  On Hands, Spellcasting slot recovery, and Weapon Mastery context.
- `.references/srd-5.2.1/Classes/Wizard.md` for Wizard Primary Ability,
  Spellcasting, Spellbook, Ritual Adept, and Arcane Recovery.
- The remaining class Core Traits tables for the other Primary Ability rows.

`UBIQUITOUS_LANGUAGE.md` was checked for Primary Ability-adjacent terms through
Ability Score and Multiclassing, plus Character Sheet, Stat Block, Armor Class,
Class Feature, Spell Access, Spell Definition, Spell Slot, Pact Slot, Short
Rest, Long Rest, Hit Die, Pool, Spend, Grant, and Refund.

## Appended Batch

The next batch is grouped by promoted runtime owner:

- `SRDINV22`: close the 12 Primary Ability rows through shared multiclass
  prerequisite algebra evidence. Source facts remain class-container-owned.
- `SRDINV23`: promote character-sheet Armor Class formula derivation for base
  AC and Barbarian/Monk Unarmored Defense, including the multiclass
  one-formula-at-a-time rule.
- `SRDINV24`: promote character-sheet rest and Spell Slot recovery for Short
  Rest, Long Rest, and Wizard Arcane Recovery, while keeping Spell Slot, Pact
  Slot, Hit Die, and feature recharge facts distinct.
- `SRDINV25`: promote Lay On Hands as a character-sheet healing resource action
  with one pool for HP restoration and Poisoned-condition removal.
- `SRDINV26`: close Wizard Ritual Adept through the promoted
  spell-access/invocation runtime boundary over spellbook Spell Access and
  ritual-tagged Spell Definitions.
- `SRDINV27`: recursive planning review after the promoted-runtime batch lands.

Spell Unit Surface blockers and authored executable spell runtime follow-ups
remain counted in the generated inventory, but SRDINV21 does not pull them
ahead of the remaining level-1 rows.

## reviewer loop Convergence

- Round 1: selected the next batch from the refreshed level-1 rows rather than
  the larger spell-pressure backlog. This keeps SRDINV22-SRDINV26 tied to the
  remaining owner-evidence-required and catalog-only/dead-for-now level-1 rows.
- Round 2: split the character-sheet work by runtime invariant: Armor Class
  formula selection, rest/Spell Slot recovery, and Lay On Hands pool spend are
  separate domains with different state and verification needs.
- Round 3: no important changes found. The batch remains concrete and
  multi-task, and SRDINV27 is the only recursive continuation.
