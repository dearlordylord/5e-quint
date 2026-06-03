# Multiclass Entry Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:329-337`: gaining a level chooses a class, adjusts Hit Points and Hit Point Dice, records new class features, and adjusts Proficiency Bonus and ability-derived sheet numbers.
- `.references/srd-5.2.1/Character-Creation.md:395-401`: multiclassing allows gaining a level in a new class and requires ability score prerequisites for the new class and all current classes.
- `.references/srd-5.2.1/Character-Creation.md:407-419`: multiclass Hit Points, Hit Dice, Proficiency Bonus, and reduced starting proficiencies are handled through the level-gain and class-description rules.
- `.references/srd-5.2.1/Character-Creation.md:421-458`: multiclass class features, Armor Class alternatives, Extra Attack, Spellcasting, and Pact Magic are class-feature or spellcasting rules after the class entry is admitted.
- `.references/srd-5.2.1/Classes/Barbarian.md:22-26`: Barbarian multiclass entry grants Hit Point Die, Martial weapon proficiency, Shield training, and level-1 feature grants.
- `.references/srd-5.2.1/Classes/Bard.md:23-27`: Bard multiclass entry grants Hit Point Die, one skill, one Musical Instrument, Light armor training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Cleric.md:22-26`: Cleric multiclass entry grants Hit Point Die, Light and Medium armor plus Shield training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Druid.md:23-27`: Druid multiclass entry grants Hit Point Die, Light armor plus Shield training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Fighter.md:22-26`: Fighter multiclass entry grants Hit Point Die, Martial weapon proficiency, Light and Medium armor plus Shield training, and level-1 feature grants.
- `.references/srd-5.2.1/Classes/Monk.md:23-27`: Monk multiclass entry grants Hit Point Die and level-1 feature grants.
- `.references/srd-5.2.1/Classes/Paladin.md:22-26`: Paladin multiclass entry grants Hit Point Die, Martial weapon proficiency, Light and Medium armor plus Shield training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Ranger.md:22-26`: Ranger multiclass entry grants Hit Point Die, Martial weapon proficiency, one Ranger-list skill, Light and Medium armor plus Shield training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Rogue.md:23-27`: Rogue multiclass entry grants Hit Point Die, one Rogue-list skill, Thieves' Tools, Light armor training, and level-1 feature grants.
- `.references/srd-5.2.1/Classes/Sorcerer.md:22-26`: Sorcerer multiclass entry grants Hit Point Die, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Warlock.md:22-26`: Warlock multiclass entry grants Hit Point Die, Light armor training, level-1 feature grants, and the multiclass spell slot pointer.
- `.references/srd-5.2.1/Classes/Wizard.md:22-26`: Wizard multiclass entry grants Hit Point Die, level-1 feature grants, and the multiclass spell slot pointer.
- `UBIQUITOUS_LANGUAGE.md:53-68`: checked Proficiency, Ability Score, Ability, and Skill terms.
- `UBIQUITOUS_LANGUAGE.md:70-77`: checked Hit Points and Hit Die terms.
- `UBIQUITOUS_LANGUAGE.md:321-337`: checked Character Sheet, Class, and Multiclassing terms.
- `packages/character-creation-runtime/VOCABULARY.md:8-24`: checked Character Draft, Character Build, and Creation Hole terms.
- `packages/character-creation-runtime/VOCABULARY.md:53-80`: checked Character Progression, Support Profile, Finalization Gate, Multiclass Prerequisite Check, and Source-shaped finalization check terms.

## Current Generated State

- Inventory row family: `multiclass-entry`.
- Row ids: all 12 `srd521:classes/<class>:level-1:multiclass-entry:<class>_multiclass_entry_traits` rows.
- Unit ids: the 12 installed class container Units, `class_barbarian`, `class_bard`, `class_cleric`, `class_druid`, `class_fighter`, `class_monk`, `class_paladin`, `class_ranger`, `class_rogue`, `class_sorcerer`, `class_warlock`, and `class_wizard`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/character-creation-owner-evidence.json`
  - `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `packages/surface/content/class_*.json`
  - `packages/surface/src/surface/character-creation-readers.ts`
  - `packages/character-creation-runtime/src/discovery.ts`
  - `packages/character-creation-runtime/src/support-gates.ts`
  - `packages/character-creation-runtime/src/finalization.ts`
  - `packages/character-creation-runtime/src/index.test.ts`
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts`
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.test.ts`
  - `packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`
- Current states:
  - `surface.state`: `current-surface-can-express-source-facts` for all 12 rows.
  - `authoredContent.state`: `authored-record-present` for all 12 rows.
  - `catalogAdmission.state`: `installed` for all 12 rows.
  - `characterCreationOwnership.state`: `class-container-owned-source-fact` for all 12 rows.
  - `unit-matrix claim.tag`: `unsupported-profile` for the 12 class container Units.
  - `unit-matrix profiles`: `[]` for the 12 class container Units.
  - `finalDisposition`: `catalog-installed-owner-evidence-present` for all 12 rows.
  - `battleReadinessStatus`: `accepted` for all 12 rows.
  - row count: `12`.
