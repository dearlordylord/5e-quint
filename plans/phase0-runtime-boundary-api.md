# Phase 0 Runtime Boundary/API

Status: draft audit artifact for Phase 0  
Notes from audit:

- This draft uses `packages/surface-runtime-correction/VOCABULARY.md`, `ARCHITECTURE_GRAPH.md`, `MBT_TO_REDUCER_GRAPH.md`, and current reducer source.
- Phase 0 artifacts are present as `plans/phase1-fighter-manifest.md` and `plans/phase0-surface-unit-availability.md`. This draft follows their selected Orc Soldier Fighter / Goblin Warrior vertical and Surface package decision.
- Core files were read only to identify old facts and handoff shapes. The new green path must not preserve Core package boundaries.
- Review passes applied: RAW/SRD consistency, ubiquitous language, and architecture/depth. The tightened points are the explicit SRD Stat Block catalog boundary, Phase 1-only battle subjects, and stronger domain identities for holes, choices, seeds, and snapshot projections.

## Dependency Graph

Target dependency direction:

```text
@dnd/shared
  <- @dnd/shared-algebras

@dnd/surface
  <- @dnd/shared-algebras
  (only for algebra exports whose public interface intentionally speaks Surface)

@dnd/shared
  <- @dnd/character-creation-runtime

@dnd/shared
  <- @dnd/battle-runtime

@dnd/shared-algebras
  <- @dnd/character-creation-runtime

@dnd/shared-algebras
  <- @dnd/battle-runtime

@dnd/surface
  <- @dnd/character-creation-runtime

@dnd/surface
  <- @dnd/battle-runtime

@dnd/character-creation-runtime <- @dnd/mcp green-path composition
@dnd/battle-runtime             <- @dnd/mcp green-path composition
@dnd/surface                    <- @dnd/mcp green-path composition
```

Allowed green-path imports:

- `@dnd/character-creation-runtime` may import `@dnd/surface`, `@dnd/shared`, and `@dnd/shared-algebras` exports whose interfaces match creation runtime facts.
- `@dnd/battle-runtime` may import `@dnd/surface`, `@dnd/shared`, and `@dnd/shared-algebras`.
- `@dnd/mcp` green-path tools may import `@dnd/surface`, `@dnd/character-creation-runtime`, and `@dnd/battle-runtime`.

Forbidden green-path imports:

- `@dnd/character-creation-runtime` must not import `@dnd/core`.
- `@dnd/battle-runtime` must not import `@dnd/core`.
- MCP green-path files must not import `@dnd/core`.
- `@dnd/surface` must not import either runtime package.
- `@dnd/surface` must not import `@dnd/shared-algebras`; if an algebra needs Surface vocabulary, the dependency points from `@dnd/shared-algebras` to `@dnd/surface`, not the reverse.
- `@dnd/surface` must not depend on provenance-specific runtime behavior.

`@dnd/shared-algebras` is a package-level dependency, not a partial import boundary. Its current package may depend on Surface because `armor-class-algebra` intentionally speaks Surface armor/equipment vocabulary. New runtime packages should import algebra exports by named subpath and should not treat `@dnd/shared-algebras` as a content-language facade. If a new algebra would force broad Surface projection semantics into both runtimes, keep that projection local to the owning runtime instead.

Package strategy recommendation: rename/promote `@dnd/surface` to `@dnd/surface`, following `plans/phase0-surface-unit-availability.md`. This is a greenfield stack with no external consumers, so preserving a prototype package name through a facade adds ambiguity without compatibility value. Green-path imports and active project docs should only use `@dnd/surface`.

## `@dnd/surface` API

`@dnd/surface` owns authored content schemas and structural readers. It does not own reducer state, action legality, draft/session state, or battle execution.

Exports for the first vertical:

```ts
export type UnitRecord;
export type SpellRecord;
export type ClassRecord;
export type ClassFeatureRecord;
export type BackgroundRecord;
export type FeatRecord;
export type SpeciesRecord;
export type SpeciesTraitRecord;
export type ArmorRecord;
export type ShieldRecord;
export type WeaponRecord;
export type MonsterStatBlock;
export type StatBlockRecord;
export type Provenance;
export type DiceExpr;
export type DamageType;
export type Ability;

export const UnitRecordSchema;
export const CreatureStatBlockSchema;
export function decodeUnitRecordSync(raw: unknown): UnitRecord;
export function decodeUnitRecordEither(raw: unknown): Either<UnitRecord, ParseError>;
export function decodeMonsterStatBlockSync(raw: unknown): MonsterStatBlock;
export function decodeStatBlockRecordSync(raw: unknown): StatBlockRecord;
export function formatSurfaceDecodeError(error: ParseError): string;
```

`MonsterStatBlock` is the public Surface name for an authored monster Stat Block. If the underlying schema file keeps the current `CreatureStatBlockSchema` implementation name during migration, do not use that name to imply a shared PC/monster authored record; PCs finalize to Character Sheets.

Structural readers should parse authored Surface once and return narrowed types. They should not return package-specific content records.

```ts
export type SurfaceReadIssueCode =
  | "unsupportedUnitKind"
  | "missingRequiredField"
  | "unsupportedSurfaceShape"
  | "provenanceMismatch";

export type SurfaceReadIssue = {
  readonly code: SurfaceReadIssueCode;
  readonly message: string;
  readonly unitId?: UnitRecord["id"];
};

export type UnitReaderResult<T> =
  | { readonly tag: "readable"; readonly value: T }
  | {
      readonly tag: "unreadable";
      readonly issues: readonly SurfaceReadIssue[];
    };

export function readActivationPhases(
  unit: UnitRecord,
): UnitReaderResult<readonly ActivationPhase[]>;
export function readWeaponDamage(
  unit: UnitRecord,
): UnitReaderResult<readonly WeaponDamage[]>;
export function readArmorFacts(
  unit: UnitRecord,
): UnitReaderResult<ArmorAcFormula>;
export function readShieldFacts(
  unit: UnitRecord,
): UnitReaderResult<ShieldFacts>;
export function readProficiencyGrants(
  unit: UnitRecord,
): UnitReaderResult<readonly ProficiencyGrant[]>;
export function readClassCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<ClassCreationFacts>;
export function readBackgroundCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<BackgroundCreationFacts>;
export function readSpeciesCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<SpeciesCreationFacts>;
```

Phase 1 needs minimum authored class, background, and species aggregate records for Fighter, Soldier, and Orc. Do not encode those facts as character-runtime constants when they are authored SRD content with legality consequences. If the exact Surface variants do not exist yet, add the minimum `ClassRecord`, `BackgroundRecord`, and `SpeciesRecord` variants before reducer implementation.

Collection/library boundary:

```ts
export type SurfaceCollectionProvenance = {
  readonly kind: "srd-5.2.1";
};

export type SurfaceSourceId = string & Brand<"SurfaceSourceId">;
export type StatBlockId = string & Brand<"StatBlockId">;

export type SrdUnitRecord = UnitRecord & {
  readonly provenance: { readonly kind: "srd-5.2.1"; readonly section: string };
};

export type SrdUnitCollection = {
  readonly kind: "srdUnitCollection";
  readonly provenance: SurfaceCollectionProvenance;
  readonly units: readonly SrdUnitRecord[];
};

export type UnitLibrary = {
  readonly getUnit: (unitId: UnitRecord["id"]) => Option<UnitRecord>;
  readonly listUnits: () => readonly UnitRecord[];
  readonly requireUnit: (unitId: UnitRecord["id"]) => UnitRecord;
};

export type UnitLibraryBuildIssue =
  | { readonly code: "duplicateUnitId"; readonly unitId: UnitRecord["id"] }
  | {
      readonly code: "mixedProvenance";
      readonly expected: SurfaceCollectionProvenance;
      readonly actual: Provenance;
    }
  | {
      readonly code: "decodeFailed";
      readonly sourceId: SurfaceSourceId;
      readonly message: string;
    };

export function defineSrdUnitCollection(input: {
  readonly units: readonly SrdUnitRecord[];
}): SrdUnitCollection;

export function buildUnitLibrary(input: {
  readonly collections: readonly SrdUnitCollection[];
}):
  | { readonly tag: "ok"; readonly library: UnitLibrary }
  | {
      readonly tag: "invalid";
      readonly issues: readonly UnitLibraryBuildIssue[];
    };
```

