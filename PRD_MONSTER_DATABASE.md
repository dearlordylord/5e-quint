# PRD: SRD Monster Database and Generic Monster Ability Model

Date: 2026-04-11

Status: Draft

Owner: Core / battle architecture

## Goal

Add a scalable monster database to core that:

- ships SRD-backed monster stat blocks with explicit SRD provenance;
- uses 5e-tools as structured input and normalization inspiration only, never as provenance;
- avoids per-monster hardcoded TypeScript behavior for non-SRD monsters;
- projects monster-authored content onto existing generic battle/runtime surfaces instead of creating monster-specific MCP or UI APIs;
- remains aligned with the repo's ubiquitous language: monsters have **Stat Blocks**, PCs have **Character Sheets**, and combat is written against **creatures**.

## Non-Goals

- Do not add licensed non-SRD monster content to the shipped catalog in this phase.
- Do not add a second MCP-owned or app-owned monster registry.
- Do not add a freeform automation interpreter or arbitrary embedded callbacks.
- Do not treat 5e-tools as provenance.
- Do not force every imported monster ability to be fully automated before the monster can exist in the database.
- Do not invent homebrew mechanics, extrapolated rules, or non-SRD semantics.

## Background

The repo already established the correct ownership direction:

- core owns named monster stat blocks;
- adapters reference stat block IDs instead of duplicating RAW literals;
- monster-specific behaviors should land as generic battle surfaces when possible;
- `Creature` is the shared combat abstraction, while `Stat Block` remains monster-only language.
- SRD is provenance; 5e-tools is structured data and pattern inspiration, but never a provenance source.

Relevant current files:

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md)
- [plans/ACTIVE_PLAN.md](./plans/ACTIVE_PLAN.md)
- [packages/core/src/monster-types.ts](./packages/core/src/monster-types.ts)
- [packages/core/src/monster-catalog.ts](./packages/core/src/monster-catalog.ts)
- [packages/core/src/monster-catalog.md](./packages/core/src/monster-catalog.md)

Current support is intentionally narrow and goblin-motivated. It proves the ownership shape, but not the full database shape.

## Problem

The current monster catalog is too small and too specialized for a full SRD monster corpus.

Current gaps:

- `StatBlock` is still close to "goblin plus a few monster resource fields" rather than a durable monster-authored schema.
- Authored monster sections such as Traits, Actions, Bonus Actions, Reactions, Legendary Actions, and Spellcasting are not modeled as first-class typed sections.
- Current automation support is implicit and partial rather than explicit per ability.
- There is no import pipeline that distinguishes canonical provenance from convenience input sources.
- The current shape risks drifting into monster-by-monster special handling if expanded naively.

If we keep extending the catalog ad hoc, the likely failure modes are:

- per-monster custom handlers;
- duplicated ability data between core, MCP, and UI layers;
- unclear provenance and licensing boundaries;
- a second class of runtime-only monster flags that diverges from authored stat block data.

## Product Requirements

### R1. Core-Owned Canonical Monster Catalog

The project must have a single core-owned canonical monster catalog for shipped monsters.

- The catalog must live in `packages/core`.
- MCP, app, and other adapters must reference monster IDs or derived projections from core.
- No downstream layer may restate monster-authored RAW facts as its own source of truth.

### R2. Explicit Provenance

Every shipped monster record must carry explicit provenance.

- Shipped SRD monsters must cite the local SRD corpus in `.references/srd-5.2.1/`.
- 5e-tools may be recorded as a supporting structured input used during normalization or cross-checking, but never as provenance.
- The provenance shape must make source kind and license visible to both humans and tooling.

### R3. Data-Driven Monster Content

Monster content must be authored as data, not as per-monster code paths.

- Monster records must store authored sections such as Traits, Actions, Bonus Actions, Reactions, Legendary Actions, and Spellcasting as typed data.
- Executable semantics must be represented via reusable generic execution forms.
- Adding a new monster should usually mean adding data, not engine code.

### R4. Unsupported Abilities Must Be Represented Structurally

A monster ability may exist in the catalog even if it is not yet executable.

- Rules text must remain available even when execution support is absent.
- The type system should distinguish executable abilities from text-only abilities directly, rather than through a status enum with no runtime or type consequences.
- The database must not block on complete automation coverage.

### R5. Generic Engine Facilities, Not Monster-Specific APIs

When an ability needs execution semantics, it must target a generic engine facility.

- Example categories: attack, multiattack, save effect, condition rider, forced movement, spellcast reference, bonus-action option, reaction option, recharge gate, legendary-action option.
- If a new mechanic is common enough to justify support, add one new generic facility and map many monsters to it.
- Do not add `runMonsterX()` or monster-named MCP commands.

