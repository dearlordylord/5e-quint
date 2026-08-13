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
- Current character-creation support checked: every source-shaped class or background starting-equipment option is admitted from its canonical Surface hole. Item bundles project their canonical owned items directly; coin grants open the separately bounded purchase/loadout path.

## Owner Classification

- `packageOwner`: `@dnd/character-creation-runtime`.
- `closureKind`: `owner-evidence-only`.
- Owner notes: the canonical source facts stay on the installed Surface class records. `readClassCreationFacts` projects `startingEquipment` from those records; `startingEquipmentChoiceHole` exposes the class equipment choice; `supportedHoleOptionIds` admits those exact surfaced options; `finalizedBuildEquipment` projects item bundles or the supported coin-purchase/loadout path into `CharacterBuild.equipment`; and package tests finalize the supported level-1 class-container facts.

## Decision

Keep owner-evidence-only closure for `equipment-pressure`.

Do not create a Unit profile such as `character-creation.starting-equipment-projection` or `character-creation.class-equipment-selection`. Starting equipment is a class source fact whose executable consequence is already represented at the character-creation boundary: a source-scoped choice hole, direct item-bundle projection or the bounded coin-purchase path, finalization into owned equipment, and catalog-backed initial loadout projection. Promoting the 12 class container Units to a new Unit profile would duplicate the same class source rows already recorded by `character-creation-owner-evidence.json`.

Strict-report wording to preserve: starting equipment rows are installed class source facts with character-creation owner evidence for supported source-scoped equipment choice admission, equipment purchase, owned equipment finalization, and `CharacterBuild` loadout projection. Empty class Unit profile lists remain intentional because starting equipment has no standalone promoted battle/runtime Unit behavior.

## Promotion Gate

No new Unit-profile promotion is justified.

The executable boundaries already exist and are accounted for without duplicating source facts:

- parser/admission path: `StartingEquipmentChoiceSchema` accepts `coin_grant` and `item_bundle` source shapes, and the Surface unit catalog checks starting-equipment Unit references.
- source projection: `readClassCreationFacts` reads `startingEquipment` from the installed class Unit record.
- hole/fill boundary: `startingEquipmentChoiceHole` derives source-scoped class equipment choice holes from the class source record.
- support gate: surfaced starting-equipment holes own their accepted option set; `purchasableEquipmentUnitIds`, `equipmentPurchaseChoiceCount`, and `loadoutChoices` bound the separate coin-purchase path.
- finalization behavior: `allFinalizedChoicesSupported` checks the exact source-shaped choice, and `finalizedBuildEquipment` projects canonical bundle items or supported purchases into durable owned equipment and initial loadout facts.
- `CharacterBuild` projection: `CharacterBuild.equipment` records selected owned equipment and initial loadout; downstream character-sheet and battle-character projections derive AC, Shield, and weapon facts from those build equipment facts and the Unit catalog.
- owner evidence: `character-creation-owner-evidence.json` covers all 12 `equipment-pressure` rows at the actual executable boundary.

Because those boundaries cover the row family, widening starting-equipment
projection requires no Unit claim, Unit profile, or parallel evidence manifest.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `packages/character-creation-runtime/VOCABULARY.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `plans/unit-profile-coverage/level1-full-support.json`, `packages/surface/content/class_*.json`, `packages/surface/src/surface/schema-nonspell.ts`, `packages/surface/src/surface/character-creation-readers.ts`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, and `packages/character-creation-runtime/src/index.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- Focused character-creation QNT/runtime parity and package tests own the
  starting-equipment projection behavior; no battle MBT is introduced by this
  owner-evidence-only decision.
