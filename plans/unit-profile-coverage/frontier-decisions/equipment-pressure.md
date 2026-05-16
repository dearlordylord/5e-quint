# Equipment Pressure Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:81-85`: background and class provide starting equipment, coins from that step can be spent immediately, and chosen equipment plus leftover coins are recorded on the character sheet.
- `.references/srd-5.2.1/Character-Creation.md:280-287`: starting armor, Shield, and weapons feed Armor Class and attack projections by referring to the Equipment rules.
- `.references/srd-5.2.1/Character-Creation.md:380-388`: higher-level starting equipment remains a GM-facing adjustment over the normal level-1 starting equipment path.
- `.references/srd-5.2.1/Classes/Barbarian.md:13`: Barbarian Starting Equipment options.
- `.references/srd-5.2.1/Classes/Bard.md:14`: Bard Starting Equipment options.
- `.references/srd-5.2.1/Classes/Cleric.md:13`: Cleric Starting Equipment options.
- `.references/srd-5.2.1/Classes/Druid.md:14`: Druid Starting Equipment options.
- `.references/srd-5.2.1/Classes/Fighter.md:13`: Fighter Starting Equipment options.
- `.references/srd-5.2.1/Classes/Monk.md:14`: Monk Starting Equipment options.
- `.references/srd-5.2.1/Classes/Paladin.md:13`: Paladin Starting Equipment options.
- `.references/srd-5.2.1/Classes/Ranger.md:13`: Ranger Starting Equipment options.
- `.references/srd-5.2.1/Classes/Rogue.md:14`: Rogue Starting Equipment options.
- `.references/srd-5.2.1/Classes/Sorcerer.md:13`: Sorcerer Starting Equipment options.
- `.references/srd-5.2.1/Classes/Warlock.md:13`: Warlock Starting Equipment options.
- `.references/srd-5.2.1/Classes/Wizard.md:13`: Wizard Starting Equipment options.
- `UBIQUITOUS_LANGUAGE.md:172-180`: checked Armor Class, Armor Category, and holding/wielding combat terms affected by starting loadout.
- `UBIQUITOUS_LANGUAGE.md:195-203`: checked equipment terminology, including Weapon Property and Weapon Mastery separation.
- `UBIQUITOUS_LANGUAGE.md:321-332`: checked Character Sheet and Class terms.
- `packages/character-creation-runtime/VOCABULARY.md:8-24`: checked Character Draft, Character Build, and Creation Hole terms.
- `packages/character-creation-runtime/VOCABULARY.md:60-70`: checked Support Profile and Finalization Gate terms.

## Current Generated State

- Inventory row family: `equipment-pressure`.
- Row ids: all 12 `srd521:classes/<class>:level-1:equipment-pressure:<class>_starting_equipment` rows.
- Unit ids: the 12 installed class container Units, `class_barbarian`, `class_bard`, `class_cleric`, `class_druid`, `class_fighter`, `class_monk`, `class_paladin`, `class_ranger`, `class_rogue`, `class_sorcerer`, `class_warlock`, and `class_wizard`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/character-creation-owner-evidence.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `packages/surface/content/class_*.json`
  - `packages/surface/src/surface/schema-nonspell.ts`
  - `packages/surface/src/surface/character-creation-readers.ts`
  - `packages/character-creation-runtime/src/discovery.ts`
  - `packages/character-creation-runtime/src/support-gates.ts`
  - `packages/character-creation-runtime/src/finalization.ts`
  - `packages/character-creation-runtime/src/index.test.ts`
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
- Surface shape checked: every level-1 class source record has `startingEquipment`. Eleven classes have one `item_bundle` option and one `coin_grant` option; Fighter has two `item_bundle` options and one `coin_grant` option.
- Current character-creation support checked: `CHARACTER_CREATION_SUPPORT_PROFILE.coinEquipmentChoiceOptionIdsByUnitId` admits the class coin-grant path for every level-1 SRD class, with Fighter using its `option_c` coin-grant branch. `CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds`, `equipmentPurchaseChoiceCount`, and `loadoutChoices` define the supported purchase and initial loadout projection boundary.