Provenance helpers:

```ts
export function isSrd521Provenance(
  value: Provenance,
): value is SrdUnitRecord["provenance"];
export function assertSrd521Unit(unit: UnitRecord): SrdUnitRecord;
```

Monster/stat-block boundary:

- Phase 1 uses the selected Goblin Warrior as an authored Stat Block record from an SRD-only collection, not as a `UnitRecord`.
- `MonsterStatBlock` must remain a distinct authored monster boundary. Stat Block actions may later be projected into runtime acts, but the Stat Block collection remains monster-authored content and must not be folded into `UnitRecord`.
- A collection advertised as the SRD monster catalog must only admit SRD 5.2.1 Stat Blocks.
- 5e-tools-derived structured input can feed import/normalization, but the shipped collection's provenance is SRD 5.2.1 only.

Recommended stat-block collection API:

```ts
export type StatBlockRecord = {
  readonly id: StatBlockId;
  readonly kind: "statBlock";
  readonly name: string;
  readonly provenance: Provenance;
  readonly statBlock: MonsterStatBlock;
};

export type SrdStatBlockCollection = {
  readonly kind: "srdStatBlockCollection";
  readonly provenance: SurfaceCollectionProvenance;
  readonly statBlocks: readonly (StatBlockRecord & {
    readonly provenance: {
      readonly kind: "srd-5.2.1";
      readonly section: string;
    };
  })[];
};

export type StatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option<StatBlockRecord>;
  readonly requireStatBlock: (id: StatBlockId) => StatBlockRecord;
};

export type StatBlockCatalogBuildIssue =
  | { readonly code: "duplicateStatBlockId"; readonly statBlockId: StatBlockId }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdStatBlockCollection["kind"];
      readonly expected: SurfaceCollectionProvenance;
      readonly actual: Provenance;
      readonly statBlockId: StatBlockId;
    };

export function defineSrdStatBlockCollection(input: {
  readonly statBlocks: readonly (StatBlockRecord & {
    readonly provenance: {
      readonly kind: "srd-5.2.1";
      readonly section: string;
    };
  })[];
}): SrdStatBlockCollection;

export function buildStatBlockCatalog(input: {
  readonly collections: readonly SrdStatBlockCollection[];
}):
  | { readonly tag: "ok"; readonly catalog: StatBlockCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly StatBlockCatalogBuildIssue[];
    };
```

`buildStatBlockCatalog` is intentionally separate from `buildUnitLibrary`. Mixing Stat Blocks into Unit collections would collapse the authored monster boundary identified in `UBIQUITOUS_LANGUAGE.md` and `plans/phase0-surface-unit-availability.md`. The catalog and battle runtime consume generic `StatBlockRecord`s; `SrdStatBlockCollection` is only the first collection/provenance boundary.

## `@dnd/character-creation-runtime` API

Character creation owns durable draft/session patch and fill semantics. It does not own authored Unit schemas, battle reducer state, or executable battle semantics.

Draft/session state:

```ts
export type CreationSessionId = string & Brand<"CreationSessionId">;
export type CharacterDraftId = string & Brand<"CharacterDraftId">;

export type CharacterDraft = {
  readonly draftId: CharacterDraftId;
  readonly selections: CharacterDraftSelections;
  readonly revision: number;
};

export type CreationSession = {
  readonly sessionId: CreationSessionId;
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
};
```

The old Core `CharacterDraft` facts that still matter are primary class, ordered advancement, background, ability score generation, background ability score increase, species, languages, alignment, build choices, equipment, and spellcasting choices. The new runtime should thread or derive these facts, not copy Core's type or import Core.

For the selected Phase 1 manifest, only Fighter level-1 creation is in scope. Spellcasting choices are a restore-ledger concern, not a Phase 1 hole family. Do not expose a spellcasting draft path until a spellcasting slice exists.

Selection boundary types:

```ts
export type AbilityScoreAssignment = SixAbilityScores;

export type AbilityScoreGenerationSelection = {
  readonly method: AbilityScoreMethod;
  readonly assignedScores: AbilityScoreAssignment;
};

export type TwoAndOneBackgroundAbilityScoreIncreaseSelection = {
  readonly [PlusTwo in Ability]: {
    readonly kind: "twoAndOne";
    readonly plusTwo: PlusTwo;
    readonly plusOne: Exclude<Ability, PlusTwo>;
  };
}[Ability];

export type BackgroundAbilityScoreIncreaseSelection =
  | TwoAndOneBackgroundAbilityScoreIncreaseSelection
  | { readonly kind: "oneEach" };

export type StandardLanguage = (typeof STANDARD_LANGUAGES)[number];
export type SelectableStandardLanguage = Exclude<StandardLanguage, "Common">;
export type CharacterStartingLanguages = {
  readonly [First in SelectableStandardLanguage]: readonly [
    "Common",
    First,
    Exclude<SelectableStandardLanguage, First>,
  ];
}[SelectableStandardLanguage];

export type CharacterAlignment = {
  readonly morality: "good" | "neutral" | "evil";
  readonly order: "lawful" | "neutral" | "chaotic";
};

export type CharacterClassLevel =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20;
```

These shapes intentionally make illegal finalized states harder to represent: ability scores reuse the Surface `SixAbilityScores` domain shape, background `twoAndOne` choices require different abilities, `oneEach` means all three authored background abilities, starting languages are Common plus two distinct selectable Standard Languages, advancement entries use the SRD 1-20 class-level range, and alignment is the SRD two-axis choice from the Phase 1 manifest.

Stable creation hole ids:

```ts
export type CharacterDraftPath =
  | "draft.primaryClass"
  | "draft.advancement.initial"
  | "draft.background"
  | "draft.abilityScoreGeneration"
  | "draft.backgroundAbilityScoreIncrease"
  | "draft.species"
  | "draft.languages"
  | "draft.alignment"
  | "draft.choices"
  | "draft.equipment";

export type UnitChoiceKey = string & Brand<"UnitChoiceKey">;
export type CreationChoiceOptionId = string & Brand<"CreationChoiceOptionId">;

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit:${UnitRecord["id"]}:${UnitChoiceKey}`;

export type CreationHoleId = CreationHoleIdText & Brand<"CreationHoleId">;
```

Rules for hole ids:

- Use `cc:draft:<path>` for holes opened by missing draft structure.
- Use `cc:unit:<unitId>:<choiceKey>` for holes opened by authored Unit structure.
- `choiceKey` must be a domain key from the Unit/source reader, not an array index.
- If a domain has ordered entries, name the role rather than the current array position for phase 1, for example `draft.advancement.initial`.
- Hole ids are stable across rediscovery from the same semantic draft, but the set of holes changes after accepted fills.

Creation holes and fills:

```ts
export type CreationHole =
  | {
      readonly kind: "singleChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly min: number;
      readonly max: number;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly methods: readonly AbilityScoreMethod[];
    }
  | {
      readonly kind: "freeText";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
    };

export type CreationFill =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly optionId: CreationChoiceOptionId;
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly optionIds: readonly CreationChoiceOptionId[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly value: AbilityScoreAssignment;
    }
  | {
      readonly kind: "text";
      readonly holeId: CreationHoleId;
      readonly value: string;
    };
```

Batch fill behavior:

```ts
export type CreationFillIssue = {
  readonly tag: "illegalFill";
  readonly holeId: CreationHoleId;
  readonly fillIndex: number;
  readonly code:
    | "unknownHole"
    | "duplicateFill"
    | "wrongFillKind"
    | "invalidChoice"
    | "tooFewChoices"
    | "tooManyChoices"
    | "unsupportedChoice";
  readonly message: string;
};

export type CreationBatchIssue = {
  readonly tag: "illegalBatch";
  readonly code: "staleRevision";
  readonly message: string;
};

export type CreationIssue = CreationFillIssue | CreationBatchIssue;

export type CreationBatchFillInput = {
  readonly draft: CharacterDraft;
  readonly fills: readonly CreationFill[];
  readonly expectedRevision: number;
};

