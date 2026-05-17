# Class Container Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:8-19`: character creation starts by choosing a Class, then records the remaining character sheet facts from the choices made.
- `.references/srd-5.2.1/Classes/Barbarian.md:3-26`: Core Barbarian Traits and "Becoming a Barbarian" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Bard.md:3-27`: Core Bard Traits and "Becoming a Bard" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Cleric.md:3-26`: Core Cleric Traits and "Becoming a Cleric" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Druid.md:3-27`: Core Druid Traits and "Becoming a Druid" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Fighter.md:3-26`: Core Fighter Traits and "Becoming a Fighter" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Monk.md:3-27`: Core Monk Traits and "Becoming a Monk" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Paladin.md:3-26`: Core Paladin Traits and "Becoming a Paladin" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Ranger.md:3-26`: Core Ranger Traits and "Becoming a Ranger" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Rogue.md:3-27`: Core Rogue Traits and "Becoming a Rogue" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Sorcerer.md:3-26`: Core Sorcerer Traits and "Becoming a Sorcerer" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Warlock.md:3-26`: Core Warlock Traits and "Becoming a Warlock" level-1/multiclass entry text.
- `.references/srd-5.2.1/Classes/Wizard.md:3-26`: Core Wizard Traits and "Becoming a Wizard" level-1/multiclass entry text.
- `UBIQUITOUS_LANGUAGE.md:321-337`: checked Character Sheet, Class, and Multiclassing terms.

## Current Generated State

- Inventory row family: `class-container`.
- Unit ids: `class_barbarian`, `class_bard`, `class_cleric`, `class_druid`, `class_fighter`, `class_monk`, `class_paladin`, `class_ranger`, `class_rogue`, `class_sorcerer`, `class_warlock`, `class_wizard`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json`
  - `plans/unit-profile-coverage/character-creation-owner-evidence.json`
  - `plans/unit-profile-coverage/level1-full-support.json`
- Current states:
  - `surface.state`: `current-surface-can-express-source-facts`
  - `authoredContent.state`: `authored-record-present`
  - `catalogAdmission.state`: `installed`
  - `unit-matrix claim.tag`: `unsupported-profile`
  - `unit-matrix profiles`: `[]`
  - `finalDisposition`: `catalog-installed-owner-evidence-present`
  - `battleReadinessStatus`: `accepted`
  - row count: `12`

## Owner Classification

- `packageOwner`: `@dnd/character-creation-runtime`.
- `closureKind`: `owner-evidence-only`.
- Owner notes: `plans/unit-profile-coverage/character-creation-owner-evidence.json` records all 12 class-container rows against the existing character-creation boundary: `discoverInitialDraftHoles`, `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions`, `executableSupportSelections`, `characterBuildUnitRefs`, and the package test that finalizes every supported level-1 SRD class-container source fact from Surface class records.

## Decision

Keep owner-evidence-only closure for `class-container`.

Do not create `character-creation.class-progression-container` as a first-class Unit profile. The class container Unit is the Surface source record for a Class; its character-creation consequence is already the selected `CharacterProgression` and retained class Unit ref in the finalized `CharacterBuild`. Adding a profile would duplicate the same source facts and support-gate membership already represented by `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions` and the row-level owner evidence.

Strict-report wording to preserve: class containers are installed Surface class source records with character-creation owner evidence for supported progression admission/finalization and `CharacterBuild` projection; their Unit profile lists remain empty because the class container has no standalone executable battle/runtime mechanics.

## Promotion Gate

No new profile promotion is justified.

The executable boundary exists, but it is already accounted for as owner evidence:

- parser/admission path: `draft.progression.initial` is discovered from installed `class` Units;
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions`;
- finalization behavior: `executableSupportSelections`;
- `CharacterBuild` projection: `characterBuildUnitRefs` retains the selected class Unit ref.

Because the boundary is represented without duplicating class source facts, promoting the 12 class Units to a new support profile would add redundant state rather than a new checker, type, runtime, or finalization consequence.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/Character-Creation.md`, all 12 files under `.references/srd-5.2.1/Classes/`, `UBIQUITOUS_LANGUAGE.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, `packages/character-creation-runtime/src/index.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
