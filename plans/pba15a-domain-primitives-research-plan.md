# PBA15A Research Plan - Surface And Character-Creation Domain Primitives

Task: PBA15A - Migrate Surface And Character-Creation Domain Primitives

Status: pre-researched. This file is planning evidence and implementation guidance only.

Scope clarification: PBA15A targets all Core-related primitive debt needed for
promoted character creation, MCP/session migration, and eventual Core deletion.
It does not require a whole-Surface/all-Units primitive cleanup before moving on.

Core-removal relevance test: a primitive belongs in PBA15A only if at least one
of these is true:

- it is stored in `CharacterDraft`, `CharacterBuild`, creation holes/fills,
  support profiles, MCP session handoff, or Surface records consumed by those
  flows;
- it is used to replace or avoid a Core helper, table, projection, or adapter;
- it participates in identity, ordering, source addressing, support gates, or
  replay/finalization contracts;
- leaving it raw would force later PBA16-PBA27 work to preserve adapters,
  duplicate maps, or comments explaining protocol shape.

Primitive cleanup is out of PBA15A when a value is merely a broad Surface
content scalar, descriptive label, or display string and does not affect Core
removal.

Composite-key isomorphism requirement: if a primitive is a composite protocol
key, persisted key, exported key, or any key that callers may need to inspect,
it must have an executable source/key isomorphism rather than an informal string
format. Property tests must prove both inverse laws:

- source facts -> key -> source facts equals the original source facts;
- key -> source facts -> key equals the original key;
- separator-like characters inside free-form components do not collide or
  misparse;
- invalid keys return typed parse failures rather than throwing.

Opaque private map keys may remain non-isomorphic only when no caller can obtain
or persist the key and the key is never parsed back into components. Prefer a
length-prefixed encoding for isomorphic keys whose components include
free-form authored ids.

First implementation slice: make Unit-choice source identity isomorphic. Add a
branded `UnitChoiceSourceKey` source/key isomorphism for `UnitChoiceSource`, use it for
finalization lookup maps, and migrate Unit-sourced `CreationHoleId` construction
and parsing away from `cc:unit:${unitId}:${choiceKey}` separator parsing so the
hole id preserves the same source identity without ambiguity.

Second implementation slice: split loadout identity out of Unit-choice identity.
Remove loadout slot keys from `UNIT_CHOICE_KEYS`, add a distinct
`LoadoutSource` and branded `LoadoutSourceKey` source/key isomorphism, and use
`cc:loadout-source:<LoadoutSourceKey>` for selected-equipment loadout holes.

Remaining slice estimate after the loadout split: about four to five domain
family slices, not one broad primitive sweep.

1. CharacterBuild equipment item identity: replace raw durable `itemId: string`
   and `main:${selectedUnitId}` composition with a package-owned
   `CharacterEquipmentItemId` boundary.
2. Character progression level primitives: converge remaining raw
   character-creation level numbers on shared level/domain types where they
   carry class-level meaning.
3. Surface class/level authored facts: brand or narrow `startingAtLevel`,
   `atLevel`, and `baseLevel` where they drive promoted creation/runtime
   behavior.
4. Surface authored numeric facts consumed by promoted flows: migrate
   Core-removal-relevant costs, weights, ranges, HP/DC-like facts, and similar
   values by domain family.
5. Split the Surface numeric slice further if equipment, spell, and Stat Block
   facts cause separate compile/test fallout. Do not include broad descriptive
   labels or whole-Surface cleanup unless the Core-removal relevance test above
   is met.

## Research Inputs

