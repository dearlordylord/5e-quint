# Character Creation Runtime Time Diagram

This document traces `packages/character-creation-runtime/src/` as a
time-ordered runtime story. The example character is the currently supported
phase-1 "orc warrior" vertical: an Orc Soldier Fighter at level 1.

The important architectural idea is this:

1. `discoverCreationHoles` derives the current fillable frontier from the draft.
2. `fillCreationHoles` validates a whole caller batch against that current
   frontier.
3. Only a completely legal batch reaches `applyCreationFills`.
4. Accepted fills reveal later Unit-backed holes.
5. `finalizeCharacterDraft` refuses to build a `CharacterBuild` until discovery
   says there are no open holes and final legality checks pass.

## Source Anchors

- Runtime implementation: `src/index.ts` re-exports the split runtime modules:
  `src/types.ts`, `src/draft.ts`, `src/discovery.ts`, `src/fill-reducer.ts`,
  `src/finalization.ts`, `src/hole-factories.ts`, `src/phase1-manifest.ts`, and
  `src/support-gates.ts`.
- Reducer tests and executable examples: `src/index.test.ts`.
- Package terms: `VOCABULARY.md`.
- Rules vocabulary: `../../UBIQUITOUS_LANGUAGE.md`.
- Local RAW corpus used by this package: `../../.references/srd-5.2.1/`.
- Authored Surface records for this path:
  - `../surface/content/class_fighter.json`
  - `../surface/content/background_soldier.json`
  - `../surface/content/species_orc.json`
  - `../surface/content/fighter_fighting_style_l1.json`
  - `../surface/content/fighter_weapon_mastery_l1.json`
  - `../surface/content/feat_defense.json`

## Runtime Cast

```mermaid
flowchart TD
  Caller["Caller / UI / session boundary<br/>owns persistence and expectedRevision"]
  Draft["CharacterDraft<br/>draftId, selections, revision"]
  Catalog["UnitCatalog<br/>Surface UnitCatalog"]
  Runtime["character-creation-runtime/src/*"]
  SurfaceReaders["Surface readers<br/>readClassCreationFacts<br/>readBackgroundCreationFacts<br/>readSpeciesCreationFacts"]
  SharedAlgebra["shared-algebras<br/>isValidAbilityScoreAssignment"]
  Sheet["CharacterBuild<br/>finalized player-character boundary"]

  Caller -->|createCharacterDraft| Runtime
  Runtime --> Draft
  Caller -->|discoverCreationHoles| Runtime
  Catalog --> Runtime
  Runtime --> SurfaceReaders
  Runtime --> SharedAlgebra
  Runtime -->|accepted batches produce next CharacterDraft| Draft
  Runtime -->|finalizeCharacterDraft ready| Sheet
  Caller -->|stores draft or sheet| Draft
  Caller -->|stores sheet| Sheet
```

`UnitCatalog` is not copied into a runtime-owned catalog. The runtime accepts the
Surface `UnitCatalog` directly because the repo owns both layers and avoids
duplicating data.

## Full Time Diagram: Wrong Holes First, Then Legal Orc Soldier Fighter