### R6. Catalog/Source Separation

The system must distinguish:

- raw imported source records;
- normalized canonical stat blocks;
- runtime battle projections.

These are different layers and must not be collapsed into one mutable shape.

### R7. No Redundant State Across Layers

Monster-authored facts must not be duplicated into parallel registries or adapter-only state.

- Runtime battle state may contain derived projections needed for combat execution.
- Those projections must derive from the canonical stat block exactly once.
- Adapter-facing surfaces must consume those projections, not recreate them.

### R8. Ubiquitous Language Compliance

The monster database must use the repo's existing D&D language:

- `Stat Block` for monster-authored records.
- `Creature` for the shared combat abstraction.
- `Character Sheet` remains the PC-authored/derived equivalent and must not be conflated with `Stat Block`.

### R9. SRD-First Distribution Policy

The first shipped database expansion must target SRD monsters only.

- Non-SRD, licensed, or homebrew monster packs may be supported later as separate sources or packs.
- Their support must reuse the same canonical schema and projection path.
- They must remain clearly segregated by provenance and distribution policy.

## Proposed Domain Model

Three durable layers are required.

### 1. `MonsterSourceRecord`

Purpose: capture source citations and any supporting structured references used while authoring normalized records.

Suggested shape:

```ts
type MonsterSourceKind = "canonicalRulesText" | "supportingStructuredInput" | "licensedPack" | "homebrewPack"

interface MonsterSourceRecord {
  readonly sourceRecordId: string
  readonly sourceKind: MonsterSourceKind
  readonly sourceName: string
  readonly sourceVersion: string
  readonly canonicalUrl?: string
  readonly license: string
  readonly provenanceText: string
  readonly raw: unknown
}
```

Rules:

- `MonsterSourceRecord` is not consumed directly by battle.
- It exists so provenance and supporting references are inspectable.
- `supportingStructuredInput` covers datasets such as 5e-tools. This is a supporting-reference classification, not a provenance classification.

### 2. `MonsterStatBlock`

Purpose: canonical normalized authored monster record.

Suggested shape:

```ts
interface MonsterStatBlock {
  readonly id: string
  readonly name: string
  readonly creatureType: CreatureType
  readonly descriptiveTags?: ReadonlyArray<string>
  readonly creatureSize: Size
  readonly alignment?: string

  readonly ac: ArmorClass
  readonly initiativeMod: AbilityModifier
  readonly maxHp: number
  readonly hitDice: number
  readonly hitDieType: number
  readonly speeds: Readonly<Record<SpeedType, number>>
  readonly abilityScores: Readonly<Record<Ability, number>>

  readonly saveProficiencies: ReadonlySet<Ability>
  readonly skillBonuses: Readonly<Record<Skill, number>>
  readonly proficiencyBonus: number

  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly damageImmunities: ReadonlySet<DamageType>
  readonly conditionImmunities: ReadonlySet<Condition>
  readonly exhaustionImmune: boolean
  readonly qualifiedPhysicalDefenses?: ReadonlyArray<QualifiedPhysicalDefenseDef>

  readonly senses: Readonly<Record<SenseType, number>>
  readonly passivePerception?: number
  readonly languages?: ReadonlyArray<string>

  readonly cr: ChallengeRating
  readonly xp?: number

  readonly traits: ReadonlyArray<MonsterTraitDef>
  readonly actions: ReadonlyArray<MonsterActionDef>
  readonly bonusActions: ReadonlyArray<MonsterBonusActionDef>
  readonly reactions: ReadonlyArray<MonsterReactionDef>
  readonly legendaryActions: ReadonlyArray<MonsterLegendaryActionDef>
  readonly spellcasting?: ReadonlyArray<MonsterSpellcastingDef>

  readonly legendaryActionUses: number
  readonly legendaryResistanceUses: number
  readonly rechargeAbilities: Readonly<Record<string, RechargeAbilityDef>>
  readonly dailyAbilities: Readonly<Record<string, number>>
  readonly inLair: boolean

  readonly provenance: MonsterProvenance
  readonly sourceRecordIds: ReadonlyArray<string>
}
```

### 3. Battle Projection

Purpose: derive runtime battle initialization and battle-owned execution facts from the canonical stat block.

Rules:

- This is not a stored catalog layer.
- It is a one-way projection into `InitCreatureConfig` and battle-owned runtime fields.
- Battle may store derived facts needed for legality or execution, but those facts must derive from the stat block rather than duplicating authoring elsewhere.