- Owner evidence split:
  - `character-creation-owner-evidence.json` records row-level discovery, fill, finalization, build projection, and package-test evidence for all 12 multiclass-entry rows.
  - `shared-algebra-owner-evidence.json` records prerequisite-table evidence for Primary Ability source facts used by multiclass checks.

## Owner Classification

- Prerequisites:
  - `packageOwner`: `@dnd/shared-algebras`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `readClassCreationFacts` reads class `primaryAbilities` from installed Surface class records. `multiclassPrerequisiteFromPrimaryAbilities`, `MULTICLASS_PREREQUISITES`, `meetsMulticlassPrerequisite`, and `canMulticlass` derive the SRD threshold-13 prerequisite checks for the new class and all current classes. The shared-algebra owner evidence records deterministic TypeScript tests and Quint examples for this boundary.
- Multiclass entry grants:
  - `packageOwner`: `@dnd/character-creation-runtime`.
  - `closureKind`: `owner-evidence-only`.
  - Owner notes: `readClassCreationFacts` reads `multiclassProficiencies`, Hit Point Die, armor training, and feature grants from the installed Surface class record. `discoverAdditionalClassGrantedHoles` exposes post-start feature and multiclass proficiency holes. `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions` admits supported post-start class progressions, and `unitOptionIdsByChoiceKey` gates Bard, Ranger, and Rogue multiclass proficiency choices. `executableSupportSelections` and the source-shaped finalization checks keep finalized drafts inside the supported progression and choice boundary. `characterBuildHitPoints`, `characterBuildProficiencies`, `characterBuildArmorTraining`, and `characterBuildFeatureUnitIds` expose projections from the finalized `CharacterBuild` plus the same class source record.

## Decision

Keep owner-evidence-only closure for `multiclass-entry`.

Decision by rule part:

- Prerequisites: keep owner-evidence-only through `@dnd/shared-algebras`. A first-class character-creation or Unit profile for prerequisite rows would duplicate the class Primary Ability facts and the shared-algebra prerequisite table already derived from the installed class records.
- Multiclass entry grants: keep owner-evidence-only through `@dnd/character-creation-runtime`. The executable consequence is already represented by Character Progression admission, multiclass proficiency holes, support-gated fills, finalization, and `CharacterBuild` projection. A new Unit profile would restate `multiclassProficiencies`, Hit Point Die, armor training, and feature refs beside the class source record and existing owner evidence.

Do not create first-class profiles such as `character-creation.multiclass-entry`, `character-creation.multiclass-proficiency-grants`, or `shared-algebras.multiclass-prerequisites`. The existing owner boundaries already carry the supported behavior without making divergent source/profile combinations representable.

Strict-report wording to preserve: multiclass-entry rows are installed class source facts with split owner evidence. `@dnd/shared-algebras` derives and tests the SRD prerequisite table from class Primary Ability facts, while `@dnd/character-creation-runtime` admits supported post-start Character Progression entries, exposes and fills multiclass proficiency holes, finalizes the advancement, and exposes `CharacterBuild` projections for Hit Dice, proficiencies, armor training, and level-1 feature refs from the finalized build plus class source facts. Empty class Unit profile lists remain intentional because multiclass entry is a progression/finalization boundary, not standalone battle/runtime Unit behavior.

## Promotion Gate

No new profile promotion is justified.

The executable boundaries already exist and are accounted for without duplicating source facts:

- parser/admission path: Surface class records carry `primaryAbilities`, `hitPointDie`, `multiclassProficiencies`, `armorTraining`, and `featureGrants`; `readClassCreationFacts` projects those facts for downstream owners.
- shared-algebra support boundary: `multiclassPrerequisiteFromPrimaryAbilities`, `MULTICLASS_PREREQUISITES`, `meetsMulticlassPrerequisite`, and `canMulticlass` derive and evaluate prerequisite checks from installed class source facts.
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions` admits supported level-2 multiclass progressions, and `unitOptionIdsByChoiceKey` gates supported multiclass skill and tool choices for Bard, Ranger, and Rogue.
- hole/fill boundary: `discoverAdditionalClassGrantedHoles` and finalization's `multiclassProficiencyChoiceHoles` derive the required post-start choice holes from each new class's source facts.
- finalization behavior: `executableSupportSelections` and source-shaped finalization checks reject unsupported completed drafts before a `CharacterBuild` is produced.
- `CharacterBuild` projection: `characterBuildHitPoints`, `characterBuildProficiencies`, `characterBuildArmorTraining`, and `characterBuildFeatureUnitIds` derive multiclass Hit Dice, fixed and chosen proficiencies, armor training, and level-1 feature refs from the finalized progression plus class source facts.
- owner evidence: `character-creation-owner-evidence.json` covers all 12 multiclass-entry rows, and `shared-algebra-owner-evidence.json` covers the prerequisite derivation source facts.

Because those boundaries already cover the row family, no Unit claim, Unit profile, evidence manifest, runtime behavior, generated coverage artifact, or split implementation task should change in this task.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `packages/character-creation-runtime/VOCABULARY.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`, `plans/unit-profile-coverage/level1-full-support.json`, `packages/surface/content/class_*.json`, `packages/surface/src/surface/character-creation-readers.ts`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, `packages/character-creation-runtime/src/index.test.ts`, `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts`, `packages/shared-algebras/src/multiclass-prerequisite-algebra.test.ts`, and `packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