```mermaid
sequenceDiagram
  autonumber
  actor Caller
  participant Runtime as character-creation-runtime/src/*
  participant Draft as CharacterDraft
  participant Catalog as UnitCatalog
  participant Surface as Surface creation readers
  participant Algebra as Ability score algebra
  participant Sheet as CharacterBuild

  Caller->>Runtime: createCharacterDraft({ draftId })
  Runtime-->>Caller: draft revision 0, selections.choices = []

  Caller->>Runtime: discoverCreationHoles({ draft, unitLibrary })
  Runtime->>Runtime: discoverInitialDraftHoles()
  Runtime->>Runtime: hasDraftSelection(...) for each initial path
  Runtime->>Runtime: draftHole("draft.primaryClass", unitLibrary)
  Runtime->>Catalog: listUnits()
  Runtime->>Runtime: unitOption(class_fighter)
  Runtime->>Runtime: choiceHole(...) -> holeIdForSource(draftSource(path))
  Runtime->>Runtime: draftHole("draft.background", unitLibrary)
  Runtime->>Catalog: listUnits()
  Runtime->>Runtime: draftHole("draft.species", unitLibrary)
  Runtime->>Catalog: listUnits()
  Runtime->>Runtime: draftHole("draft.abilityScoreGeneration", unitLibrary)
  Runtime->>Runtime: draftHole("draft.languages", unitLibrary)
  Runtime->>Runtime: draftHole("draft.alignment", unitLibrary)
  Runtime->>Runtime: discoverClassGrantedHoles() returns [] because no class
  Runtime->>Runtime: discoverBackgroundGrantedHoles() returns [] because no background
  Runtime->>Runtime: discoverEquipmentHoles() returns [] because no equipment path
  Runtime-->>Caller: six initial holes

  Note over Caller,Runtime: Wrong-hole batch: forged/stale/mismatched inputs.
  Caller->>Runtime: fillCreationHoles({ draft rev 0, expectedRevision: 1, fills: bad fills })
  Runtime->>Runtime: discoverCreationHoles(input) again
  Runtime->>Runtime: creationFillIssues(input, current holes)
  Runtime->>Runtime: staleRevisionIssue(input)
  Runtime->>Runtime: for each fill: find matching hole by holeId
  Runtime->>Runtime: duplicateFillIssue(...) if same hole appears twice
  Runtime->>Runtime: unknownHoleIssue(...) for future/inactive hole ids
  Runtime->>Runtime: fillIssuesForHole(...)
  Runtime->>Runtime: fillKindMatchesHole(...)
  Runtime->>Runtime: wrongFillKindIssue(...) for text into choice hole
  Runtime->>Runtime: choiceFillIssues(...)
  Runtime->>Runtime: invalidChoiceIssue(...) for background_soldier as primaryClass
  Runtime->>Runtime: unsupportedChoiceIssue(...) for valid but unsupported options
  Runtime->>Runtime: finalizeCharacterDraft(original draft)
  Runtime->>Runtime: discoverCreationHoles(original draft)
  Runtime->>Runtime: nonEmptyReadonlyArray(holes) -> incomplete
  Runtime-->>Caller: rejected, original draft unchanged, issues plus incomplete finalization

  Note over Caller,Runtime: Legal batch 1 fills only initial draft holes.
  Caller->>Runtime: fillCreationHoles({ draft rev 0, expectedRevision: 0, initialManifestFills })
  Runtime->>Runtime: discoverCreationHoles(input)
  Runtime->>Runtime: creationFillIssues(...) returns []
  Runtime->>Runtime: finalizeCharacterDraft(original draft) -> incomplete
  Runtime->>Runtime: applyCreationFills(draft, holes, fills)
  loop each accepted fill
    Runtime->>Runtime: requireHole(holes, fill.holeId)
    Runtime->>Runtime: applyCreationFill(selections, hole, fill)
    alt source.tag is draft
      Runtime->>Runtime: applyDraftFill(...)
      Runtime->>Runtime: requireOneOptionId(fill)
      Runtime->>Runtime: requireSelectedUnitId(hole, optionId)
      Runtime->>Runtime: requireAcceptedChoiceOption(hole, optionId)
      Runtime->>Runtime: requireStartingLanguages(...) for language fill
      Runtime->>Runtime: requireAlignmentSelection(...) for alignment fill
    else ability scores
      Runtime->>Algebra: isValidAbilityScoreAssignment("standardArray", scores)
    end
  end
  Runtime-->>Caller: accepted draft revision 1 with Fighter, Soldier, Orc, scores, languages, alignment
  Runtime->>Runtime: discoverCreationHoles(new draft)
  Runtime->>Runtime: discoverClassGrantedHoles(...)
  Runtime->>Catalog: requireUnit("class_fighter")
  Runtime->>Surface: readClassCreationFacts(class_fighter)
  Runtime->>Runtime: discoverClassFeatureGrantHoles(fighter_fighting_style_l1)
  Runtime->>Catalog: listUnits()
  Runtime->>Runtime: discoverClassFeatureGrantHoles(fighter_weapon_mastery_l1)
  Runtime->>Catalog: requireUnit("fighter_weapon_mastery_l1")
  Runtime->>Catalog: listUnits()
  Runtime->>Runtime: startingEquipmentChoiceHole(class_fighter option_c)
  Runtime->>Runtime: discoverBackgroundGrantedHoles(...)
  Runtime->>Catalog: requireUnit("background_soldier")
  Runtime->>Surface: readBackgroundCreationFacts(background_soldier)
  Runtime->>Runtime: backgroundAbilityScoreIncreaseOptions(str,dex,con)
  Runtime->>Runtime: backgroundToolChoiceHole(...)
  Runtime->>Runtime: backgroundToolChoiceSpec(gaming_set choose 1)
  Runtime->>Runtime: startingEquipmentChoiceHole(background option_a/option_b)
  Runtime->>Runtime: discoverEquipmentHoles() returns [] until equipment-path choices are selected
  Runtime-->>Caller: next holes: Fighter skills, style, mastery, Soldier ASI/tool, class/background equipment

  Note over Caller,Runtime: Legal batch 2 fills Unit-granted choices.
  Caller->>Runtime: fillCreationHoles({ draft rev 1, expectedRevision: 1, class/background choices })
  Runtime->>Runtime: creationFillIssues(...) checks exact counts and support gates
  Runtime->>Runtime: applyCreationFills(...)
  Runtime->>Runtime: applyUnitFill(...) for ASI, tool, skills, style, mastery, equipment-path choices
  Runtime->>Runtime: requireBackgroundAbilityScoreIncreaseSelection("two_and_one:str:con")
  Runtime->>Runtime: selectedChoiceOption(requireAcceptedChoiceOption(...))
  Runtime-->>Caller: accepted draft revision 2
  Runtime->>Runtime: discoverCreationHoles(new draft)
  Runtime->>Runtime: hasSupportedCoinEquipmentPath(...)
  Runtime->>Catalog: requireUnit("class_fighter")
  Runtime->>Surface: readClassCreationFacts(...)
  Runtime->>Catalog: requireUnit("background_soldier")
  Runtime->>Surface: readBackgroundCreationFacts(...)
  Runtime->>Runtime: hasValidSelectionForHole(class equipment option_c)
  Runtime->>Runtime: hasValidSelectionForHole(background equipment option_b)
  Runtime->>Runtime: unselectedPurchaseHole(...)
  Runtime-->>Caller: equipment_purchase hole for chain mail, longsword, shield

  Note over Caller,Runtime: Legal batch 3 purchases supported equipment.
  Caller->>Runtime: fillCreationHoles({ draft rev 2, expectedRevision: 2, purchase fill })
  Runtime->>Runtime: choiceFillIssues(...) exact 3, no duplicate, supported purchase ids
  Runtime->>Runtime: applyUnitFill(...)
  Runtime->>Runtime: requireSelectedUnitIds(hole, optionIds)
  Runtime-->>Caller: accepted draft revision 3 with equipment.selectedUnitIds
  Runtime->>Runtime: discoverEquipmentHoles(new draft)
  Runtime->>Runtime: hasValidEquipmentPurchaseSelectionForHole(...)
  Runtime->>Runtime: unselectedLoadoutHole(chain mail)
  Runtime->>Runtime: unselectedLoadoutHole(shield)
  Runtime->>Runtime: unselectedLoadoutHole(longsword)
  Runtime-->>Caller: loadout holes: armor worn, shield wielded, longsword wielded one-handed

  Note over Caller,Runtime: Legal batch 4 fills loadout.
  Caller->>Runtime: fillCreationHoles({ draft rev 3, expectedRevision: 3, loadout fills })
  Runtime->>Runtime: creationFillIssues(...) returns []
  Runtime->>Runtime: applyUnitFill(...) stores Unit-backed selected options
  Runtime-->>Caller: accepted draft revision 4

  Caller->>Runtime: finalizeCharacterDraft({ draft rev 4, unitLibrary })
  Runtime->>Runtime: discoverCreationHoles(...) returns []
  Runtime->>Runtime: finalizedSelections(draft)
  Runtime->>Runtime: temporarySupportedSliceIssues(selections, unitLibrary)
  Runtime->>Algebra: isValidAbilityScoreAssignment(...)
  Runtime->>Runtime: isSupportedManifestBackgroundAbilityScoreIncrease(...)
  Runtime->>Runtime: sameOptionIdMultiset(...)
  Runtime->>Runtime: sameChoiceSelectionMultiset(...)
  Runtime->>Runtime: buildCharacterBuild(...)
  Runtime->>Catalog: requireUnit(class/background/species/features)
  Runtime->>Surface: readClassCreationFacts(...)
  Runtime->>Surface: readBackgroundCreationFacts(...)
  Runtime->>Surface: readSpeciesCreationFacts(...)
  Runtime->>Runtime: applyBackgroundAbilityScoreIncrease(...)
  Runtime->>Runtime: abilityModifier(finalScores.con)
  Runtime->>Runtime: finalizedBuildSkillProficiencies(...)
  Runtime->>Runtime: finalizedBuildToolProficiencies(...)
  Runtime->>Runtime: characterBuildUnitRefs(...)
  Runtime->>Runtime: unitRefs(...)
  Runtime->>Runtime: resourceForFeature(fighter_second_wind)
  Runtime-->>Sheet: ready CharacterBuild
```

