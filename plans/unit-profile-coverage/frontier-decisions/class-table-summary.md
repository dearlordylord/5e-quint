# Class Table Summary Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:8-19`: character creation starts by choosing a Class and then filling in the remaining character sheet details from the chosen sources.
- `.references/srd-5.2.1/Character-Creation.md:77-79`: class descriptions provide proficiencies, and their features tables show the level-1 Proficiency Bonus.
- `.references/srd-5.2.1/Character-Creation.md:329-336`: gaining a level tells the player to look at the class features table, record newly gained class features, and adjust Proficiency Bonus from the class features table.
- `.references/srd-5.2.1/Classes/Barbarian.md:35`: Barbarian level-1 class features table row.
- `.references/srd-5.2.1/Classes/Bard.md:36`: Bard level-1 class features table row.
- `.references/srd-5.2.1/Classes/Cleric.md:35`: Cleric level-1 class features table row.
- `.references/srd-5.2.1/Classes/Druid.md:32`: Druid level-1 class features table row.
- `.references/srd-5.2.1/Classes/Fighter.md:31`: Fighter level-1 class features table row.
- `.references/srd-5.2.1/Classes/Monk.md:32`: Monk level-1 class features table row.
- `.references/srd-5.2.1/Classes/Paladin.md:35`: Paladin level-1 class features table row.
- `.references/srd-5.2.1/Classes/Ranger.md:35`: Ranger level-1 class features table row.
- `.references/srd-5.2.1/Classes/Rogue.md:36`: Rogue level-1 class features table row.
- `.references/srd-5.2.1/Classes/Sorcerer.md:35`: Sorcerer level-1 class features table row.
- `.references/srd-5.2.1/Classes/Warlock.md:35`: Warlock level-1 class features table row.
- `.references/srd-5.2.1/Classes/Wizard.md:35`: Wizard level-1 class features table row.
- `UBIQUITOUS_LANGUAGE.md:321-337`: checked Character Sheet, Class, Ability Score Improvement, and Multiclassing terms.
- `packages/character-creation-runtime/VOCABULARY.md:8-24`: checked Character Draft and Character Build terms.
- `packages/character-creation-runtime/VOCABULARY.md:53-70`: checked Character Progression, Support Profile, and Finalization Gate terms.

## Current Generated State

- Inventory row family: `class-table-summary`.
- Row ids: all 12 `srd521:classes/<class>:level-1:class-table-summary:<class>_level_1_feature_table_row` rows.
- Unit ids: the 12 installed class container Units, `class_barbarian`, `class_bard`, `class_cleric`, `class_druid`, `class_fighter`, `class_monk`, `class_paladin`, `class_ranger`, `class_rogue`, `class_sorcerer`, `class_warlock`, and `class_wizard`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
  - `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
  - `scripts/srd-unit-inventory.cjs`
- Current states:
  - `surface.state`: `outside-surface-runtime-mechanics` for all 12 rows.
  - `authoredContent.state`: `authored-record-present` for all 12 rows via the installed class container Unit.
  - `catalogAdmission.state`: `installed` for all 12 class container Units.
  - `characterCreationOwnership.state`: `non-runtime-table-summary` for all 12 rows.
  - `characterCreationOwnership.owner`: `not-applicable` for all 12 rows.
  - `unit-matrix claim.tag`: `unsupported-profile` for the 12 class container Units.
  - `unit-matrix profiles`: `[]` for the 12 class container Units.
  - `finalDisposition`: `non-runtime` for all 12 rows.
  - `battleReadinessStatus`: `accepted-no-battle-effect` for all 12 rows.
  - row count: `12`.

## Owner Classification

- `packageOwner`: `null`.
- `closureKind`: `owner-evidence-only` through the generated `non-runtime-table-summary` taxonomy.
- Owner notes: no runtime or character-creation package owns the table row as a standalone executable fact. The class table row is a source/navigation summary that points to facts already owned by narrower generated rows: class container, core trait, class feature, spell-access, mastery, equipment, and multiclass-entry rows. `scripts/srd-unit-inventory.cjs` currently encodes that taxonomy with `characterCreationOwnership.state: "non-runtime-table-summary"` and the evidence boundary "The feature table summarizes level progression; narrower class trait, feature, spell-access, mastery, and equipment rows own executable evidence."

## Decision

Keep explicit non-runtime table-summary closure for `class-table-summary`.

Do not create a first-class support profile or owner-evidence manifest entry for these 12 rows. A class table row restates level, Proficiency Bonus, feature names, and class-specific per-level columns so readers can navigate progression. Its executable consequences are already carried by narrower source facts:

- class selection and retained class Unit refs are covered by `class-container`;
- Proficiency Bonus, Hit Dice, armor, weapon, tool, Saving Throw, skill, and Primary Ability facts are covered by `core-trait`;
- named level-1 features are covered by individual `class-feature-grant`, `spell-access`, and `mastery-pressure` rows;
- starting equipment and multiclass entry facts are covered by their own row families.

Adding a profile would duplicate those narrower facts beside the table row and make mismatched table/profile states representable without adding a parser, support gate, hole/fill boundary, finalization behavior, `CharacterBuild` projection, or runtime API.

Strict-report wording to preserve: class table summary rows are source/navigation summaries of class progression. They stay `non-runtime` and `accepted-no-battle-effect`; empty class Unit profile lists remain intentional because all executable consequences are owned by narrower class container, core trait, feature, spell-access, mastery, equipment, or multiclass-entry rows. They should not appear as open profile-accounting or missing profile work.

Taxonomy recommendation: keep `rowKind: "class-table-summary"` mapped to `characterCreationOwnership.state: "non-runtime-table-summary"`, `finalDisposition: "non-runtime"`, and `battleReadinessStatus: "accepted-no-battle-effect"`. Do not add a new status label unless a checker consumes it and it changes strict-report behavior.

## Promotion Gate

No profile promotion is justified.

The relevant boundaries already exist elsewhere:

- parser/admission path: installed Surface class records are the authored source for class facts, while the table row itself is not a separate source record.
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions` admits the level-1 class progressions through class container Units, not through table-summary rows.
- hole/fill and finalization boundaries: class choices, proficiencies, equipment, spell access, and feature choices are discovered and finalized from the class container source facts and narrower feature/source rows.
- `CharacterBuild` projection: `characterBuildUnitRefs` and the character-creation projections retain selected class, feature, spellcasting, equipment, proficiency, armor-training, and Hit Die facts without storing a copy of the table row.
- report taxonomy: `scripts/srd-unit-inventory.cjs` already distinguishes `non-runtime-table-summary` rows from class-container-owned source facts and from battle/runtime support pressure.

Because those boundaries already cover the consequences named by the table rows, no Unit claim, support profile, evidence manifest, runtime behavior, generated coverage artifact, or split implementation task should change in this task.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `packages/character-creation-runtime/VOCABULARY.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/level1-full-support.json`, `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`, `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`, `scripts/srd-unit-inventory.cjs`, `packages/surface/src/surface/character-creation-readers.ts`, `packages/character-creation-runtime/src/support-gates.ts`, and `packages/character-creation-runtime/src/finalization.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