## Authored Ability Types

Authored sections should follow the same pattern:

```ts
interface MonsterUsageDef {
  readonly recharge?: { readonly min: number }
  readonly dailyUses?: number
  readonly legendaryCost?: number
}

interface MonsterAbilityBase {
  readonly id: string
  readonly name: string
  readonly rulesText: string
  readonly usage?: MonsterUsageDef
}

interface ExecutableMonsterAbility extends MonsterAbilityBase {
  readonly execution: MonsterExecutionDef
}

interface TextOnlyMonsterAbility extends MonsterAbilityBase {
  readonly execution?: undefined
  readonly nonExecutableReason:
    | "needsGenericFacility"
    | "needsSpellcastingFoundation"
    | "needsRulesResearch"
    | "outOfScopeForCurrentSurface"
}
```

Then:

- `MonsterTraitDef extends MonsterAbilityBase`
- `MonsterActionDef extends MonsterAbilityBase`
- `MonsterBonusActionDef extends MonsterAbilityBase`
- `MonsterReactionDef extends MonsterAbilityBase`
- `MonsterLegendaryActionDef extends MonsterAbilityBase`

This keeps authored text and executable semantics side by side while making the supported/unsupported split visible in both the type system and runtime data.

## Generic Execution Model

Executable monster abilities must target a closed set of generic forms.

Suggested first pass:

```ts
type MonsterExecutionDef =
  | { readonly tag: "Attack"; readonly attack: AttackExecution }
  | { readonly tag: "Multiattack"; readonly sequence: ReadonlyArray<MultiattackStep> }
  | { readonly tag: "SaveEffect"; readonly save: SaveEffectExecution }
  | { readonly tag: "Spellcast"; readonly spell: SpellcastReferenceExecution }
  | { readonly tag: "BonusOption"; readonly option: BonusActionOptionExecution }
  | { readonly tag: "ReactionOption"; readonly option: ReactionOptionExecution }
  | { readonly tag: "Passive"; readonly passive: PassiveMonsterEffectExecution }
```

Design rule:

- If a monster ability cannot be represented by an existing generic form, the next step is to add one new generic form, not one monster-specific handler.

## Provenance Model

Suggested shape:

```ts
interface SourceCitation {
  readonly sourceName: string
  readonly sourceKind: "canonicalRulesText" | "supportingStructuredInput"
  readonly citation: string
  readonly license: string
  readonly role: "provenance" | "normalizationInput" | "crossCheck"
}

interface MonsterProvenance {
  readonly provenance: SourceCitation
  readonly supportingInputs?: ReadonlyArray<SourceCitation>
}
```

Rules:

- For shipped SRD monsters, `provenance.sourceKind` is always `canonicalRulesText` and the citation points to the local SRD corpus.
- 5e-tools may appear only in `supportingInputs` with role `normalizationInput` or `crossCheck`.

### Collection-Level Provenance Policy

Do not model catalog provenance as loose per-record literals only. Make invalid collection states unrepresentable at the collection boundary.

Suggested shape:

```ts
interface MonsterCatalog<TRecord, TProvenance extends SourceCitation> {
  readonly provenancePolicy: TProvenance
  readonly records: Readonly<Record<string, TRecord>>
}

type SrdMonsterCatalog = MonsterCatalog<
  MonsterStatBlock,
  {
    readonly sourceKind: "canonicalRulesText"
    readonly sourceName: "srd-5.2.1"
    readonly license: "CC-BY-4.0"
    readonly citation: string
    readonly role: "provenance"
  }
>
```

Rules:

- A shipped SRD catalog should be an `SrdMonsterCatalog`, not a loose mixed-license bag of records.
- Mixed-source views, if needed later, are integration views rather than canonical collections.

## Authoring Model

The first SRD monster dataset should be hand-authored in core.

Rules:

- Do not assume an importer or code-generation step.
- Accept some non-DRY repetition when it keeps provenance explicit and the owned dataset easy to inspect.
- Show SRD provenance directly on authored records.
- Supporting structured references such as 5e-tools may inform authoring and review, but they do not become the source of truth.

Possible future tooling:

- validation scripts;
- coverage reports;
- consistency checks against supporting structured references.

Those tools may assist authoring later, but they are not part of the initial design requirement.

## Runtime Projection Rules

Projection from `MonsterStatBlock` into battle must follow these rules:

- stat block facts project into `InitCreatureConfig` exactly once;
- generic bonus-action and reaction options are derived from authored sections rather than stored separately as the primary authored shape;
- executable attacks project into the existing battle attack lane through generic attack metadata;
- spellcasting entries should reference existing spell IDs and generic spell execution surfaces where possible;
- multiattack remains monster-authored data, not a fake PC-style `Extra Attack`.

## Migration Plan

### Phase 1: Introduce Canonical Schema

Add the new type family without breaking current goblin flows.

Deliverables:

- widened monster type definitions;
- provenance types;
- authored section types;
- executable vs text-only ability split.

### Phase 2: Backfill Goblins Into New Shape

Convert current goblin records into canonical authored sections.

Deliverables:

- goblin traits/actions/bonus actions/reactions stored in the new shape;
- compatibility projection helpers so current tests keep passing.

### Phase 3: Derive Battle Options From Authored Sections

Move current shortcut fields behind derivation.

Deliverables:

- derive `battleBonusActionOptions` from bonus actions;
- derive reaction surfaces from reactions;
- keep public MCP tokens generic.

### Phase 4: Expand The Hand-Authored SRD Dataset

Add the broader SRD monster corpus directly in core using the widened canonical schema.

Deliverables:

- source citations and supporting references where useful;
- hand-authored normalized SRD dataset;
- a manual or scripted report on unsupported ability patterns.

### Phase 5: Expand Generic Facilities

Use validation findings to add generic support where repeated monster patterns justify it.

Likely early targets:

- recharge breath weapons;
- save-for-condition attack riders;
- spellcasting sections;
- multiattack sequences;
- legendary action menus.

### Phase 6: Separate Future Non-SRD Packs

Only after the canonical SRD path is stable:

- add support for separately tagged non-SRD, licensed, or homebrew packs;
- reuse the same schema and projection path;
- keep distribution and provenance policy explicit.

## Success Criteria

This PRD succeeds when all of the following are true:

- adding a new SRD monster usually means adding normalized data, not engine code;
- shipped SRD monster records cite SRD provenance explicitly;
- 5e-tools is useful as a supporting structured reference without becoming provenance;
- battle/MCP/app do not maintain their own monster registries;
- unsupported monster abilities can still exist as text-only entries with explicit reasons;
- generic engine facilities, not monster-specific handlers, are the normal route for automation expansion.

## Risks

### Risk 1: Overfitting to Current Goblin Shape

The current catalog can mislead implementation toward attack-only monsters with a few flags.

Mitigation:

- widen the authored section model before large-scale import.

### Risk 2: Automation Scope Explosion

Trying to fully automate every monster ability before expanding the SRD corpus will stall the database effort.

Mitigation:

- allow text-only entries with explicit non-executable reasons.

### Risk 3: Provenance Drift

Using 5e-tools as a convenience source can accidentally become de facto provenance if source roles are not explicit.

Mitigation:

- require `MonsterProvenance` on every shipped record;
- keep SRD citations mandatory for shipped SRD monsters;
- keep 5e-tools out of provenance-bearing fields entirely.

### Risk 4: Parallel Runtime Flags

New battle or MCP flows could add monster-specific flags detached from authored sections.

Mitigation:

- derive runtime options from canonical authored data;
- reject adapter-owned monster registries.

## Recommended Next Step

Implement Phase 1 only:

- widen `monster-types.ts` into the canonical schema and authored ability types;
- backfill current goblins into that schema without changing public MCP behavior;
- keep the broader SRD hand-authoring pass as the follow-up task.

## Current Answers To Immediate Design Questions

- `MonsterStatBlock` vs `StatBlock`: use `StatBlock` as the canonical domain type name. `Stat Block` is already the repo's monster-only domain term, so the `Monster` prefix is redundant. If transition safety is needed, keep `MonsterStatBlock` only as a temporary alias to `StatBlock` and remove it later. Avoid inheritance-heavy modeling; composition wins.
- XP: omit until a real consumer exists.
- First-pass spellcasting normalization: normalize the stable structural parts now and keep tactical/procedural prose as text. Normalize spellcasting section identity, casting ability, authored save DC / attack bonus, spellcasting level where relevant, spell references, and usage/frequency buckets such as at-will, per-day, and slots. Keep target-selection prose, tactical preferences, exception clauses, and anything that would require brittle parsing or a new spellcasting execution engine as authored text. The first pass should support rendering, lookup, legality projection, and later automation, not full spellcasting execution.
- Dataset authoring model: do not generate the initial SRD dataset. SRD 5.2.1 is stable enough that the repo can accept some non-DRY hand-authored data, with provenance shown directly on the owned records. Later tooling may validate or cross-check that dataset, but generation is not a requirement.