## What The First Discovery Actually Opens

The empty draft starts with `selections: { choices: [] }`, so
`discoverInitialDraftHoles` opens every path in `INITIAL_CHARACTER_DRAFT_PATHS`.

```mermaid
flowchart TD
  Discover["discoverCreationHoles({ draft, unitLibrary })"]
  Initial["discoverInitialDraftHoles"]
  Class["discoverClassGrantedHoles"]
  Background["discoverBackgroundGrantedHoles"]
  Equipment["discoverEquipmentHoles"]

  Discover --> Initial
  Discover --> Class
  Discover --> Background
  Discover --> Equipment

  Initial --> PClass["draftHole(draft.primaryClass)<br/>list class Units<br/>choice: class_fighter"]
  Initial --> Bg["draftHole(draft.background)<br/>list background Units<br/>choice: background_soldier"]
  Initial --> Species["draftHole(draft.species)<br/>list species Units<br/>choice: species_orc"]
  Initial --> Scores["draftHole(draft.abilityScoreGeneration)<br/>abilityScores hole<br/>methods: standardArray, pointBuy"]
  Initial --> Lang["draftHole(draft.languages)<br/>choice exactly 2<br/>all standard languages except Common"]
  Initial --> Align["draftHole(draft.alignment)<br/>choice exactly 1<br/>nine alignment ids"]

  Class --> NoClass["[] because selections.primaryClass is missing"]
  Background --> NoBg["[] because selections.background is missing"]
  Equipment --> NoEquip["[] because hasSupportedCoinEquipmentPath is false"]
```