export type CreationBatchFillResult =
  | {
      readonly tag: "accepted";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly finalization: CreationFinalizationResult;
    }
  | {
      readonly tag: "rejected";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly issues: readonly CreationIssue[];
      readonly finalization: CreationFinalizationResult;
    };
```

Atomicity:

- A batch is accepted only if every fill is legal against the current hole set and `expectedRevision`.
- If any fill is illegal, the returned `draft` is unchanged and `issues` reports every rejected fill that can be diagnosed from the input.
- Duplicate fills for the same hole are illegal unless that hole kind explicitly accepts multiple values through one fill.
- Replaying the same accepted batch against the same prior draft must produce the same next draft and holes.

Finalization:

```ts
export type CharacterSheet = {
  readonly sourceDraftId: CharacterDraftId;
  readonly selections: FinalizedCharacterSelections;
  readonly unitRefs: readonly UnitRef[];
};

export type CreationFinalizationResult =
  | { readonly tag: "ready"; readonly sheet: CharacterSheet }
  | { readonly tag: "incomplete"; readonly holes: readonly CreationHole[] }
  | {
      readonly tag: "invalid";
      readonly issues: readonly CreationIssue[];
      readonly holes: readonly CreationHole[];
    };

export function createCharacterDraft(input: {
  readonly unitLibrary: UnitLibrary;
}): CharacterDraft;

export function discoverCreationHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[];

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitLibrary;
  },
): CreationBatchFillResult;

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): CreationFinalizationResult;
```

`@dnd/character-creation-runtime` does not export battle seed types. It finalizes a `CharacterSheet` that carries selected Unit references and loadout selections. The battle package owns the battle seed interface and parses the finalized sheet plus caller-supplied current HP into battle reducer facts at the composition root.

## `@dnd/battle-runtime` API

Battle owns reducer state, act discovery, replay-from-root hole resolution, combatant seed ingestion, and snapshots. It does not own durable character drafts or authored Surface schemas.

State and seed inputs:

```ts
export type CombatantId = string & Brand<"CombatantId">;
export type BattleId = string & Brand<"BattleId">;
export type CharacterId = string & Brand<"CharacterId">;
export type MonsterId = string & Brand<"MonsterId">;
export type InitiativeScore = number & Brand<"InitiativeScore">;

export type ZeroHpLifecyclePolicy = "diesAtZeroHp" | "usesDeathSavingThrows";

export type CharacterCombatantSeed = {
  readonly kind: "character";
  readonly characterId: CharacterId;
  readonly sheetUnitRefs: readonly UnitRef[];
  readonly armorClass: ArmorClassState;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly zeroHpLifecyclePolicy: "usesDeathSavingThrows";
  readonly selectedLoadout: CharacterLoadoutRef;
};

export type MonsterCombatantSeed = {
  readonly kind: "monster";
  readonly monsterId: MonsterId;
  readonly statBlock: StatBlockRecord;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly zeroHpLifecyclePolicy: "diesAtZeroHp";
};

export type CombatantSeedInput = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly seed: CharacterCombatantSeed | MonsterCombatantSeed;
};

