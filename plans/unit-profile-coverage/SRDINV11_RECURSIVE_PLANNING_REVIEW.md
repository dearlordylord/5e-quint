# SRDINV11 Recursive Planning Review

Task 180 reviewed the SRDINV8-SRDINV10 closeouts and refreshed the generated
SRD Unit inventory. SRD level-1 inventory is not complete, so this review keeps
the lane open with a concrete authoring batch rather than a recursive-only
continuation.

## Inventory State

Generated inventory metrics from `plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 8
- Level-1 `needs-surface-widening` rows: 0
- All-row `needs-surface-widening` rows: 33
- Level-1 `missing-authored-record` rows: 96
- Authored executable spell follow-up rows: 70

SRDINV8-SRDINV10 moved the level-1 class-container, Spell Access, and
class-feature blockers out of active Surface-widening state. The remaining
level-1 pressure is now dominated by authored SRD record absence and
character-creation owner-evidence requirements, not by missing Surface source
shapes.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Classes/Bard.md` for Bard class traits, Bardic
  Inspiration, and Bard Spellcasting.
- `.references/srd-5.2.1/Classes/Cleric.md` for Cleric class traits,
  Spellcasting, and Divine Order.
- `.references/srd-5.2.1/Classes/Druid.md` for Druid class traits,
  Spellcasting, Druidic, and Primal Order.
- `.references/srd-5.2.1/Classes/Monk.md` for Monk class traits and Martial
  Arts.
- `.references/srd-5.2.1/Classes/Paladin.md` for Paladin class traits,
  Spellcasting, Lay On Hands closure context, and Weapon Mastery.
- `.references/srd-5.2.1/Classes/Ranger.md` for Ranger class traits,
  Spellcasting, Favored Enemy, and Weapon Mastery.
- `.references/srd-5.2.1/Classes/Rogue.md` for Rogue class traits, Expertise,
  Thieves' Cant, and Weapon Mastery.
- `.references/srd-5.2.1/Classes/Sorcerer.md` for Sorcerer class traits,
  Spellcasting, and Innate Sorcery.
- `.references/srd-5.2.1/Classes/Warlock.md` for Eldritch Invocations and Pact
  Magic context.

`UBIQUITOUS_LANGUAGE.md` was checked for Class, Character Sheet, Class Feature,
Spell Access, Spell Definition, Spell Slot, Pact Slot, Pool, Spend,
Proficiency Bonus, Proficiency Level, Weapon Mastery, Ability Check, Attack
Roll, Saving Throw, Reaction, and Concentration.

## Appended Batch

The next batch is grouped by authoring boundary:

- `SRDINV12`: author expressible level-1 class containers for Bard, Cleric,
  Druid, Monk, Paladin, Ranger, Rogue, and Sorcerer.
- `SRDINV13`: author expressible level-1 Spell Access records for Bard, Cleric,
  Druid, Paladin, Ranger, and Sorcerer.
- `SRDINV14`: author expressible level-1 class feature records for Bardic
  Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored
  Enemy, Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocations.
- `SRDINV15`: author level-1 Weapon Mastery records for Barbarian, Paladin,
  Ranger, and Rogue. Fighter Weapon Mastery already has owner evidence.
- `SRDINV16`: recursive planning review after the authoring batch lands.

This deliberately does not start spell runtime, spell Surface blocker work, or
MBT planning. Those remain downstream of the next recursive review, once the
expressible level-1 authoring backlog has either landed or exposed sharper
typed gaps.

## reviewer loop Convergence

- Round 1: selected authoring records made expressible by SRDINV8-SRDINV10
  instead of jumping to spell runtime. This keeps the next tasks aligned with
  the refreshed level-1 denominator and avoids treating catalog admission as
  behavior support.
- Round 2: split class containers, Spell Access, class features, and Weapon
  Mastery into separate tasks so class-owned creation facts remain derived from
  class containers and individual Spell Definitions do not get admitted by
  class Spell Access authoring.
- Round 3: no important changes found. Remaining active Surface-widening rows
  are spell Unit pressure rows outside level 1; they are counted for later
  planning but are not the immediate level-1 authoring frontier.