Each choice hole is built through `choiceHole`, which calls
`holeIdForSource`. That gives ids like:

- `cc:draft:draft.primaryClass`
- `cc:draft:draft.background`
- `cc:draft:draft.species`
- `cc:draft:draft.languages`

The hole id is a semantic address, not an array position. Reordering holes does
not change what a fill means.

## Why Wrong Holes Are Rejected Before Mutation

`fillCreationHoles` never trusts a caller's previously discovered holes. It
rediscovers the current frontier from the submitted draft, validates the entire
batch, and only then applies.

```mermaid
flowchart TD
  Fill["fillCreationHoles(input)"]
  Rediscover["discoverCreationHoles(input)<br/>current frontier"]
  Issues["creationFillIssues(input, holes)"]
  Batch["expectedRevision === draft.revision?<br/>else staleRevisionIssue"]
  Each["for each fill with fillIndex"]
  Duplicate["duplicate prior same holeId?<br/>duplicateFillIssue"]
  Lookup["holes.find(hole.holeId === fill.holeId)<br/>else unknownHoleIssue"]
  Kind["fillKindMatchesHole(fill, hole)?<br/>else wrongFillKindIssue"]
  Choice["choiceFillIssues"]
  Ability["abilityScoreFillIssues"]
  Reject["nonEmptyReadonlyArray(issues)<br/>return rejected with original draft"]
  Apply["applyCreationFills<br/>only when issues == []"]

  Fill --> Rediscover --> Issues
  Issues --> Batch --> Each
  Each --> Duplicate
  Each --> Lookup
  Lookup --> Kind
  Kind --> Choice
  Kind --> Ability
  Issues --> Reject
  Issues --> Apply
```

Examples from the tests:

| Bad caller action                                                   | Function path                                                                                        | Issue               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| Uses `expectedRevision: draft.revision + 1`                         | `creationFillIssues` -> `staleRevisionIssue`                                                         | `staleRevision`     |
| Sends two fills for `cc:draft:draft.primaryClass`                   | fill loop -> duplicate check -> `duplicateFillIssue`                                                 | `duplicateFill`     |
| Sends a future equipment hole before equipment path is open         | fill loop -> `holes.find(...)` fails -> `unknownHoleIssue`                                           | `unknownHole`       |
| Sends `{ kind: "abilityScores" }` for the primary class choice hole | `fillKindMatchesHole` -> `wrongFillKindIssue`                                                        | `wrongFillKind`     |
| Sends `background_soldier` as the primary class option              | `choiceFillIssues` -> option not in class hole                                                       | `invalidChoice`     |
| Sends `neutral_good` alignment in the phase-1 manifest              | `supportedDraftOptionIds("draft.alignment")` allows only `lawful_good`                               | `unsupportedChoice` |
| Sends `Dwarvish, Elvish` languages                                  | valid language options, but `supportedDraftOptionIds("draft.languages")` allows only Dwarvish/Goblin | `unsupportedChoice` |
| Sends only one language                                             | `choiceFillIssues` compares length to cardinality 2                                                  | `tooFewChoices`     |
| Sends three languages                                               | `choiceFillIssues` compares length to cardinality 2                                                  | `tooManyChoices`    |