export type BattleTurnResources = {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, CombatantState>;
  readonly currentTurnResources: BattleTurnResources;
};
```

`@dnd/battle-runtime` must not import `@dnd/character-creation-runtime`. MCP passes the finalized `CharacterSheet` through a composition-root mapper that copies only the sheet's selected Unit references into `CharacterCombatantSeed.sheetUnitRefs` and supplies current HP plus structured `ArmorClassState`. This keeps the character draft/session model out of battle state while avoiding a parallel battle seed type in character creation.

`CombatantState` may use the same reducer facts already present in Correction: HP/max HP/Temporary HP, conditions, reaction availability, actor-owned `UnitRecord[]`, structured armor facts, zero-HP lifecycle policy, death saves, spell slots, and action-resource facts. It must not carry a duplicate current Armor Class scalar if `ArmorClassState` can derive it. Battle state should use the `RuntimeActionResource` model from `@dnd/shared-algebras`, including turn-granted actions and unit-granted restricted actions; do not introduce a scalar action quota.

Battle seed data is runtime seed data only. Weapon damage dice, Damage Type, armor facts, and Shield facts must be resolved through Unit references/readers where Surface already has them, not duplicated into a new executable IR. `selectedLoadout` should use SRD-facing holding/wielding terms; do not introduce main-hand/off-hand vocabulary.

Subjects:

```ts
export type BattleSubject = {
  readonly tag: "coreAct";
  readonly actorId: CombatantId;
  readonly act: "attack" | "endTurn";
};
```

Phase 1 subjects are only `coreAct.attack` and `coreAct.endTurn`. Do not include `unit` or `monsterStatBlockAction` in the public subject union until discovery and resolution support them. Monster seed ownership is visible through `MonsterCombatantSeed` and `StatBlockCatalog`; exposing unsupported subject variants would make invalid act states representable.

Battle hole identity may reuse the branded `HoleId`/`HoleInstanceKey` values
from `@dnd/shared-algebras/runtime-hole-algebra`, but the battle public
hole/fill union must stay as narrow as the implemented battle protocol. CAM11
has no fillable battle protocol, so `BattleHole` and `BattleFill` are `never`.
Later attack/damage tasks should add only battle-owned variants that are
actually discoverable and resolvable. Do not expose Correction's
Surface/Unit/effect execution holes through `@dnd/battle-runtime`.

```ts
export type BattleHoleId = HoleId;
export type BattleHoleInstanceKey = HoleInstanceKey;
export type BattleHole = never;
export type BattleFill = never;

export type BattleResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export type BattleInvalidReasonCode =
  | "staleSubject"
  | "wrongActor"
  | "missingCombatant"
  | "invalidFill"
  | "unsupportedSubject"
  | "unsupportedSurfaceShape";

export type BattleResolutionResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "needsHoles";
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
    };
```

Battle fill accumulation:

- Fills are not durable `BattleState`.
- MCP/session storage may keep `{ subject, fills }` as user-facing in-progress act state.
- Every `resolveBattleSubject` call replays from the supplied `BattleState` root with the full accumulated fill assignment.
- A successful resolution returns the next `BattleState`; the caller clears the in-progress act for that subject.

Public reducer API:

```ts
export function startBattle(input: {
  readonly battleId: BattleId;
  readonly combatants: readonly CombatantSeedInput[];
}): BattleState;

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[];

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult;

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
}): BattleResolutionResult & { readonly tag: "resolved" | "invalid" };

