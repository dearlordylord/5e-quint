# Core Trait Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:46-49`: class armor training is recorded on the character sheet from class source facts.
- `.references/srd-5.2.1/Character-Creation.md:75-79`: class proficiencies are recorded from the class description and tied to the level-1 Proficiency Bonus.
- `.references/srd-5.2.1/Character-Creation.md:249-287`: Saving Throw, Skill, Hit Point, Hit Die, Armor Class, and attack-number sheet projections are filled from proficiency, ability, class, and equipment facts.
- `.references/srd-5.2.1/Character-Creation.md:395-419`: multiclass prerequisites use the Primary Ability of the new class and all current classes, and multiclass proficiencies are separately limited.
- `.references/srd-5.2.1/Classes/Barbarian.md:3-12`: Core Barbarian Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Bard.md:3-13`: Core Bard Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Cleric.md:3-12`: Core Cleric Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Druid.md:3-13`: Core Druid Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Fighter.md:3-12`: Core Fighter Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Monk.md:3-13`: Core Monk Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Paladin.md:3-12`: Core Paladin Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Ranger.md:3-12`: Core Ranger Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Rogue.md:3-13`: Core Rogue Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Sorcerer.md:3-12`: Core Sorcerer Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Warlock.md:3-12`: Core Warlock Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `.references/srd-5.2.1/Classes/Wizard.md:3-12`: Core Wizard Traits rows for Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, and Armor Training.
- `UBIQUITOUS_LANGUAGE.md:53-68`: checked Proficiency, Saving Throw, Ability, and Skill terms.
- `UBIQUITOUS_LANGUAGE.md:70-77`: checked Hit Points and Hit Die terms.
- `UBIQUITOUS_LANGUAGE.md:173`: checked Armor Category terminology.
- `UBIQUITOUS_LANGUAGE.md:199`: checked Weapon Property terminology for property-filtered weapon proficiencies.

## Current Generated State

- Inventory row family: `core-trait`.
- Unit ids: the 12 installed class container Units, `class_barbarian`, `class_bard`, `class_cleric`, `class_druid`, `class_fighter`, `class_monk`, `class_paladin`, `class_ranger`, `class_rogue`, `class_sorcerer`, `class_warlock`, and `class_wizard`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/character-creation-owner-evidence.json`
  - `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
- Row counts by trait:
  - Armor Training: `12`
  - Hit Point Die: `12`
  - Primary Ability: `12`
  - Saving Throw Proficiencies: `12`
  - Skill Proficiencies: `12`
  - Tool Proficiencies: `4`
  - Weapon Proficiencies: `12`
- Current states:
  - `surface.state`: `current-surface-can-express-source-facts` for all 76 rows
  - `authoredContent.state`: `authored-record-present` for all 76 rows
  - `catalogAdmission.state`: `installed` for all 76 rows
  - `characterCreationOwnership.state`: `class-container-owned-source-fact` for all 76 rows
  - `unit-matrix claim.tag`: `unsupported-profile` for the 12 class container Units
  - `unit-matrix profiles`: `[]` for the 12 class container Units
  - `finalDisposition`: `catalog-installed-owner-evidence-present` for all 76 rows
  - `battleReadinessStatus`: `accepted` for all 76 rows
- Owner evidence split:
  - 64 non-Primary-Ability rows have `character-creation-runtime` owner evidence.
  - 12 Primary Ability rows have `shared-algebras/multiclass-prerequisite-algebra` owner evidence.

## Owner Classification

- Armor, weapon, and tool proficiencies:
  - `packageOwner`: `@dnd/character-creation-runtime`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `readClassCreationFacts` reads `weaponProficiencies`, `toolProficiencies`, and `armorTraining` from the installed Surface class record. `discoverClassGrantedHoles` and `classToolProficiencyChoiceHoles` expose class skill/tool choice holes where RAW gives a choice. `CHARACTER_CREATION_SUPPORT_PROFILE` gates supported proficiency choices. `characterBuildProficiencies` and `characterBuildArmorTraining` derive finalized build projections from the selected class source record plus selected proficiency choices.
- Hit Point Die:
  - `packageOwner`: `@dnd/character-creation-runtime`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `readClassCreationFacts` reads `hitPointDie`; `characterBuildHitPoints` derives the level-1 maximum and the per-class Hit Die pool from the selected progression and class source facts.