The rejection still includes `finalizeCharacterDraft(original draft)`, which is
usually `incomplete` because the original draft still has open holes.

## Legal Batch 1: Draft-Owned Selections

The first legal batch fills only draft-owned holes.

```mermaid
flowchart TD
  Batch["initialManifestFills()"]
  Fill["fillCreationHoles"]
  Validate["creationFillIssues == []"]
  Apply["applyCreationFills"]
  Dispatch["applyCreationFill"]
  DraftFill["applyDraftFill"]
  Class["primaryClass<br/>requireSelectedUnitId -> class_fighter"]
  Advancement["advancement.initial<br/>class_fighter:level_1"]
  Background["background<br/>requireSelectedUnitId -> background_soldier"]
  Species["species<br/>requireSelectedUnitId -> species_orc"]
  Scores["abilityScoreGeneration<br/>method standardArray<br/>assigned scores"]
  Languages["languages<br/>requireStartingLanguages -> Common + Dwarvish + Goblin"]
  Alignment["alignment<br/>requireAlignmentSelection -> lawful/good"]
  Rev["revision 0 -> 1"]
  Next["rediscover next holes"]

  Batch --> Fill --> Validate --> Apply --> Dispatch --> DraftFill
  DraftFill --> Class
  DraftFill --> Advancement
  DraftFill --> Background
  DraftFill --> Species
  DraftFill --> Scores
  DraftFill --> Languages
  DraftFill --> Alignment
  Class --> Rev
  Advancement --> Rev
  Background --> Rev
  Species --> Rev
  Scores --> Rev
  Languages --> Rev
  Alignment --> Rev
  Rev --> Next
```

Important detail: picking `class_fighter` writes only `primaryClass`. Advancement
is a separate `draft.advancement.initial` fill whose selected option writes
`advancement.entries`, such as
`[{ classUnitId: "class_fighter", level: 1 }]`.

## Legal Batch 2: Unit-Granted Holes

After Fighter and Soldier are selected, discovery starts reading authored Unit
facts.

```mermaid
flowchart TD
  D["discoverCreationHoles(revision 1 draft)"]
  Class["discoverClassGrantedHoles"]
  ClassRead["requireUnit(class_fighter)<br/>readClassCreationFacts"]
  Skills["choiceHole(class_fighter, fighter_skill_choices)<br/>exactly 2"]
  Style["discoverClassFeatureGrantHoles(fighter_fighting_style_l1)<br/>read grant_feat fighting_style<br/>list fighting_style feats<br/>exactly 1"]
  Mastery["discoverClassFeatureGrantHoles(fighter_weapon_mastery_l1)<br/>read weapon_mastery_choice<br/>list eligible simple/martial weapons"]
  ClassEquip["startingEquipmentChoiceHole(class_fighter)<br/>option_c coin grant"]

  Background["discoverBackgroundGrantedHoles"]
  BgRead["requireUnit(background_soldier)<br/>readBackgroundCreationFacts"]
  ASI["backgroundAbilityScoreIncreaseOptions(str,dex,con)<br/>two_and_one:*:* plus one_each"]
  Tool["backgroundToolChoiceSpec(gaming_set choose 1)<br/>tool_dice_set"]
  BgEquip["startingEquipmentChoiceHole(background_soldier)<br/>option_a item bundle, option_b coin grant"]

  D --> Class --> ClassRead --> Skills
  ClassRead --> Style
  ClassRead --> Mastery
  ClassRead --> ClassEquip
  D --> Background --> BgRead --> ASI
  BgRead --> Tool
  BgRead --> BgEquip
```

The legal phase-1 fill chooses:

- Fighter skills: `perception`, `survival`.
- Fighting Style: `defense`.
- Weapon Mastery: `weapon_longsword`, `weapon_spear`, `weapon_flail`.
- Soldier ASI: `two_and_one:str:con`.
- Soldier tool: `tool_dice_set`.
- Fighter equipment path: `option_c`.
- Soldier equipment path: `option_b`.

`applyUnitFill` handles this batch. It has three important branches:

- `BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY` writes the typed
  `backgroundAbilityScoreIncrease` field.
- `EQUIPMENT_PURCHASE_CHOICE_KEY` writes `equipment.selectedUnitIds`.
- Other choice holes append to `selections.choices` with the original hole
  `source` and accepted option metadata.

