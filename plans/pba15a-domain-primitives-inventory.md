# PBA15A Domain Primitive Inventory

Task: PBA15A - Migrate Surface And Character-Creation Domain Primitives

Status: source-inventory evidence. This file classifies primitive candidates; it
does not implement the migrations.

## Inventory Method

Required inputs read:

- `plans/ACTIVE_PLAN.md` Task 65.
- `plans/pba15a-domain-primitives-research-plan.md`.
- `UBIQUITOUS_LANGUAGE.md`.
- `packages/character-creation-runtime/VOCABULARY.md`.

Primary searches:

```sh
rg -n "\b(Schema\.Number|Schema\.String|: number\b|: string\b|ReadonlyMap<string|Record<string)" packages/surface/src/surface packages/character-creation-runtime/src -g '*.ts' -g '!*.test.ts'
rg -n "readonly .*UnitRecord\[\"id\"\]|UnitRecord\[\"id\"\]\[\]|readonly itemId: string|UnitRecord\[\"id\"\]" packages/character-creation-runtime/src -g '*.ts' -g '!*.test.ts'
rg -n "(id|unitId|spellId|monsterId|itemId|displayName|name|label|description|section|provenance): Schema\.String|NonEmptyStringSchema|StatBlockValueSchema|SixAbilityScoresSchema|CreatureSpeedSchema|CreatureLimitedUseSchema|CreatureLegendaryActionsSchema|strengthRequirement|weightPounds|costGp|spellSlotProjection|draft_owned_item" packages/surface/src/surface -g '*.ts' -g '!*.test.ts'
rg -n "ReadonlyMap<.*(string|UnitId|StatBlockId)|Record<.*string|new Map<|records\.set|records\.get|duplicate.*Id|unknown.*Reference" packages/surface/src/surface packages/character-creation-runtime/src -g '*.ts' -g '!*.test.ts'
rg -n "AbilityScoreAssignment|Readonly<Record<Ability, number>|Record<Ability, number>|assignedScores" packages -g '*.ts' -g '!*.test.ts'
```

The broad search was intentionally noisy. Classification used the research-plan
Core-removal relevance test: a primitive is PBA15A-relevant when it is stored in
`CharacterDraft`, `CharacterBuild`, creation holes/fills, support profiles, MCP
session handoff, or Surface records consumed by those flows; when it replaces a
Core helper/projection; or when leaving it raw would preserve adapters or
protocol comments during PBA16-PBA27.

## RAW And UL Evidence

RAW anchors consulted in `.references/srd-5.2.1/`:

- `Character-Creation.md`: character level and XP, languages, ability-score
  methods, Point Cost budget, background ASI cap, level-1 HP, Hit Dice, level
  advancement, multiclass prerequisites, multiclass Hit Points/Hit Dice, and
  multiclass Proficiency Bonus.
- `Playing-the-Game.md`: ability-score range, DC/AC target number language,
  Speed/movement in feet, HP bounds, Death Saving Throws, and Temporary HP.
- `Equipment.md`: weapon/armor cost and weight, armor Strength requirements,
  armor AC projections, shield training, and item/container weights.
- `Monsters/Overview.md`: Stat Block AC, HP, Speed, Ability Scores, Languages,
  CR/PB, Legendary Actions, and Recharge notation.

UL evidence:

- `UBIQUITOUS_LANGUAGE.md` distinguishes Character Sheet from Stat Block. PCs
  use Character Sheets; monsters use Stat Blocks; both project creature-level
  combat facts such as AC, HP, Speed, and Ability Scores.
- `packages/character-creation-runtime/VOCABULARY.md` defines Character Draft as
  mutable session-owned state, Character Build as finalized build-only PC data,
  Creation Hole/Fill as the fill protocol, Support Profile as a runtime support
  boundary rather than provenance, and source-shaped finalization checks as the
  intended replacement for authored-id dispatch.
- The research plan distinguishes provenance, structured input, and runtime
  projection. SRD provenance belongs to shipped Surface collections; 5e-tools
  style structured input is not provenance.

## In Scope For PBA15A