- Saving Throw and skill proficiencies:
  - `packageOwner`: `@dnd/character-creation-runtime`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `readClassCreationFacts` reads `savingThrowProficiencies` and `skillProficiencyChoice`; `discoverClassGrantedHoles` creates the class skill choice hole; `characterBuildProficiencies` derives the finalized Saving Throw and Skill proficiency projections from the class source record, background source facts, and selected class choices.
- Primary Ability and shared-algebra prerequisite facts:
  - `packageOwner`: `@dnd/shared-algebras`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `multiclassPrerequisiteFromPrimaryAbilities` and `MULTICLASS_PREREQUISITES` derive multiclass prerequisite facts from installed SRD class container Primary Ability expressions. `shared-algebra-owner-evidence.json` records deterministic TypeScript tests and Quint examples for this boundary.

## Decision

Keep owner-evidence-only closure for all `core-trait` rows.

Do not create a grouped profile such as `character-creation.class-core-trait-projection`. The class source record is already the canonical structured source for these facts, and each executable consequence is either derived by character-creation finalization/projection or by shared multiclass prerequisite algebra. A grouped profile would restate the same class facts beside the class record and the existing owner evidence, making divergent profile/source combinations representable without adding a new parser, support gate, finalization behavior, checker, or runtime consequence.

Decision by trait family:

- Armor, weapon, and tool proficiencies: owner-evidence-only through class source projection, supported choice holes, support-gated choices, and finalized `CharacterBuild` proficiency or armor-training derivation.
- Hit Point Die: owner-evidence-only through class source projection and finalized Hit Point/Hit Die derivation.
- Primary Ability: owner-evidence-only through the class source record and shared-algebra multiclass prerequisite derivation.
- Saving Throw proficiencies: owner-evidence-only through class source projection and finalized `CharacterBuild` proficiency derivation.
- Skill proficiencies: owner-evidence-only through class source projection, supported class skill choice holes, and finalized `CharacterBuild` proficiency derivation.
- Shared-algebra prerequisite facts: owner-evidence-only through `@dnd/shared-algebras`; these facts should not be duplicated in a character-creation profile.

Strict-report wording to preserve: core traits are installed class source facts with owner evidence at the actual execution boundary. Empty class Unit profile lists are intentional because no core-trait row is a standalone executable Unit profile.

## Promotion Gate

No new profile promotion is justified.

The executable boundaries already exist and are accounted for without duplicating source facts:

- parser/admission path: `readClassCreationFacts` reads Primary Ability, Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, and Armor Training from installed Surface class Units.
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions` admits the 12 level-1 class progressions, and `CHARACTER_CREATION_SUPPORT_PROFILE.unitOptionIdsByChoiceKey` gates supported class skill, class tool, and proficiency-choice options.
- hole/fill boundary: `discoverClassGrantedHoles` creates class skill choice holes for every supported class; `classToolProficiencyChoiceHoles` creates tool choice holes for Bard and Monk; fixed tool grants such as Druid Herbalism Kit and Rogue Thieves' Tools do not require a choice hole.
- finalization behavior: `executableSupportSelections` rejects unsupported finalized choices, and `buildCharacterBuild` retains the selected class progression for downstream projection.
- `CharacterBuild` projection: `characterBuildHitPoints`, `characterBuildProficiencies`, and `characterBuildArmorTraining` derive Hit Dice, Saving Throw proficiencies, skill choices, weapon categories/property filters, tool proficiencies, and armor training from the selected class source facts and choices.
- shared-algebra projection: `multiclassPrerequisiteFromPrimaryAbilities` derives all Primary Ability prerequisite operators from class source facts; `MULTICLASS_PREREQUISITES` builds the SRD prerequisite table from installed class containers.
- owner evidence: `character-creation-owner-evidence.json` covers the 64 non-Primary-Ability core-trait rows, and `shared-algebra-owner-evidence.json` covers the 12 Primary Ability rows.

Because those boundaries already cover the row family, no Unit claim, support profile, evidence manifest, runtime behavior, or generated coverage artifact should change in this task.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`, `packages/surface/src/surface/character-creation-readers.ts`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, `packages/character-creation-runtime/src/index.test.ts`, `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts`, and `packages/shared-algebras/src/multiclass-prerequisite-algebra.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