That last point matters for Unit-backed selections. For Fighting Style,
Weapon Mastery, and loadout, `selectedChoiceOption` preserves `unitRef` from the
hole option. The runtime does not infer a Unit from a raw option id later.

## Legal Batch 3: Equipment Purchase Opens Only After Coin Path

`discoverEquipmentHoles` is gated by `hasSupportedCoinEquipmentPath`.

```mermaid
flowchart TD
  Equipment["discoverEquipmentHoles"]
  Gate["hasSupportedCoinEquipmentPath"]
  ClassBg["primaryClass and background selected<br/>and both are supported"]
  Read["readClassCreationFacts<br/>readBackgroundCreationFacts"]
  ClassChoice["hasValidSelectionForHole(class equipment option_c)"]
  BgChoice["hasValidSelectionForHole(background equipment option_b)"]
  Purchase["choiceHole(class_fighter, equipment_purchase)<br/>chain mail, longsword, shield<br/>exactly 3"]
  ValidPurchase["hasValidEquipmentPurchaseSelectionForHole"]
  Loadout["unselectedLoadoutHole for purchased Units"]

  Equipment --> Gate --> ClassBg --> Read --> ClassChoice --> BgChoice
  BgChoice --> Purchase
  Purchase --> ValidPurchase
  ValidPurchase -->|false| Purchase
  ValidPurchase -->|true| Loadout
```

Why the purchase hole is not open earlier:

- Before `option_c` and `option_b`, the draft has not selected the coin-grant
  path.
- If the draft has malformed equipment-path choice metadata, then
  `hasValidSelectionForHole` returns false and purchase does not open.
- If the draft has a malformed purchase selection, purchase stays fillable and
  loadout stays closed.

This prevents a draft from equipping or wielding unowned items.

## Legal Batch 4: Loadout Holes Depend On Owned Equipment

After the purchase fill writes:

```ts
equipment: {
  selectedUnitIds: [
    "armor_chain_mail",
    "weapon_longsword",
    "equipment_shield",
  ],
}
```

`discoverEquipmentHoles` calls `unselectedLoadoutHole` three times:

```mermaid
flowchart TD
  Purchased["hasValidPurchaseSelection = true"]
  Armor["hasPurchasedUnit(armor_chain_mail)<br/>loadout_armor -> worn"]
  Shield["hasPurchasedUnit(equipment_shield)<br/>loadout_shield -> wielded"]
  Weapon["hasPurchasedUnit(weapon_longsword)<br/>loadout_weapon -> wielded_one_handed"]
  Suppress["hasValidSelectionForHole suppresses already-filled loadout"]

  Purchased --> Armor --> Suppress
  Purchased --> Shield --> Suppress
  Purchased --> Weapon --> Suppress
```

The loadout fills are stored in `selections.choices` as Unit-backed selections,
again preserving the `unitRef` from the accepted hole option.

## Finalization Time Diagram

```mermaid
sequenceDiagram
  autonumber
  participant Caller
  participant Runtime as finalizeCharacterDraft
  participant Discover as discoverCreationHoles
  participant Narrow as finalizedSelections
  participant Legal as temporarySupportedSliceIssues
  participant Build as buildCharacterBuild
  participant Catalog as UnitCatalog
  participant Surface as Surface readers

  Caller->>Runtime: finalizeCharacterDraft({ complete draft, unitLibrary })
  Runtime->>Discover: discoverCreationHoles(input)
  Discover-->>Runtime: []
  Runtime->>Narrow: finalizedSelections(draft)
  Narrow-->>Runtime: FinalizedCharacterSelections
  Runtime->>Legal: temporarySupportedSliceIssues(selections, unitLibrary)
  Legal->>Legal: primaryClass is supported
  Legal->>Legal: background === background_soldier
  Legal->>Legal: species === species_orc
  Legal->>Legal: isSupportedSingleClassAdvancement(...)
  Legal->>Legal: isValidAbilityScoreAssignment(...)
  Legal->>Legal: isSupportedManifestBackgroundAbilityScoreIncrease(...)
  Legal->>Legal: sameOptionIdMultiset(languages, Common/Dwarvish/Goblin)
  Legal->>Legal: alignment is lawful good
  Legal->>Legal: allFinalizedChoicesSupported(...)
  Legal->>Legal: isSupportedEquipmentSelection(...)
  Legal-->>Runtime: []
  Runtime->>Build: buildCharacterBuild({ supportedSelections, unitLibrary })
  Build->>Catalog: requireUnit(class_fighter)
  Build->>Surface: readClassCreationFacts(...)
  Build->>Catalog: requireUnit(background_soldier)
  Build->>Surface: readBackgroundCreationFacts(...)
  Build->>Catalog: requireUnit(species_orc)
  Build->>Surface: readSpeciesCreationFacts(...)
  Build->>Build: applyBackgroundAbilityScoreIncrease(base, +2 str/+1 con)
  Build->>Build: maximum HP = class hit die 10 + Con modifier 2
  Build->>Build: finalizedBuildSkillProficiencies + background skills
  Build->>Build: finalizedBuildToolProficiencies
  Build->>Build: unitRefs(unique ids)
  Build->>Build: resourceForFeature(...)
  Build->>Build: resourceForFeature(fighter_second_wind)
  Build-->>Runtime: CharacterBuild
  Runtime-->>Caller: { tag: "ready", build }
```