| Candidate | Current evidence | Classification and rationale |
| --- | --- | --- |
| `AbilityScoreAssignment` values in draft/fill/build | `packages/shared-algebras/src/ability-score-algebra.ts` defines `Readonly<Record<Ability, number>>`; `packages/character-creation-runtime/src/types.ts` stores it in ability-score fills, draft selections, and `CharacterBuildAbilityScores`. `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts` already parses multiclass scores to shared `AbilityScore`. | **In scope.** RAW gives ability scores a 1-20 creature range with monsters up to 30, Point Buy scores 8-15, and background ASI cap 20. This is durable `CharacterDraft`/`CharacterBuild` state and directly participates in Core removal. Recommended owner: shared-algebras should parse ability-score assignments to `AbilityScore` or a narrower creation-assignment type, then character creation should store the parsed type. |
| `CharacterBuildLoadout.itemId` | Current `packages/character-creation-runtime/src/types.ts` uses `CharacterEquipmentItemId<"main">` and `CharacterEquipmentItemId<"off">`; `finalization.ts` constructs item ids through `characterEquipmentItemId`; MCP and battle handoff use `characterEquipmentItemSourceFromId`. | **In scope and currently satisfied.** This durable build equipment identity is no longer an unparsed composite string. Keep the source/key isomorphism tests and do not reintroduce string composition in downstream packages. |
| Unit-choice and loadout source identities | `packages/character-creation-runtime/src/types.ts` already has `UnitChoiceSourceUnitId`, `LoadoutEquipmentUnitId`, `UnitChoiceSourceKey`, `LoadoutSourceKey`, and `CreationHoleIdText` branches for `cc:unit-source:` and `cc:loadout-source:`. `packages/character-creation-runtime/src/finalization.ts` keys finalization maps by the branded source keys. | **In scope and currently satisfied in the dirty baseline.** This is exactly the first/second implementation slice from the research plan: creation-hole identity is now source-shaped rather than separator-parsing `cc:unit:${unitId}:${choiceKey}`. Keep property/isomorphism tests with the implementing lane. |
| Support-profile ids and option ids | `packages/character-creation-runtime/src/support-gates.ts` stores `CreationChoiceOptionId` for options but still uses `UnitRecord["id"]` for supported background, equipment, manifest, and loadout Unit ids. `packages/character-creation-runtime/src/phase1-manifest.ts` owns many Unit id constants as plain literals satisfying `UnitRecord["id"]`. | **In scope, sequence after Surface id ownership.** Support Profile is explicitly not provenance, but it is a durable support/finalization boundary. The option ids are already branded. Unit ids should not get a character-creation-local duplicate brand if Surface can own `UnitId`; migrate after deciding whether Surface Unit ids become branded at the schema/catalog boundary. |
| Surface Unit ids and Unit-sourced choice ids | `packages/surface/src/surface/schema-nonspell.ts` uses `NonEmptyStringSchema` for Unit metadata ids, starting-equipment choice ids, `unitId`, `spellId`, `originFeatId`, and class feature grant ids. `packages/surface/src/surface/unit-catalog.ts` defines `UnitId = UnitRecord["id"]` and validates duplicate/unknown refs in the catalog. | **In scope, high leverage.** Unit ids flow into `CharacterDraft`, holes/fills, support gates, finalization, and `CharacterBuild`. A Surface-owned `UnitId`/choice-id parse boundary would avoid duplicate character-creation brands. Preserve the existing SRD collection provenance boundary when doing this. |
| Character-creation spell slot capacity | `packages/surface/src/surface/schema-nonspell.ts` has `spellSlotProjection.slots[].spellLevel` as positive integer and `count` as non-negative integer; `packages/character-creation-runtime/src/types.ts` projects them to `CharacterBuildSpellSlotCapacity`. | **In scope.** Character Build carries starting Spell Slot capacity, and RAW says multiclass spell slots are spell-slot levels usable for lower-level spells. Existing shared `SpellSlotLevel` and `ResourceCount` are better owners than anonymous positive/non-negative integers. The field name is also runtime-flavored authored Surface language; the research plan suggests `startingSpellSlotCapacity`. |
| Character progression class levels | `packages/character-creation-runtime/src/character-progression-types.ts` stores `CharacterProgressionClassLevel.classLevel` as `CharacterClassLevel`; invalid issue payloads keep raw numbers. `classLevelForUnit` returns a number but is immediately wrapped by `characterClassLevel` for durable projection. | **In scope and mostly satisfied.** RAW level range is 1-20. The remaining raw numbers are helper/intermediate or error payloads, not durable state. If future code stores per-class levels, reuse `CharacterClassLevel` or converge with shared `ClassLevel`; do not add a second local brand. |
| Hit Point maximum and Hit Dice in `CharacterBuild` | `packages/character-creation-runtime/src/types.ts` stores HP maximum as shared `HP`, and class Hit Dice as `HitDieSize`/`HitDieTotal`. `finalization.ts` derives those from class facts and progression. | **In scope and currently acceptable.** RAW separates PC class Hit Dice recovery from monster stat-block Hit Point Dice. The runtime type already preserves this distinction and does not store current HP or remaining Hit Dice on `CharacterBuild`. |

