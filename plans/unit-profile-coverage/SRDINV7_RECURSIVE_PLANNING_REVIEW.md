# SRDINV7 Recursive Planning Review

Task 176 reviewed the SRDINV1A-SRDINV6 closeouts and the generated SRD Unit
inventory. SRD level-1 inventory is not complete, so this review keeps the lane
open with a concrete Surface-widening batch rather than a recursive-only
continuation.

## Inventory State

Generated inventory metrics from `plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `needs-surface-widening` rows: 25
- All-row `needs-surface-widening` rows: 58
- Authored executable spell follow-up rows: 77

SRDINV1A-SRDINV6 established that the remaining level-1 pressure is not one
homogeneous backlog. Character-creation source facts are class-container-owned,
table summaries are non-runtime, four nonspell rows are explicit
catalog-only/dead-for-now closures, and the active executable frontier is now
blocked primarily by named Surface constructs.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Classes/Bard.md` for Musical Instrument proficiency,
  Bardic Inspiration, and Bard Spellcasting.
- `.references/srd-5.2.1/Classes/Cleric.md` for non-Wizard prepared
  Spellcasting and Divine Order choice branches.
- `.references/srd-5.2.1/Classes/Druid.md` for Herbalism Kit proficiency,
  Druid Spellcasting, Druidic, and Primal Order choice branches.
- `.references/srd-5.2.1/Classes/Monk.md` for tool proficiency,
  property-filtered Martial weapon proficiency, and Martial Arts.
- `.references/srd-5.2.1/Classes/Paladin.md` for prepared Spellcasting without
  level-1 cantrips.
- `.references/srd-5.2.1/Classes/Ranger.md` for mixed multiclass proficiency,
  prepared Spellcasting, Favored Enemy, and Weapon Mastery.
- `.references/srd-5.2.1/Classes/Rogue.md` for property-filtered Martial weapon
  proficiency, Expertise, Thieves' Cant, and Weapon Mastery.
- `.references/srd-5.2.1/Classes/Sorcerer.md` for Sorcerer Spellcasting and
  Innate Sorcery.
- `.references/srd-5.2.1/Classes/Warlock.md` for Eldritch Invocations and Pact
  Magic.

`UBIQUITOUS_LANGUAGE.md` was checked for Class, Spell Access, Spell Definition,
Spell Slot, Pact Slot, Pool, Spend, Proficiency Bonus, Proficiency Level,
Weapon Mastery, Ability Check, Attack Roll, Saving Throw, Reaction, Armor
Class, and Concentration.

## Appended Batch

The next batch is grouped by Surface blocker family:

- `SRDINV8`: widen class-container proficiency and multiclass-entry Surface
  facts, covering Bard/Druid tool choices, Monk/Rogue tool and property-filtered
  Martial weapon proficiencies, and Ranger mixed fixed-plus-choice multiclass
  proficiencies.
- `SRDINV9`: widen non-Wizard spell-access Surface facts, covering list-prepared
  full casters, prepared half casters without level-1 cantrips, and owning the
  shared Warlock Pact Magic/Pact Slot source shape.
- `SRDINV10`: widen level-1 class-feature Surface mechanics after SRDINV9,
  covering the named class-feature blockers from SRDINV3/SRDINV6 and consuming
  SRDINV9's Pact Magic source shape for any class-feature projections.
- `SRDINV11`: recursive planning review after the three widening families land.

This deliberately does not start spell runtime, authored Surface records, or MBT
work. Those remain downstream of the next recursive review, once the first
Surface blocker families have either landed or produced sharper gaps.

## reviewer loop Convergence

- Round 1: kept the batch at blocker-family granularity instead of one task per
  class or one generic Surface gate. This weakens coupling between unrelated
  Surface constructs while still giving Ralph several concrete tasks.
- Round 2: moved the SRDINV7 closeout and SRDINV8-SRDINV11 row groups into the
  generated inventory source so `SRD_UNIT_INVENTORY.md` and
  `srd-unit-inventory.json` cannot drift from the active plan.
- Round 3: no important changes found. The next batch does not duplicate
  inventory state; it derives generated row groups from existing Surface blocker
  facts and leaves source facts in the generated inventory/report.