- RAW lens: no new D&D rule behavior is expected. RAW is relevant only as range/vocabulary evidence for branded values: ability scores, HP, Hit Dice, point cost, languages, stat block AC/HP/Speed, Recharge, Legendary Action uses, and movement distances.
- Ubiquitous-language lens: Surface authored content, character draft state, Character Build, Character Sheet, Stat Block, and runtime projection should remain distinct.
- Architecture lens: PBA13G settled promoted battle-runtime primitive debt; this task owns the deferred Surface-authored and character-creation-runtime primitive migration.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`: ability score range and combat scalar language.
- `.references/srd-5.2.1/Character-Creation.md`: character languages, alignment, point cost, HP, and Hit Dice.
- `.references/srd-5.2.1/Monsters/Overview.md`: stat block AC, HP, Speed, Recharge, and Legendary Action use counts.
- `ASSUMPTIONS.md` A0, A40, A41: Point Buy naming, loadout preconditions, and `walkFeet`.

## Ubiquitous Language Findings

- `CharacterBuild` is correctly separate from Character Sheet and should not gain current HP, Temporary HP, spent resources, or remaining Hit Dice.
- "Origin" is overloaded across feat category, background-origin feat, origin languages, and support-profile origin facts. A future implementation could either define Origin in `UBIQUITOUS_LANGUAGE.md` or use narrower names such as `backgroundOriginFeat`, `startingLanguages`, and `fixedCreationFacts`.
- Surface `draft_owned_item` sounds like runtime draft state even though it is authored starting-equipment shape. A name like `non_unitized_item` or `authored_item_text` would better preserve provenance.
- Surface `spellSlotProjection` is runtime-flavored language inside authored content. `startingSpellSlotCapacity` would better describe the authored creation fact.
- Completed split: `UNIT_CHOICE_KEYS` now describes authored Unit-backed choice families only, while selected-equipment loadout slots use `LoadoutSource` and `LoadoutSourceKey`.

## Architecture Findings

- Likely Surface files:
  - `packages/surface/src/surface/schema-base.ts`
  - `packages/surface/src/surface/schema-spell.ts`
  - `packages/surface/src/surface/schema-nonspell.ts`
  - `packages/surface/src/surface/types.ts`
  - `packages/surface/src/surface/unit-catalog.ts`
  - `packages/surface/src/surface/stat-block-catalog.ts`
- Likely character-creation files:
  - `packages/character-creation-runtime/src/types.ts`
  - `packages/character-creation-runtime/src/support-gates.ts`
  - `packages/character-creation-runtime/src/finalization.ts`
  - dependent callers in `discovery.ts`, `fill-reducer.ts`, `hole-factories.ts`, and `phase1-manifest.ts`.
- Existing shared scalar owners include `HP`, `MovementFeet`, `ClassLevel`, `ArmorClass`, `DifficultyClass`, `AttackBonus`, `SpellSlotLevel`, `ResourceCount`, and related constructors in `packages/shared/src/types.ts`.

## Suggested Implementation Shape

- Inventory primitives first by Core-removal relevance, then migrate by domain
  family rather than one broad scalar sweep.
- Shared brands would fit cross-package reducer facts already named by PBA13G: `MovementFeet`, `ClassLevel`, `SpellSlotLevel`, `ArmorClass`, `DifficultyClass`, `AttackBonus`, `ResourceCount`, `HP`, and `AbilityScore`.
- Surface-local brands would fit authored-only facts such as `GoldPieceCost`, `WeightPounds`, `RechargeMinimumRoll`, `LegendaryActionUseCount`, `MonsterChallengeRating`, `RandomTableOrder`, and possibly `SurfaceHoleId`.
- Character-creation-local brands would fit durable protocol/build identities such as `CharacterEquipmentItemId` and `UnitChoiceSourceKey`.
- `CharacterClassLevel` could converge on shared `ClassLevel` unless character creation needs a narrower phase-specific type.
- `unitChoiceSourceKey` could return a branded key or hide the composite string behind a helper returning a complete `ReadonlyMap<UnitChoiceSourceKey, ...>`.
- Completed split: selected-equipment loadout holes use a distinct `LoadoutSource` branch and source/key isomorphism instead of treating loadout slots as Unit-granted authored choices.
- Labels, descriptions, display names, and diagnostic messages can remain plain strings unless they become stable identifiers or parser inputs.

## Connascence Checks

- Branding Surface schemas changes derived `Schema.Schema.Type` outputs and should intentionally expose compile fallout.
- Unit and Stat Block ids are catalog/provenance boundary values. Branding them could ripple into support profiles, catalog maps, authored-id dispatch checks, and JSON decode tests.
- Booleans such as `intelligibleToAnyLanguageKnower` and `includesInfluenceActionOptions` may deserve literal variants if they represent domain states rather than plain flags.

## Verification Suggestions

- Source inventory:
  - `rg -n "\\b(Schema\\.Number|Schema\\.String|: number\\b|: string\\b|ReadonlyMap<string|Record<string)" packages/surface/src/surface packages/character-creation-runtime/src -g '*.ts' -g '!*.test.ts'`
- Focused checks:
  - `pnpm --filter @dnd/surface typecheck`
  - `pnpm --filter @dnd/surface test`
  - `pnpm --filter @dnd/character-creation-runtime typecheck`
  - `pnpm --filter @dnd/character-creation-runtime test`
  - `pnpm check:authored-id-dispatch`
- Character creation MBT/QNT would only seem necessary if reducer behavior or serialized bridge shapes change.
- `/simplify` convergence remains required after implementation.