## Deferred

| Candidate | Current evidence | Deferral rationale |
| --- | --- | --- |
| Surface equipment scalar facts: `costGp`, `weightPounds`, `strengthRequirement`, `donMinutes`, `doffMinutes`, container weight/volume | `packages/surface/src/surface/schema-nonspell.ts` and `schema-base.ts` use raw `Schema.Number` or local positive/non-negative schemas for equipment facts. | RAW clearly names GP cost, pounds, armor Strength requirements, and don/doff times, so these deserve Surface-local brands. They are deferred behind identity/build scalars because they are broad authored Surface content and do not by themselves force Core character-creation adapters to remain. |
| Surface Stat Block scalars: AC, HP, Speed, ability scores, initiative, attack bonus, DC, Recharge, Legendary Action uses, CR-ish values | `packages/surface/src/surface/schema-spell.ts` defines `StatBlockValueSchema`, `SixAbilityScoresSchema`, `CreatureSpeedSchema`, `CreatureLimitedUseSchema`, `CreatureLegendaryActionsSchema`, and Stat Block records with raw numbers. `packages/surface/src/surface/stat-block-catalog.ts` has an SRD collection boundary but `StatBlockId = StatBlockRecord["id"]`. | RAW/UL evidence is strong, but Stat Blocks are monster-authored Surface records, not Character Builds. Defer to a Stat Block/battle-runtime projection lane unless a specific PBA16-PBA27 Core-removal adapter needs them sooner. When migrated, use existing shared `ArmorClass`, `HP`, `MovementFeet`, `AbilityScore`, `AttackBonus`, `DifficultyClass`, and `ResourceCount` where the runtime meaning matches; use Surface-local brands for Recharge minimum roll and Legendary Action use count if they remain authored-only. |
| Spell/effect broad authored numbers: ranges, radii, durations, dice, thresholds, DCs, object AC/HP, summoned-creature controls | The broad search in `schema-spell.ts` returns many `Schema.Number` fields across spell mechanics. | Most are authored Surface payload facts. They should migrate by mechanics family when that family gets runtime projection, not as PBA15A's character-creation source-inventory slice. This avoids mixing unrelated spell-content cleanup with Core character-creation deletion. |
| `ClassFeatureGrantSchema.level` and class feature level filters | `packages/surface/src/surface/schema-nonspell.ts` uses `PositiveIntegerSchema`; character creation filters grants by selected class level. | Deferred because current character-creation projection already narrows selected class levels with `CharacterClassLevel`. Surface class feature levels should later use `CharacterClassLevel`/`ClassLevel` at parse time so unsupported levels cannot leak into feature grants. |
| `draft_owned_item` naming | `packages/surface/src/surface/schema-nonspell.ts` has `StartingEquipmentItemRefSchema` branch `draft_owned_item`. | Deferred naming cleanup. It is authored starting-equipment content, not runtime draft state. Rename later to something provenance-neutral such as `authored_item_text` or `non_unitized_item`, with migration of content JSON/Dhall. |

