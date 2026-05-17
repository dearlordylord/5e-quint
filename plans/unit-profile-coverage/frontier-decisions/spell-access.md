# Spell Access Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Classes/Bard.md:73-91`: Bard cantrip, Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Cleric.md:60-78`: Cleric cantrip, Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Druid.md:61-79`: Druid cantrip, Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Paladin.md:70-82`: Paladin Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Ranger.md:62-74`: Ranger Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Sorcerer.md:60-76`: Sorcerer cantrip, Spell Slot, prepared-spell list, replacement, spellcasting ability, and Spellcasting Focus rules.
- `.references/srd-5.2.1/Classes/Wizard.md:60-82`: Wizard cantrip, spellbook Spell Access, Spell Slot, prepared-spell-from-spellbook, replacement, spellcasting ability, and Spellcasting Focus rules.
- `UBIQUITOUS_LANGUAGE.md`: checked Spell Definition, Spell Access, Spell Invocation, Spell Effect, Spell Slot, Cantrip, Ritual, Character Sheet, Class, Character Build, and Support Profile terms.

## Current Generated State

- Inventory row family: `spell-access`.
- Row ids: `srd521:classes/bard:level-1:spell-access:bard_spellcasting`, `srd521:classes/cleric:level-1:spell-access:cleric_spellcasting`, `srd521:classes/druid:level-1:spell-access:druid_spellcasting`, `srd521:classes/paladin:level-1:spell-access:paladin_spellcasting`, `srd521:classes/ranger:level-1:spell-access:ranger_spellcasting`, `srd521:classes/sorcerer:level-1:spell-access:sorcerer_spellcasting`, and `srd521:classes/wizard:level-1:spell-access:wizard_spellcasting`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/character-creation-owner-evidence.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `packages/surface/README.md`
  - `packages/character-creation-runtime/VOCABULARY.md`
  - `packages/surface/content/class_*.json`
  - `packages/character-creation-runtime/src/discovery.ts`
  - `packages/character-creation-runtime/src/support-gates.ts`
  - `packages/character-creation-runtime/src/finalization.ts`
  - `packages/character-creation-runtime/src/types.ts`
  - `packages/character-creation-runtime/src/index.test.ts`
- Current states:
  - `surface.state`: `current-surface-can-express-source-facts` for all 7 rows.
  - `authoredContent.state`: `authored-record-present` for all 7 rows.
  - `catalogAdmission.state`: `installed` for all 7 rows.
  - `characterCreationOwnership.state`: not a separate generated field for this row family.
  - `unit-matrix claim.tag`: `unsupported-profile` for the 7 class container Units.
  - `unit-matrix profiles`: `[]` for the 7 class container Units.
  - `finalDisposition`: `catalog-installed-owner-evidence-present` for all 7 rows.
  - `battleReadinessStatus`: `accepted` for all 7 rows.
  - row count: `7`.
- Owner evidence:
  - Wizard: `character-creation-owner-evidence.json` records `SRDINV1B` discovery, fill, finalization, build spellcasting projection, and package-test evidence.
  - Bard, Cleric, Druid, Paladin, Ranger, and Sorcerer: `character-creation-owner-evidence.json` records `SRDINV19` discovery, fill, finalization, build spellcasting projection, and package-test evidence.

## Owner Classification

- `packageOwner`: `@dnd/character-creation-runtime`.
- `closureKind`: `owner-evidence-only`.
- Owner notes: Surface class records own the authored class spellcasting facts. `discoverClassSpellcastingHoles` projects those facts into class cantrip, class prepared-spell, Wizard spellbook, and Wizard prepared-spell choice holes. `supportedHoleOptionIds` admits all class-list cantrip/prepared-spell options for non-Wizard spellcasting and uses the support manifest for Wizard spellcasting choices. `finalizedBuildSpellcasting` then projects the selected source-scoped cantrips, spellbook entries, prepared spells, Spell Slot capacity, spellcasting ability, and Spellcasting Focus permissions into `CharacterBuild.spellcasting`.

## Decision

Keep owner-evidence-only closure for `spell-access`.

Do not create a first-class Unit profile such as `character-creation.class-spell-access` or per-class spell-access profiles. The executable character-creation boundary is already represented by source-shaped owner evidence and by the finalized `CharacterBuild.spellcasting` projection. A new profile would either restate the same class spellcasting source facts beside the Surface class record or duplicate the selected cantrip, spellbook, prepared-spell, Spell Slot, ability, and focus facts already retained on `CharacterBuild`.

Keep the existing split between class Spell Access rows and individual Spell Definition/Invocation support. Class spellcasting rows answer which Spell Access source facts a character build owns. Individual Spell Unit rows and spell invocation profiles answer whether a concrete spell can be discovered, cast, resolved, and applied at runtime.

Strict-report wording to preserve: spell-access rows are installed class source facts with character-creation owner evidence for hole discovery, supported fills, finalization, and `CharacterBuild.spellcasting` projection. Empty class Unit profile lists remain intentional because class spell access is not standalone battle/runtime Unit behavior, and executable spell behavior remains owned by narrower Spell Definition/Invocation profiles.

## Promotion Gate

No new profile promotion is justified.

The executable boundaries already exist and are accounted for without duplicating source facts:

- parser/admission path: Surface class records carry `spellcasting` aggregates that distinguish cantrip access, prepared access, Wizard spellbook access, Spell Slot projection, spellcasting ability, replacement rules, and focus permissions.
- hole/fill boundary: `discoverClassSpellcastingHoles` derives choice holes from the installed class source record; `supportedHoleOptionIds` gates those holes through the character-creation support boundary.
- finalization behavior: `executableSupportSelections`, `allFinalizedChoicesSupported`, and `selectedPreparedSpellsAreInSelectedSpellbook` keep finalized Wizard spellcasting inside selected spellbook and available Spell Slot levels.
- `CharacterBuild` projection: `finalizedBuildSpellcasting` produces one source-scoped `CharacterBuildSpellcastingSource` plus `slotPools.spellcasting` for the selected class spellcasting source.
- owner evidence: `character-creation-owner-evidence.json` already records row-level discovery, fill, finalization, build projection, and package tests for all 7 spell-access rows.

Because those boundaries already close the row family, no Unit claim, Unit profile, profile manifest, evidence manifest, runtime behavior, generated coverage artifact, or split implementation task should change in this task.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Classes/Bard.md`, `.references/srd-5.2.1/Classes/Cleric.md`, `.references/srd-5.2.1/Classes/Druid.md`, `.references/srd-5.2.1/Classes/Paladin.md`, `.references/srd-5.2.1/Classes/Ranger.md`, `.references/srd-5.2.1/Classes/Sorcerer.md`, `.references/srd-5.2.1/Classes/Wizard.md`, `UBIQUITOUS_LANGUAGE.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `plans/unit-profile-coverage/level1-full-support.json`, `packages/surface/README.md`, `packages/character-creation-runtime/VOCABULARY.md`, `packages/surface/content/class_*.json`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, `packages/character-creation-runtime/src/types.ts`, and `packages/character-creation-runtime/src/index.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
