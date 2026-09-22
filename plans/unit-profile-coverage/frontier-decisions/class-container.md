# Class Container Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/character-creation.md:8-19`: character creation starts by choosing a Class, then records the remaining character sheet facts from the choices made.
- `.references/srd-5.2.1/classes.md:5-52`: Core Barbarian Traits and "Becoming a Barbarian" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:375-426`: Core Bard Traits and "Becoming a Bard" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:1749-1795`: Core Cleric Traits and "Becoming a Cleric" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:3015-3069`: Core Druid Traits and "Becoming a Druid" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:4581-4631`: Core Fighter Traits and "Becoming a Fighter" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:4898-4952`: Core Monk Traits and "Becoming a Monk" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:5292-5340`: Core Paladin Traits and "Becoming a Paladin" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:6071-6117`: Core Ranger Traits and "Becoming a Ranger" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:6843-6893`: Core Rogue Traits and "Becoming a Rogue" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:7173-7219`: Core Sorcerer Traits and "Becoming a Sorcerer" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:8692-8738`: Core Warlock Traits and "Becoming a Warlock" level-1/multiclass entry text.
- `.references/srd-5.2.1/classes.md:9800-9846`: Core Wizard Traits and "Becoming a Wizard" level-1/multiclass entry text.
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
- Owner notes: `plans/unit-profile-coverage/character-creation-owner-evidence.json` records all 12 class-container rows against the existing character-creation boundary: `discoverInitialDraftHoles`, `CHARACTER_CREATION_SUPPORT_PROFILE.progressionCapabilities`, `executableSupportSelections`, `characterBuildUnitRefs`, and the package test that finalizes every supported level-1 SRD class-container source fact from Surface class records.

## Decision

Keep owner-evidence-only closure for `class-container`.

Do not create `character-creation.class-progression-container` as a first-class Unit profile. The class container Unit is the Surface source record for a Class; its character-creation consequence is already the selected `CharacterProgression` and retained class Unit ref in the finalized `CharacterBuild`. Adding a profile would duplicate the same source facts and support-gate membership already represented by `CHARACTER_CREATION_SUPPORT_PROFILE.progressionCapabilities` and the row-level owner evidence.

Strict-report wording to preserve: class containers are installed Surface class source records with character-creation owner evidence for supported progression admission/finalization and `CharacterBuild` projection; their Unit profile lists remain empty because the class container has no standalone executable battle/runtime mechanics.

## Promotion Gate

No new profile promotion is justified.

The executable boundary exists, but it is already accounted for as owner evidence:

- parser/admission path: `draft.progression.initial` is discovered from installed `class` Units;
- support gate: `CHARACTER_CREATION_SUPPORT_PROFILE.progressionCapabilities`;
- finalization behavior: `executableSupportSelections`;
- `CharacterBuild` projection: `characterBuildUnitRefs` retains the selected class Unit ref.

Because the boundary is represented without duplicating class source facts, promoting the 12 class Units to a new support profile would add redundant state rather than a new checker, type, runtime, or finalization consequence.

## Follow-Up Tasks

none

## Verification

- RAW/source files read: `.references/srd-5.2.1/character-creation.md`, the consolidated `.references/srd-5.2.1/classes.md`, `UBIQUITOUS_LANGUAGE.md`, `plans/unit-profile-coverage/srd-unit-inventory.json`, `plans/unit-profile-coverage/unit-matrix.json`, `plans/unit-profile-coverage/character-creation-owner-evidence.json`, `packages/character-creation-runtime/src/discovery.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-creation-runtime/src/finalization.ts`, `packages/character-creation-runtime/src/index.test.ts`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