## Owner Classification

- `packageOwner`: `@dnd/character-creation-runtime`.
- `closureKind`: `owner-evidence-only`.
- Owner notes: the canonical source facts stay on the installed Surface class records. `readClassCreationFacts` projects `startingEquipment` from those records; `startingEquipmentChoiceHole` exposes the class equipment choice hole; `supportedUnitOptionIdsForSource` admits source-scoped coin-grant branches through the existing package-private `CHARACTER_CREATION_SUPPORT_PROFILE`; `finalizedBuildEquipment` turns supported purchased equipment and loadout fills into `CharacterBuild.equipment`; and the package tests finalize supported level-1 SRD class-container source facts from Surface class records.

## Decision

Keep owner-evidence-only closure for `equipment-pressure`.

Do not create a Unit profile such as `character-creation.starting-equipment-projection` or `character-creation.class-equipment-selection`. Starting equipment is a class source fact whose executable consequence is already represented at the character-creation boundary: a source-scoped choice hole, a package-private support profile for the currently finalizable coin-grant purchase path, finalization into owned equipment, and `CharacterBuild` loadout projection. Promoting the 12 class container Units to a new Unit profile would duplicate the same class source rows and support-profile membership already recorded by `character-creation-owner-evidence.json`.

The unsupported item-bundle branches are also not a reason to add a Unit profile. They are already expressible as authored Surface source facts and discoverable as source-shaped choices. If product support later widens to finalize item bundles directly, the correct owner is the existing character-creation support profile and `finalizedBuildEquipment`, not a parallel Unit profile that restates class equipment options beside the class record.

Strict-report wording to preserve: starting equipment rows are installed class source facts with character-creation owner evidence for supported source-scoped equipment choice admission, equipment purchase, owned equipment finalization, and `CharacterBuild` loadout projection. Empty class Unit profile lists remain intentional because starting equipment has no standalone promoted battle/runtime Unit behavior.

## Promotion Gate

No new Unit-profile promotion is justified.

The executable boundaries already exist and are accounted for without duplicating source facts:

- parser/admission path: `StartingEquipmentChoiceSchema` accepts `coin_grant` and `item_bundle` source shapes, and the Surface unit catalog checks starting-equipment Unit references.
- source projection: `readClassCreationFacts` reads `startingEquipment` from the installed class Unit record.
- hole/fill boundary: `startingEquipmentChoiceHole` derives source-scoped class equipment choice holes from the class source record.
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.coinEquipmentChoiceOptionIdsByUnitId`, `purchasableEquipmentUnitIds`, `equipmentPurchaseChoiceCount`, and `loadoutChoices` define which discovered equipment choices, purchases, and loadout slots can currently finalize.
- finalization behavior: `allFinalizedChoicesSupported` checks source-shaped starting-equipment choices against the support profile, and `finalizedBuildEquipment` produces durable owned equipment and initial loadout facts.
- `CharacterBuild` projection: `CharacterBuild.equipment` records selected owned equipment and initial loadout; downstream character-sheet and battle-character projections derive AC, Shield, and weapon facts from those build equipment facts and the Unit catalog.
- owner evidence: `character-creation-owner-evidence.json` covers all 12 `equipment-pressure` rows at the actual executable boundary.

Because those boundaries already cover the row family, no Unit claim, Unit profile, evidence manifest, runtime behavior, or generated coverage artifact should change in this task.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `packages/character-creation-runtime/VOCABULARY.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `plans/unit-profile-coverage/level1-full-support.json`, `packages/surface/content/class_*.json`, `packages/surface/src/surface/schema-nonspell.ts`, `packages/surface/src/surface/character-creation-readers.ts`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, and `packages/character-creation-runtime/src/index.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