## Out Of Scope For PBA15A

| Candidate | Evidence | Rationale |
| --- | --- | --- |
| Display labels, descriptions, messages, `displayName`, and most `name` fields | Broad searches hit many `label: string`, `description: Schema.String`, `message: string`, and `displayName: Schema.String` fields. | These are descriptive text unless they become stable parser inputs or persisted protocol ids. They do not block Core removal. |
| Provenance `section: string` | `packages/surface/src/surface/schema-base.ts` defines provenance as `{ kind: "srd-5.2.1" | "xphb"; section: string }`; Unit and Stat Block catalogs reject mixed provenance for SRD collections. | The provenance boundary is already explicit at the collection level. `section` is source citation text, not runtime identity. Do not brand it in PBA15A. |
| Error and diagnostic payload raw values | Character-creation parse issues carry raw `value: string`, `lengthText: string`, invalid `classLevel: number`, and `message: string`. | These preserve rejected input for diagnostics. They are not accepted domain state. |
| Private maps already keyed by branded keys | `fill-reducer.ts` maps holes by `CreationHoleId`; `finalization.ts` maps by `UnitChoiceSourceKey` and `LoadoutSourceKey`; `unit-catalog.ts` maps by `UnitId` alias internally. | Private maps are acceptable when the key type is already branded or when the map is an internal catalog implementation that is not parsed back from a persisted composite key. |
| Test-support bridge map | `packages/character-creation-runtime/src/qnt-loadout-bridge.test-support.ts` uses `Readonly<Record<string, LoadoutSlot>>`. | Test-support only. It can remain raw unless the bridge becomes a production parser or persisted protocol surface. |

## Current Baseline Issues To Hand Off

1. `AbilityScoreAssignment` still stores raw `number` while adjacent multiclass
   algebra already uses shared `AbilityScore`. This is the highest-value scalar
   migration for PBA15A after source identity.
2. Surface `UnitId` is only an alias for `UnitRecord["id"]`. Character creation
   should not add more local Unit id brands until Surface owns that id at the
   schema/catalog boundary.
3. `spellSlotProjection` is runtime-projection language inside authored class
   content. The value itself is in scope for `SpellSlotLevel`/`ResourceCount`;
   the name should move toward authored creation language such as
   `startingSpellSlotCapacity`.

## Recommended Migration Order

1. Done: source-key isomorphism tests and production flow for
   `UnitChoiceSourceKey`, `LoadoutSourceKey`, `CreationHoleId`, and
   `CharacterEquipmentItemId`.
2. Next: parse `AbilityScoreAssignment` into shared `AbilityScore` values before
   storing it in `CharacterDraft`, `CreationFill`, or `CharacterBuild`.
3. Move Surface Unit ids and Unit-sourced choice ids to Surface-owned branded
   types, then thread them through support gates and Character Build.
4. Migrate `spellSlotProjection` values to `SpellSlotLevel`/`ResourceCount` and
   rename the authored Surface field when the content migration lane can own the
   JSON/Dhall churn.
5. Schedule equipment and Stat Block scalar brands by Surface family, not as a
   single repository-wide primitive sweep.

## Verification

Verification performed:

- Initial inventory started from a worktree whose `HEAD` matched `master` at
  that time. Follow-up UL fixes rechecked the branch after `master` advanced to
  `4fa254d6`; this worktree remained at `6b7d1a34`, and `git rebase master` was
  blocked by the seeded unstaged PBA15A implementation baseline.
- Ran the required/adapted `rg` inventory searches listed above.
- Consulted local RAW and Ubiquitous Language anchors listed above.
- This worktree includes the seeded dirty PBA15A implementation baseline. The
  source-inventory lane originally added only this inventory doc; follow-up UL
  fixes also updated the narrow production/schema files needed to match the
  review/simplify and MCP schema shapes without reverting baseline edits.
- After installing dependencies with `pnpm install --frozen-lockfile --offline`,
  focused typechecks passed for `@dnd/character-creation-runtime` and
  `@dnd/mcp`.