export function snapshotBattle(state: BattleState): BattleSnapshot;
```

Minimum MCP snapshot:

```ts
export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly round: number;
  readonly currentActorId: CombatantId;
  readonly combatants: readonly {
    readonly combatantId: CombatantId;
    readonly displayName: string;
    readonly hp: Hp;
    readonly maxHp: Hp;
    readonly tempHp: Hp;
    readonly armorClass: ArmorClass;
    readonly defeated: boolean;
    readonly zeroHpLifecyclePolicy: ZeroHpLifecyclePolicy;
    readonly conditions: readonly Condition[];
  }[];
  readonly acts: readonly {
    readonly subject: BattleSubject;
    readonly label: string;
    readonly summary: string;
    readonly initialHoles: readonly BattleHole[];
  }[];
};
```

Events/traces:

- Defer full trace/event API until after the green MCP fixture is stable.
- Phase 1 may return a compact `resolutionLog` inside `BattleResolutionResult` for MCP display, but it must not become the authority for state.
- When traces are promoted, they should be derived from reducer resolution, not authored as a second behavior channel.

## MCP Green Path

The green path should be isolated into files with no `@dnd/core` imports. Existing Core-backed MCP tools may remain outside the green path during controlled breakage and should be listed in the Restore Ledger.

Tool sequence:

1. `create_character_draft`
   - Calls `createCharacterDraft({ unitLibrary })`.
   - Stores `CharacterDraft` by `draftId`.

2. `discover_creation_holes`
   - Calls `discoverCreationHoles({ draft, unitLibrary })`.
   - Returns hole ids, labels, choices, and the draft revision.

3. `fill_creation_holes`
   - Calls `fillCreationHoles({ draft, fills, expectedRevision, unitLibrary })`.
   - On `accepted`, stores the returned draft and returns rediscovered holes/finalization status.
   - On `rejected`, leaves stored draft unchanged and returns all fill issues.

4. `finalize_character`
   - Calls `finalizeCharacterDraft({ draft, unitLibrary })`.
   - Stores `CharacterSheet` only when result is `ready`.

5. `select_monster`
   - Reads `srd_stat_block_goblin_warrior` from the SRD Stat Block catalog.
   - Does not call Core monster catalog.
   - Produces `MonsterCombatantSeed`.

6. `start_battle`
   - Builds `CharacterCombatantSeed` from the finalized sheet, selected loadout, and caller-supplied current HP at the MCP composition root.
   - Calls `startBattle({ battleId, combatants })`.
   - Stores `BattleState`.

7. `discover_battle_acts`
   - Calls `discoverBattleActs(state)` or `snapshotBattle(state).acts`.

8. `fill_resolve_battle_holes`
   - Stores in-progress `{ subject, fills }` in MCP session state, not in `BattleState`.
   - Calls `resolveBattleSubject({ state, subject, fills })` after each fill batch.
   - On `needsHoles`, keeps accumulated fills and returns new holes.
   - On `resolved`, stores returned `BattleState` and clears accumulated fills.

9. `end_turn`
   - Calls `endTurn({ state, actorId })`.
   - CAM11 returns `unsupportedSubject` without mutating `BattleState`.
   - CAM15 stores the returned `BattleState` after implementing End Turn advancement.

MCP composition root owns:

- `srdUnitCollection`;
- `srdStatBlockCollection` / `StatBlockCatalog` for Goblin Warrior, returning generic `StatBlockRecord`s;
- session stores for drafts, sheets, selected monster, battle state, and transient battle fill accumulation.

Green-path isolation requirements:

- Put new green tools in a dedicated MCP module subtree, for example `packages/mcp/src/green/`, with no imports from existing Core-backed server modules.
- The green subtree must not import `@dnd/core` directly or indirectly. Add a package script or focused test that fails on `@dnd/core` imports under the green subtree.
- Existing Core-backed MCP tools may keep the package-level `@dnd/core` dependency during controlled breakage, but no green file may re-export from legacy MCP modules that import Core.

## RAW Traceability Checkpoints

Before implementation, the runtime slices must trace every modeled rule in the selected vertical to `plans/phase1-fighter-manifest.md` and the local SRD 5.2.1 files it cites:

- Fighter, Soldier, Orc, Standard Array, languages, alignment, and starting-equipment facts come from the manifest rows pointing to `Character-Creation.md`, `Character-Origins.md`, and `Classes/Fighter.md`.
- Chain Mail, Shield, Longsword, one-handed damage, and the selected loadout come from the manifest rows pointing to `Equipment.md` and Defense in `Feats.md`.
- Attack Roll vs Armor Class, damage application, Temporary Hit Points, and HP clamp come from the manifest rows pointing to `Playing-the-Game.md` and `Rules-Glossary.md`.
- Goblin Warrior AC, HP, Initiative, and attacks come from `Monsters/Monsters-E-G.md` through the SRD Stat Block catalog, not the Core monster catalog.
- End Turn is an explicit modeling event under `ASSUMPTIONS.md` A2.
- Zero-HP lifecycle policy follows `ASSUMPTIONS.md` A12: monsters die at 0 HP; player characters use the death-saving-throw track when applicable.

The first battle slice must not execute Longsword Sap, Savage Attacker, Orc Relentless Endurance, or Goblin Warrior attack riders unless the selected manifest and QNT slice are widened with SRD citations. Authored Units may grant those facts for sheet legality, but unsupported execution must fail at a named support gate or be absent from discovery.

## QNT Slice Ownership

`packages/character-creation-runtime/character-creation-runtime-slice.qnt` owns:

- creation draft state at the reducer protocol level;
- stable creation hole ids as semantic draft/source addresses;
- atomic batch fill acceptance/rejection;
- re-derivation of holes after accepted fills;
- legal phase-1 level-1 creation flow;
- finalization status: incomplete, invalid, ready.

It may import or mirror old `character-creation.qnt` concepts where that reduces duplication, but phase-1 authority for the new runtime package belongs to the slice. Old Core character creation remains authority only for old Core lanes until those lanes are deleted, disabled, or restored through the new runtime.

`packages/battle-runtime/battle-runtime-slice.qnt` owns:

- combatants, initiative/current actor, and end turn;
- action-resource availability for Attack and End Turn;
- Attack subject replay: target hole, attack-roll hole, damage-roll hole;
- hit/miss against AC;
- action spend;
- HP damage with Temporary HP absorption and clamp to 0;
- zero-HP lifecycle policy for the supported combatants;
- snapshot-relevant state invariants.

RAW traceability required for the battle slice:

- Attack and Attack Roll behavior must cite `.references/srd-5.2.1/Playing-the-Game.md` "Attack Rolls" and "Making Attacks", plus `.references/srd-5.2.1/Rules-Glossary.md` "Attack [Action]" and "Attack Roll".
- Armor Class comparison and armor/shield projection must cite `.references/srd-5.2.1/Playing-the-Game.md` "Armor Class" and `.references/srd-5.2.1/Rules-Glossary.md` "Armor Class".
- HP floor, Temporary Hit Points absorption, monster death, character 0-HP behavior, and Death Saving Throws must cite `.references/srd-5.2.1/Playing-the-Game.md` "Damage and Healing" and `ASSUMPTIONS.md` A12 where the phase-1 slice distinguishes Character Sheet participants from Stat Block participants.
- Initiative/current actor and End Turn behavior must cite `.references/srd-5.2.1/Playing-the-Game.md` "Combat" / "Initiative".
- If Phase 1 intentionally omits a RAW consequence that can occur in supported tests, such as Massive Damage, nonlethal melee knockout, or start-turn Death Saving Throw rolls for a Character Sheet participant at 0 HP, record the narrower modeling decision in `ASSUMPTIONS.md` before implementation.

Ubiquitous-language review requirements:

- Use "Attack", "Attack Roll", "Armor Class", "Hit Points", "Temporary Hit Points", "Death Saving Throw", "Damage Type", "Initiative", "Holding", and "Wielding" as defined in `UBIQUITOUS_LANGUAGE.md`.
- Use "Stat Block" for authored monster records. Do not rename them as Monster Units.
- Keep Correction reducer vocabulary (`act`, `subject`, `runtime hole`, `filled hole value`, `hole resolution`, `hole refilling`) when describing the reducer protocol.

Temporary authority statement:

- During Phase 1/2, `battle-runtime-slice.qnt` is authoritative for `@dnd/battle-runtime` green behavior only.
- Existing `battle.qnt` remains authoritative for old Core lanes until those lanes are disabled or deleted and entered in the Restore Ledger.
- Any behavior shared by `battle-runtime-slice.qnt` and `battle.qnt` must match or be recorded as an explicit tracked divergence.
- Before the migration is declared complete, the repo must return to one named battle authority by merging/replacing the slice and updating MBT gates.

## Questions For Owner

1. Should `@dnd/surface` be a hard package rename or a facade over `@dnd/surface` during Phase 1?
   - Recommended answer: hard rename/promote, matching `plans/phase0-surface-unit-availability.md`. The project has no external consumers, and a facade would create a second package boundary before the green runtime stabilizes. Update docs in the same migration so active docs name `@dnd/surface`.

2. Should phase-1 battle expose `resolutionLog` for MCP responses?
   - Recommended answer: yes, but as a non-authoritative display projection returned from resolution. Do not make traces/events a Phase 1 state contract.

3. Should this API draft treat the selected `phase1-fighter-manifest.md` vertical as fixed for package skeleton work?
   - Recommended answer: yes. Use the Orc Soldier Fighter with Chain Mail, Shield, Longsword, Defense Fighting Style, and Goblin Warrior Stat Block while keeping APIs generic enough for later SRD choices.

4. Should battle `monsterStatBlockAction` be in the public subject union before monster action resolution is implemented?
   - Recommended answer: no. Keep monster seed ownership visible through generic `StatBlockRecord` and `StatBlockCatalog`, but do not expose unsupported act subjects until discovery and resolution can handle them.

5. Should MCP keep transient battle fills in memory only, or persist them alongside sessions?
   - Recommended answer: store them in the MCP session state only while an act is in progress. They are user-facing interaction state, not battle reducer state.