If any holes remain, finalization returns `incomplete` before it tries to narrow
the draft. If no holes remain but required typed fields are still missing,
`finalizedSelections` returns `undefined` and finalization returns `invalid`.
If typed fields exist but contradict the current executable support slice, the
`temporarySupportedSliceIssues` checks return `illegalFinalization`.

## Build Projection For The Supported Orc Soldier Fighter

The ready `CharacterBuild` contains durable build facts only:

- `advancement`: one level-1 Fighter entry.
- `background`: Soldier.
- `species`: Orc.
- `originLanguages`: Common, Dwarvish, and Goblin.
- `alignment`: Lawful Good.
- `abilityScores`: final scores after the Soldier background increase:
  Strength 17, Dexterity 14, Constitution 14, Intelligence 8, Wisdom 10,
  Charisma 12.
- `hitPoints.maximum`: `10 + abilityModifier(14) = 12`.
- `hitPoints.hitDice`: one d10 Fighter Hit Die.
- `proficiencies`: Fighter saving throws, selected skills plus Soldier skills,
  Fighter weapon/armor training, and selected tool.
- `features`: class, background, species, and choice-sourced feature refs.
- `resources`: activation resources from class features such as Second Wind.
- `equipment`: phase-1 starting loadout.

It does not store creation-session facts such as `sourceDraftId`, raw
`selections`, or a cached `unitRefs` list. Callers can derive Unit refs from the
build with `characterBuildUnitRefs` when they need that projection.

## Why Some Legal-Looking Choices Are Unsupported

The hole options often come from authored SRD records or shared facts, but this
runtime intentionally supports only the first vertical. That is why
`supportedHoleOptionIds` exists.

```mermaid
flowchart TD
  Hole["CreationHole"]
  Draft["source.tag === draft<br/>supportedDraftOptionIds(path)"]
  Unit["source.tag === unit<br/>supportedUnitOptionIds(choiceKey)"]
  None["undefined means no support narrowing"]
  Empty["[] means this Unit choice key is unsupported"]
  Unsupported["unsupportedHoleSelectionOptionId<br/>first selected option not in supported list"]

  Hole --> Draft
  Hole --> Unit
  Draft --> None
  Draft --> Unsupported
  Unit --> Empty
  Unit --> Unsupported
```

Examples:

- Alignment hole lists all nine alignments, but phase 1 supports only
  `lawful_good`.
- Language hole lists all selectable standard languages, but phase 1 supports
  only `Dwarvish` and `Goblin`.
- Fighter skill hole lists every Fighter skill option from the Surface record,
  but phase 1 supports only `perception` and `survival`.
- Background equipment option `option_a` exists, but the supported equipment
  path uses `option_b`.

This is not provenance. SRD provenance stays in Surface records. These support
gates are runtime implementation boundaries for the currently modeled vertical.

## Function Call Inventory

The diagrams above intentionally include most of the package-local runtime
functions. This inventory groups them by responsibility.

| Responsibility            | Functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API                | `createCharacterDraft`, `discoverCreationHoles`, `fillCreationHoles`, `finalizeCharacterDraft`                                                                                                                                                                                                                                                                                                                                                                                      |
| Draft discovery           | `discoverInitialDraftHoles`, `draftHole`, `hasDraftSelection`, `draftSource`, `choiceHole`, `holeIdForSource`, `unitOption`, `skillOption`                                                                                                                                                                                                                                                                                                                                          |
| Class discovery           | `discoverClassGrantedHoles`, `discoverClassFeatureGrantHoles`, `startingEquipmentChoiceHole`, `unselectedUnitChoiceHole`                                                                                                                                                                                                                                                                                                                                                            |
| Background discovery      | `discoverBackgroundGrantedHoles`, `backgroundAbilityScoreIncreaseOptions`, `backgroundAbilityScoreIncreaseOptionId`, `backgroundToolChoiceHole`, `backgroundToolChoiceSpec`                                                                                                                                                                                                                                                                                                         |
| Equipment discovery       | `discoverEquipmentHoles`, `hasSupportedCoinEquipmentPath`, `unselectedPurchaseHole`, `unselectedLoadoutHole`, `hasValidEquipmentPurchaseSelectionForHole`, `hasPurchasedUnit`                                                                                                                                                                                                                                                                                                      |
| Existing-selection checks | `hasValidSelectionForHole`, `choiceSelectionMatchesHole`, `hasValidBackgroundAbilityScoreIncreaseSelectionForHole`, `choiceOptionIdsFitHole`, `selectedChoiceOptionMatchesHole`, `hasDuplicateOptionIds`, `sameCreationHoleSource`                                                                                                                                                                                                                                                  |
| Batch validation          | `creationFillIssues`, `fillIssuesForHole`, `fillKindMatchesHole`, `choiceFillIssues`, `abilityScoreFillIssues`, `unsupportedHoleSelectionOptionId`, `supportedHoleOptionIds`, `supportedDraftOptionIds`, `supportedUnitOptionIds`                                                                                                                                                                                                                                                   |
| Issue constructors        | `wrongFillKindIssue`, `invalidChoiceIssue`, `invalidAbilityScoresIssue`, `tooFewChoicesIssue`, `tooManyChoicesIssue`, `unsupportedChoiceIssue`, `staleRevisionIssue`, `duplicateFillIssue`, `unknownHoleIssue`                                                                                                                                                                                                                                                                      |
| Applying accepted fills   | `applyCreationFills`, `requireHole`, `applyCreationFill`, `applyDraftFill`, `applyUnitFill`, `selectedChoiceOption`, `requireSelectedUnitIds`, `requireOneOptionId`, `requireSelectedUnitId`, `requireAcceptedChoiceOption`, `requireStartingLanguages`, `requireAlignmentSelection`, `requireBackgroundAbilityScoreIncreaseSelection`                                                                                                                                              |
| Final legality            | `finalizedSelections`, `temporarySupportedSliceIssues`, `allFinalizedChoicesSupported`, `supportedStartingEquipmentCoinGrantChoice`, `choiceSelection`, `unitChoiceSelection`, `choiceSelectionWithOptions`, `selectedChoiceOptionRecord`, `expectedValueIssue`, `illegalFinalizationIssue`, `isSupportedSingleClassAdvancement`, `isSupportedBackgroundAbilityScoreIncrease`, `isSupportedManifestBackgroundAbilityScoreIncrease`, `sameBackgroundAbilityScoreIncreaseSelection`, `sameChoiceSelectionMultiset`, `sameOptionIdMultiset` |
| Build projection          | `buildCharacterBuild`, `characterBuildUnitRefs`, `requireReadable`, `applyBackgroundAbilityScoreIncrease`, `abilityModifier`, `finalizedBuildSkillProficiencies`, `finalizedBuildToolProficiencies`, `resourceForFeature`, `unitRefs`, `uniqueValues`, `nonEmptyReadonlyArray`                                                                                                                                                                                                      |

## Connascence Notes For Future Readers

Several facts must change together:

- Support-profile constants such as `SUPPORTED_CLASS_UNIT_IDS`,
  `SUPPORTED_ADVANCEMENTS`, supported option ids, and
  `temporarySupportedSliceIssues` all encode the currently executable creation
  slice.
- `CreationHoleSource` and `holeIdForSource` are coupled by name and meaning:
  changing one requires changing fill ids, tests, and the Quint slice.
- Choice cardinality, accepted option metadata, and selection suppression are
  coupled by algorithm in `choiceFillIssues`, `choiceOptionIdsFitHole`, and
  `choiceSelectionMatchesHole`.
- Equipment purchase and loadout are intentionally ordered: loadout holes depend
  on a valid purchase selection and `hasPurchasedUnit`.
- `applyDraftFill("draft.advancement.initial")` creates the single-class
  advancement entry selected from `supportedAdvancements`; finalization later
  checks that entry with `isSupportedSingleClassAdvancement`.

When extending the runtime beyond this Orc Soldier Fighter vertical, update the
runtime, tests, Surface records/readers if needed, and
`character-creation-runtime-slice.qnt` together.
